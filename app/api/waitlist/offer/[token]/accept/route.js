import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, Seat, WaitlistEntry } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";
import { acceptWaitlistOffer } from "@/lib/seatService";
import { generateQrBuffer } from "@/lib/qrcode";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function GET(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { token } = await context.params;

    const entry = await WaitlistEntry.findOne({ offerToken: token });
    if (!entry) throw new ApiError(404, "Offer not found");
    if (String(entry.customerId) !== String(session.sub)) {
      throw new ApiError(403, "This offer was not made to your account");
    }

    const [event, seat] = await Promise.all([
      Event.findById(entry.eventId).populate("venueId", "name"),
      entry.offerSeatId ? Seat.findById(entry.offerSeatId) : null,
    ]);

    return NextResponse.json({
      status: entry.status,
      expired: entry.status !== "offered" || entry.offerExpiresAt < new Date(),
      offerExpiresAt: entry.offerExpiresAt,
      category: entry.category,
      seatLabel: seat?.label ?? null,
      event: event ? { title: event.title, date: event.date, time: event.time, venueName: event.venueId?.name } : null,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { token } = await context.params;

    const { booking, seat, event } = await acceptWaitlistOffer(token, session.sub);

    try {
      const qrPngBuffer = await generateQrBuffer(booking.bookingRef);
      const venue = await Event.populate(event, { path: "venueId", select: "name" });
      await sendBookingConfirmationEmail({
        to: session.email,
        customerName: session.name,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        venueName: venue.venueId?.name ?? "",
        seatLabels: [seat.label],
        totalAmount: booking.totalAmount,
        bookingRef: booking.bookingRef,
        qrPngBuffer,
      });
    } catch (err) {
      console.error("[waitlist accept] failed to send confirmation email:", err);
    }

    return NextResponse.json({ booking, seat });
  } catch (err) {
    return jsonError(err);
  }
}
