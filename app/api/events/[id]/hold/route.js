import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";
import { holdSeats, releaseSeat } from "@/lib/seatService";

export async function POST(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { id } = await context.params;
    const body = await request.json();

    const seatIds = Array.isArray(body.seatIds) ? body.seatIds : [];
    if (seatIds.length === 0) throw new ApiError(400, "seatIds is required");
    if (seatIds.length > 8) throw new ApiError(400, "Cannot hold more than 8 seats at once");

    const { seats, holdExpiresAt } = await holdSeats(id, seatIds, session.sub);

    return NextResponse.json({
      seats: seats.map((s) => ({ id: s._id, label: s.label, category: s.category, status: s.status })),
      holdExpiresAt,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    await context.params; // event id not needed for release, but keep route shape consistent
    const body = await request.json();

    const seatId = body.seatId;
    if (!seatId) throw new ApiError(400, "seatId is required");

    await releaseSeat(seatId, session.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
