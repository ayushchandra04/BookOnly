import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireRole, jsonError } from "@/lib/apiAuth";

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole("organiser");
    const events = await Event.find({ organiserId: session.sub })
      .sort({ createdAt: -1 })
      .populate("venueId", "name");
    return NextResponse.json({ events });
  } catch (err) {
    return jsonError(err);
  }
}
