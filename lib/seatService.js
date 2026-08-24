import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { connectDB } from "./db.js";
import { Seat, Event, Booking, WaitlistEntry } from "./models/index.js";
import { ApiError } from "./errors.js";

export const SEAT_HOLD_TTL_MINUTES = Number(process.env.SEAT_HOLD_TTL_MINUTES ?? 10);
export const WAITLIST_OFFER_TTL_MINUTES = Number(process.env.WAITLIST_OFFER_TTL_MINUTES ?? 15);

function genBookingRef() {
  return `BK-${nanoid(10).toUpperCase()}`;
}

/**
 * Given a seat that just became free (inside an active transaction session),
 * atomically claims the oldest waiting entry for that event+category (if any)
 * and turns it into a time-limited offer. Mutates and saves `seat` either way.
 * Returns offer details for emailing after commit, or null if no one was waiting.
 */
async function tryCreateWaitlistOffer(session, seat) {
  const offerToken = nanoid(32);
  const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000);

  // Single atomic findOneAndUpdate: the (filter + sort) select the oldest
  // waiting entry, and the update claims it in the same document write, so
  // two concurrent cascades for the same event+category can't both grab it.
  const nextInLine = await WaitlistEntry.findOneAndUpdate(
    { eventId: seat.eventId, category: seat.category, status: "waiting" },
    { $set: { status: "offered", offerToken, offerSeatId: seat._id, offerExpiresAt } },
    { sort: { createdAt: 1 }, session, returnDocument: "after" }
  );

  if (!nextInLine) {
    seat.status = "available";
    seat.heldBy = null;
    seat.holdExpiresAt = null;
    seat.waitlistEntryId = null;
    await seat.save({ session });
    return null;
  }

  seat.status = "offered";
  seat.heldBy = null;
  seat.holdExpiresAt = offerExpiresAt;
  seat.waitlistEntryId = nextInLine._id;
  await seat.save({ session });

  return {
    waitlistEntryId: nextInLine._id,
    customerId: nextInLine.customerId,
    eventId: seat.eventId,
    category: seat.category,
    seatLabel: seat.label,
    offerToken,
    offerExpiresAt,
  };
}

/** Runs `fn` inside a transaction, retrying transient errors per the MongoDB driver's recommended pattern. */
async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Frees any seats whose hold/offer has expired, cascading offered seats to the
 * next waitlist entry in line. Scoped to one event; called on every seat-map
 * read and hold attempt so correctness never depends on the cron sweep timing.
 * Returns newly created waitlist offers so the caller can email them.
 */
export async function sweepExpiredForEvent(eventId) {
  await connectDB();
  const now = new Date();
  const newOffers = [];

  // Plain expired holds (nobody was waitlisted, or hold TTL only): release directly.
  await Seat.updateMany(
    { eventId, status: "held", holdExpiresAt: { $lt: now } },
    { $set: { status: "available", heldBy: null, holdExpiresAt: null } }
  );

  // Expired waitlist offers: cascade to the next person in the queue (or release).
  const expiredOffered = await Seat.find({
    eventId,
    status: "offered",
    holdExpiresAt: { $lt: now },
  });

  for (const seat of expiredOffered) {
    const offer = await runInTransaction(async (session) => {
      if (seat.waitlistEntryId) {
        await WaitlistEntry.updateOne(
          { _id: seat.waitlistEntryId, status: "offered" },
          { $set: { status: "expired" } },
          { session }
        );
      }
      return tryCreateWaitlistOffer(session, seat);
    });
    if (offer) newOffers.push(offer);
  }

  return newOffers;
}

/** Atomically holds N seats for a user, all-or-nothing. */
export async function holdSeats(eventId, seatIds, userId) {
  await connectDB();
  await sweepExpiredForEvent(eventId);

  const holdExpiresAt = new Date(Date.now() + SEAT_HOLD_TTL_MINUTES * 60 * 1000);

  const seats = await runInTransaction(async (session) => {
    const held = [];
    for (const seatId of seatIds) {
      const seat = await Seat.findOneAndUpdate(
        { _id: seatId, eventId, status: "available" },
        { $set: { status: "held", heldBy: userId, holdExpiresAt } },
        { session, returnDocument: "after" }
      );
      if (!seat) {
        throw new ApiError(409, "One or more selected seats are no longer available");
      }
      held.push(seat);
    }
    return held;
  });

  return { seats, holdExpiresAt };
}

/** Releases a single held seat back to available, if held by this user (checkout abandonment / deselect). */
export async function releaseSeat(seatId, userId) {
  await connectDB();
  await Seat.updateOne(
    { _id: seatId, heldBy: userId, status: "held" },
    { $set: { status: "available", heldBy: null, holdExpiresAt: null } }
  );
}

/** Confirms a booking from seats the user currently holds. */
export async function confirmBooking(eventId, seatIds, userId) {
  await connectDB();
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  return runInTransaction(async (session) => {
    const seats = [];
    let totalAmount = 0;
    for (const seatId of seatIds) {
      const seat = await Seat.findOneAndUpdate(
        { _id: seatId, eventId, heldBy: userId, status: "held" },
        { $set: { status: "booked" } },
        { session, returnDocument: "after" }
      );
      if (!seat) {
        throw new ApiError(409, "One or more seats are no longer held by you — your hold may have expired");
      }
      const pricing = event.categoryPricing.find((p) => p.category === seat.category);
      totalAmount += pricing ? pricing.price : 0;
      seats.push(seat);
    }

    const [booking] = await Booking.create(
      [
        {
          eventId,
          customerId: userId,
          seatIds: seats.map((s) => s._id),
          totalAmount,
          bookingRef: genBookingRef(),
          status: "confirmed",
          source: "direct",
        },
      ],
      { session }
    );

    await Seat.updateMany(
      { _id: { $in: seats.map((s) => s._id) } },
      { $set: { bookingId: booking._id, heldBy: null, holdExpiresAt: null } },
      { session }
    );

    return { booking, seats, event };
  });
}

/** Cancels a booking, frees its seats, and cascades each freed seat to the waitlist. */
export async function cancelBooking(bookingId, userId) {
  await connectDB();

  return runInTransaction(async (session) => {
    const booking = await Booking.findOne({ _id: bookingId, customerId: userId }).session(session);
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status === "cancelled") throw new ApiError(409, "Booking already cancelled");

    booking.status = "cancelled";
    await booking.save({ session });

    const seats = await Seat.find({ _id: { $in: booking.seatIds } }).session(session);
    const newOffers = [];
    for (const seat of seats) {
      seat.bookingId = null;
      const offer = await tryCreateWaitlistOffer(session, seat);
      if (offer) newOffers.push(offer);
    }

    return { booking, newOffers };
  });
}

/** Adds a customer to the waitlist for a sold-out category. */
export async function joinWaitlist(eventId, category, userId) {
  await connectDB();

  const existing = await WaitlistEntry.findOne({
    eventId,
    category,
    customerId: userId,
    status: { $in: ["waiting", "offered"] },
  });
  if (existing) throw new ApiError(409, "You are already on the waitlist for this category");

  return WaitlistEntry.create({ eventId, category, customerId: userId, status: "waiting" });
}

/** Completes a booking from an accepted, still-valid waitlist offer. */
export async function acceptWaitlistOffer(token, userId) {
  await connectDB();

  return runInTransaction(async (session) => {
    const entry = await WaitlistEntry.findOne({ offerToken: token, status: "offered" }).session(session);
    if (!entry) throw new ApiError(410, "This offer is no longer valid");
    if (String(entry.customerId) !== String(userId)) {
      throw new ApiError(403, "This offer was not made to your account");
    }
    if (entry.offerExpiresAt < new Date()) {
      throw new ApiError(410, "This offer has expired");
    }

    const seat = await Seat.findOneAndUpdate(
      { _id: entry.offerSeatId, status: "offered", waitlistEntryId: entry._id },
      { $set: { status: "booked" } },
      { session, returnDocument: "after" }
    );
    if (!seat) throw new ApiError(410, "This offer is no longer valid");

    const event = await Event.findById(entry.eventId).session(session);
    const pricing = event.categoryPricing.find((p) => p.category === seat.category);
    const totalAmount = pricing ? pricing.price : 0;

    const [booking] = await Booking.create(
      [
        {
          eventId: entry.eventId,
          customerId: userId,
          seatIds: [seat._id],
          totalAmount,
          bookingRef: genBookingRef(),
          status: "confirmed",
          source: "waitlist",
        },
      ],
      { session }
    );

    seat.bookingId = booking._id;
    seat.waitlistEntryId = null;
    seat.holdExpiresAt = null;
    await seat.save({ session });

    entry.status = "booked";
    await entry.save({ session });

    return { booking, seat, event };
  });
}

/** Global sweep across all events with expired holds/offers — driven by the cron route. */
export async function sweepExpiredAll() {
  await connectDB();
  const now = new Date();

  const eventIds = await Seat.distinct("eventId", {
    $or: [
      { status: "held", holdExpiresAt: { $lt: now } },
      { status: "offered", holdExpiresAt: { $lt: now } },
    ],
  });

  const allNewOffers = [];
  for (const eventId of eventIds) {
    const offers = await sweepExpiredForEvent(eventId);
    allNewOffers.push(...offers);
  }
  return { eventsSwept: eventIds.length, newOffers: allNewOffers };
}
