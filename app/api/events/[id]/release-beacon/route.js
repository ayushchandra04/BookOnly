import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRole, jsonError } from "@/lib/apiAuth";
import { releaseSeat } from "@/lib/seatService";

// Hit via navigator.sendBeacon on page unload/navigation so held seats are
// released promptly on checkout abandonment rather than waiting out the full TTL.
// sendBeacon only supports POST, so this mirrors the hold DELETE endpoint.
export async function POST(request) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const body = await request.json().catch(() => ({}));
    const seatIds = Array.isArray(body.seatIds) ? body.seatIds : [];

    await Promise.all(seatIds.map((seatId) => releaseSeat(seatId, session.sub)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
