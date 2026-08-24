import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Venue } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";

export async function GET() {
  try {
    await connectDB();
    await requireRole("admin", "organiser");
    const venues = await Venue.find().sort({ createdAt: -1 });
    return NextResponse.json({ venues });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const session = await requireRole("admin");
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const address = String(body.address ?? "").trim();
    const categories = Array.isArray(body.categories) ? body.categories.map(String) : [];
    const rows = Number(body.layout?.rows);
    const cols = Number(body.layout?.cols);
    const seats = Array.isArray(body.layout?.seats) ? body.layout.seats : [];

    if (!name || !address) throw new ApiError(400, "name and address are required");
    if (categories.length === 0) throw new ApiError(400, "At least one seat category is required");
    if (!rows || !cols || seats.length === 0) {
      throw new ApiError(400, "layout.rows, layout.cols, and layout.seats are required");
    }
    for (const s of seats) {
      if (!categories.includes(s.category)) {
        throw new ApiError(400, `Seat ${s.label} has category "${s.category}" not in venue categories`);
      }
    }

    const venue = await Venue.create({
      name,
      address,
      createdBy: session.sub,
      categories,
      layout: { rows, cols, seats },
    });

    return NextResponse.json({ venue }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
