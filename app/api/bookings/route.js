import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking, Event } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";
import { confirmBooking } from "@/lib/seatService";
import { generateQrBuffer } from "@/lib/qrcode";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const bookings = await Booking.find({ customerId: session.sub })
      .sort({ createdAt: -1 })
      .populate("eventId")
      .populate("seatIds");
    return NextResponse.json({ bookings });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const body = await request.json();

    const eventId = body.eventId;
    const seatIds = Array.isArray(body.seatIds) ? body.seatIds : [];
    if (!eventId || seatIds.length === 0) throw new ApiError(400, "eventId and seatIds are required");

    const { booking, seats, event } = await confirmBooking(eventId, seatIds, session.sub);

    const qrPngBuffer = await generateQrBuffer(booking.bookingRef);
    const venue = await Event.populate(event, { path: "venueId", select: "name" });

    try {
      await sendBookingConfirmationEmail({
        to: session.email,
        customerName: session.name,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        venueName: venue.venueId?.name ?? "",
        seatLabels: seats.map((s) => s.label),
        totalAmount: booking.totalAmount,
        bookingRef: booking.bookingRef,
        qrPngBuffer,
      });
    } catch (err) {
      // Booking is already committed — a failed email shouldn't undo it, just log.
      console.error("[booking] failed to send confirmation email:", err);
    }

    return NextResponse.json({ booking, seats }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
