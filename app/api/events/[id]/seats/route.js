import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, Seat } from "@/lib/models";
import { getSession } from "@/lib/auth";
import { jsonError, ApiError } from "@/lib/apiAuth";
import { sweepExpiredForEvent } from "@/lib/seatService";

export async function GET(request, context) {
  try {
    await connectDB();
    const { id } = await context.params;

    const event = await Event.findById(id).populate("venueId");
    if (!event) throw new ApiError(404, "Event not found");

    // Lazy expiry: correctness never depends on the cron sweep's cadence.
    await sweepExpiredForEvent(id);

    const session = await getSession();
    const seats = await Seat.find({ eventId: id }).sort({ row: 1, col: 1 });

    const shaped = seats.map((s) => ({
      id: s._id,
      row: s.row,
      col: s.col,
      label: s.label,
      category: s.category,
      // Only reveal to the seat's own holder that it's *theirs* — everyone else just sees "held".
      status: s.status,
      isMine: session ? String(s.heldBy) === String(session.sub) : false,
      holdExpiresAt: s.holdExpiresAt,
    }));

    return NextResponse.json({
      event: {
        id: event._id,
        title: event.title,
        type: event.type,
        date: event.date,
        time: event.time,
        categoryPricing: event.categoryPricing,
        venue: event.venueId
          ? { id: event.venueId._id, name: event.venueId.name, address: event.venueId.address }
          : null,
      },
      layout: event.venueId ? { rows: event.venueId.layout.rows, cols: event.venueId.layout.cols } : null,
      seats: shaped,
    });
  } catch (err) {
    return jsonError(err);
  }
}
