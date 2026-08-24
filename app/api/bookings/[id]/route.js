import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";

export async function GET(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { id } = await context.params;

    const booking = await Booking.findOne({ _id: id, customerId: session.sub })
      .populate("eventId")
      .populate("seatIds");
    if (!booking) throw new ApiError(404, "Booking not found");

    return NextResponse.json({ booking });
  } catch (err) {
    return jsonError(err);
  }
}
