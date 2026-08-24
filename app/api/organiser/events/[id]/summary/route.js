import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, Booking, Seat } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";

export async function GET(request, context) {
  try {
    await connectDB();
    const session = await requireRole("organiser");
    const { id } = await context.params;

    const event = await Event.findById(id);
    if (!event) throw new ApiError(404, "Event not found");
    if (String(event.organiserId) !== String(session.sub)) {
      throw new ApiError(403, "You do not own this event");
    }

    const [bookings, seatCounts] = await Promise.all([
      Booking.find({ eventId: id, status: "confirmed" }).populate("seatIds"),
      Seat.aggregate([
        { $match: { eventId: event._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const seatsSold = bookings.reduce((sum, b) => sum + b.seatIds.length, 0);

    const byCategory = {};
    for (const b of bookings) {
      for (const s of b.seatIds) {
        byCategory[s.category] = byCategory[s.category] ?? { seatsSold: 0, revenue: 0 };
        byCategory[s.category].seatsSold += 1;
        const pricing = event.categoryPricing.find((p) => p.category === s.category);
        byCategory[s.category].revenue += pricing ? pricing.price : 0;
      }
    }

    const statusCounts = Object.fromEntries(seatCounts.map((c) => [c._id, c.count]));

    return NextResponse.json({
      event: { id: event._id, title: event.title, date: event.date, time: event.time },
      totalBookings: bookings.length,
      seatsSold,
      revenue,
      byCategory,
      seatStatusCounts: statusCounts,
    });
  } catch (err) {
    return jsonError(err);
  }
}
