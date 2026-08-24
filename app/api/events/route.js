import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, Venue, Seat } from "@/lib/models";
import { requireRole, jsonError, ApiError } from "@/lib/apiAuth";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const date = searchParams.get("date");
    const q = searchParams.get("q");

    const filter = { status: "scheduled" };
    if (type === "movie" || type === "concert") filter.type = type;
    if (date) filter.date = date;
    if (q) filter.title = { $regex: q, $options: "i" };

    const events = await Event.find(filter).sort({ date: 1, time: 1 }).populate("venueId", "name address");
    return NextResponse.json({ events });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const session = await requireRole("organiser");
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const posterUrl = String(body.posterUrl ?? "").trim();
    const type = body.type;
    const venueId = body.venueId;
    const date = String(body.date ?? "").trim();
    const time = String(body.time ?? "").trim();
    const categoryPricing = Array.isArray(body.categoryPricing) ? body.categoryPricing : [];

    if (!title || !venueId || !date || !time) {
      throw new ApiError(400, "title, venueId, date, and time are required");
    }
    if (type !== "movie" && type !== "concert") {
      throw new ApiError(400, "type must be 'movie' or 'concert'");
    }
    if (categoryPricing.length === 0) throw new ApiError(400, "categoryPricing is required");
    // Only allow https image URLs — an http/javascript:/data: URL here would end up
    // in an <img src> rendered for every visitor.
    if (posterUrl && !/^https:\/\//i.test(posterUrl)) {
      throw new ApiError(400, "posterUrl must start with https://");
    }

    const venue = await Venue.findById(venueId);
    if (!venue) throw new ApiError(404, "Venue not found");

    for (const cp of categoryPricing) {
      if (!venue.categories.includes(cp.category)) {
        throw new ApiError(400, `"${cp.category}" is not a category of this venue`);
      }
    }

    const event = await Event.create({
      title,
      description,
      posterUrl,
      type,
      organiserId: session.sub,
      venueId,
      date,
      time,
      categoryPricing,
      status: "scheduled",
    });

    // Instantiate one Seat document per template seat, independent per event —
    // booking one show never affects seat availability on another show at the same venue.
    const seatDocs = venue.layout.seats.map((s) => ({
      eventId: event._id,
      row: s.row,
      col: s.col,
      label: s.label,
      category: s.category,
      status: "available",
    }));
    await Seat.insertMany(seatDocs);

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
