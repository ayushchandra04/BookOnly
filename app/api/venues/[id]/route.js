import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Venue, Event } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";

export async function GET(request, context) {
  try {
    await connectDB();
    await requireRole("admin", "organiser");
    const { id } = await context.params;
    const venue = await Venue.findById(id);
    if (!venue) throw new ApiError(404, "Venue not found");
    return NextResponse.json({ venue });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, context) {
  try {
    await connectDB();
    await requireRole("admin");
    const { id } = await context.params;

    const inUse = await Event.exists({ venueId: id });
    if (inUse) throw new ApiError(409, "Cannot delete a venue that has events scheduled at it");

    const deleted = await Venue.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, "Venue not found");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
