import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { WaitlistEntry } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";
import { joinWaitlist } from "@/lib/seatService";

export async function GET(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { id } = await context.params;

    const entries = await WaitlistEntry.find({ eventId: id, customerId: session.sub }).sort({
      createdAt: -1,
    });
    return NextResponse.json({ entries });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { id } = await context.params;
    const body = await request.json();

    const category = String(body.category ?? "");
    if (!category) throw new ApiError(400, "category is required");

    const entry = await joinWaitlist(id, category, session.sub);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
