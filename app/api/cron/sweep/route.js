import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { sweepExpiredAll } from "@/lib/seatService";
import { sendWaitlistOfferEmail } from "@/lib/email";

// Releases expired seat holds and cascades expired waitlist offers to the next
// person in line. Correctness doesn't depend on this running promptly (every
// read/write path also does a scoped lazy-expiry sweep) — but this is what
// drives the cascade for events nobody is actively viewing. Wire it up to
// Vercel Cron (see vercel.json) in production, or node-cron locally (scripts/cron.js).
export async function GET(request) {
  return runSweep(request);
}
export async function POST(request) {
  return runSweep(request);
}

async function runSweep(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await connectDB();
  const { eventsSwept, newOffers } = await sweepExpiredAll();

  for (const offer of newOffers) {
    try {
      const [event, customer] = await Promise.all([
        Event.findById(offer.eventId),
        User.findById(offer.customerId),
      ]);
      if (!event || !customer) continue;

      const acceptUrl = `${process.env.APP_BASE_URL ?? ""}/waitlist/accept/${offer.offerToken}`;
      await sendWaitlistOfferEmail({
        to: customer.email,
        customerName: customer.name,
        eventTitle: event.title,
        category: offer.category,
        seatLabel: offer.seatLabel,
        acceptUrl,
        expiresInMinutes: Math.round((offer.offerExpiresAt - Date.now()) / 60000),
      });
    } catch (err) {
      console.error("[cron sweep] failed to send waitlist offer email:", err);
    }
  }

  return NextResponse.json({ eventsSwept, offersCreated: newOffers.length });
}
