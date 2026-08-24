// Self-contained correctness check for the concurrency-critical paths:
// simultaneous seat holds, booking, cancellation -> waitlist offer, and
// offer-expiry -> cascade to the next person in line. Spins up an ephemeral
// MongoDB replica set (via mongodb-memory-server) so it needs no external
// database and no .env — safe to run anywhere, including CI.
//
// Usage: npm run verify
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { User, Venue, Event, Seat, WaitlistEntry } from "../lib/models/index.js";
import { holdSeats, confirmBooking, cancelBooking, joinWaitlist, sweepExpiredForEvent } from "../lib/seatService.js";
import { connectDB } from "../lib/db.js";

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`✗ FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

async function main() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replSet.getUri("test");
  await connectDB();

  const [alice, bob, carol] = await User.create([
    { name: "Alice", email: "alice@test.com", passwordHash: "x", role: "customer" },
    { name: "Bob", email: "bob@test.com", passwordHash: "x", role: "customer" },
    { name: "Carol", email: "carol@test.com", passwordHash: "x", role: "customer" },
  ]);
  const organiser = await User.create({ name: "Org", email: "org@test.com", passwordHash: "x", role: "organiser" });

  const venue = await Venue.create({
    name: "Test Hall",
    address: "1 Main St",
    createdBy: organiser._id,
    categories: ["Standard"],
    layout: {
      rows: 1,
      cols: 3,
      seats: [
        { row: 1, col: 1, label: "A1", category: "Standard" },
        { row: 1, col: 2, label: "A2", category: "Standard" },
        { row: 1, col: 3, label: "A3", category: "Standard" },
      ],
    },
  });

  const event = await Event.create({
    title: "Test Event",
    type: "movie",
    organiserId: organiser._id,
    venueId: venue._id,
    date: "2026-01-01",
    time: "18:00",
    categoryPricing: [{ category: "Standard", price: 10 }],
  });

  const seatDocs = venue.layout.seats.map((s) => ({ eventId: event._id, ...s.toObject?.() ?? s, status: "available" }));
  const seats = await Seat.insertMany(seatDocs);
  const [seatA1, seatA2, seatA3] = seats;

  // 1) Concurrency: 10 simultaneous hold attempts for the same seat -> exactly 1 wins.
  const attempts = Array.from({ length: 10 }, (_, i) =>
    holdSeats(event._id, [seatA1._id], new mongoose.Types.ObjectId()).then(
      () => "ok",
      (err) => `fail: ${err.message}`
    )
  );
  const results = await Promise.all(attempts);
  const wins = results.filter((r) => r === "ok").length;
  if (wins !== 1) console.error("  attempt results:", results);
  assert(wins === 1, `exactly one of 10 concurrent holds on the same seat succeeds (got ${wins})`);

  // reset seat A1 for the rest of the test
  await Seat.updateOne({ _id: seatA1._id }, { $set: { status: "available", heldBy: null, holdExpiresAt: null } });

  // 2) Multi-seat hold is all-or-nothing.
  await Seat.updateOne({ _id: seatA2._id }, { $set: { status: "booked" } }); // pretend already taken
  let multiHoldFailed = false;
  try {
    await holdSeats(event._id, [seatA1._id, seatA2._id], alice._id);
  } catch {
    multiHoldFailed = true;
  }
  assert(multiHoldFailed, "multi-seat hold aborts entirely if any seat in the batch is unavailable");
  const a1AfterAbort = await Seat.findById(seatA1._id);
  assert(a1AfterAbort.status === "available", "seat that *was* available stays available after an aborted multi-hold (no partial hold)");
  await Seat.updateOne({ _id: seatA2._id }, { $set: { status: "available" } }); // undo pretend-taken

  // 3) Book seat A1 as Alice, Bob waitlists for Standard, cancel -> Bob gets an offer.
  const { seats: heldForAlice } = await holdSeats(event._id, [seatA1._id], alice._id);
  assert(heldForAlice.length === 1, "Alice holds seat A1");
  const { booking } = await confirmBooking(event._id, [seatA1._id], alice._id);
  assert(booking.status === "confirmed", "Alice's booking confirms");

  await joinWaitlist(event._id, "Standard", bob._id);
  await joinWaitlist(event._id, "Standard", carol._id);

  const { newOffers } = await cancelBooking(booking._id, alice._id);
  assert(newOffers.length === 1 && String(newOffers[0].customerId) === String(bob._id), "cancelling Alice's booking offers the freed seat to Bob (oldest waiter), not Carol");

  const bobEntry = await WaitlistEntry.findOne({ eventId: event._id, customerId: bob._id });
  assert(bobEntry.status === "offered", "Bob's waitlist entry is now 'offered'");
  const seatAfterCancel = await Seat.findById(seatA1._id);
  assert(seatAfterCancel.status === "offered" && String(seatAfterCancel.waitlistEntryId) === String(bobEntry._id), "seat A1 status is 'offered' and linked to Bob's entry");

  // 4) Offer expiry cascades to Carol.
  await WaitlistEntry.updateOne({ _id: bobEntry._id }, { $set: { offerExpiresAt: new Date(Date.now() - 1000) } });
  await Seat.updateOne({ _id: seatA1._id }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
  const cascadeOffers = await sweepExpiredForEvent(event._id);
  assert(cascadeOffers.length === 1 && String(cascadeOffers[0].customerId) === String(carol._id), "sweep cascades Bob's expired offer to Carol");

  const bobEntryAfter = await WaitlistEntry.findById(bobEntry._id);
  assert(bobEntryAfter.status === "expired", "Bob's entry is now 'expired'");
  const carolEntry = await WaitlistEntry.findOne({ eventId: event._id, customerId: carol._id });
  assert(carolEntry.status === "offered", "Carol's entry is now 'offered'");

  await mongoose.disconnect();
  await replSet.stop();

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
