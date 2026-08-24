import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { requireRole, jsonError } from "@/lib/apiAuth";
import { cancelBooking } from "@/lib/seatService";
import { sendWaitlistOfferEmail } from "@/lib/email";

export async function POST(request, context) {
  try {
    await connectDB();
    const session = await requireRole("customer");
    const { id } = await context.params;

    const { booking, newOffers } = await cancelBooking(id, session.sub);

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
        console.error("[cancel] failed to send waitlist offer email:", err);
      }
    }

    return NextResponse.json({ booking });
  } catch (err) {
    return jsonError(err);
  }
}
