import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { jsonError, ApiError } from "@/lib/apiAuth";

export async function GET(request, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const event = await Event.findById(id).populate("venueId");
    if (!event) throw new ApiError(404, "Event not found");
    return NextResponse.json({ event });
  } catch (err) {
    return jsonError(err);
  }
}
