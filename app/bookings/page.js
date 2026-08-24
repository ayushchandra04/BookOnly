import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import EventPoster from "@/components/EventPoster";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/bookings");

  await connectDB();
  const bookings = await Booking.find({ customerId: session.sub })
    .sort({ createdAt: -1 })
    .populate("eventId")
    .populate("seatIds")
    .lean();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My bookings</h1>

      {bookings.length === 0 && (
        <div className="card py-12 text-center">
          <p className="muted">
            No bookings yet.{" "}
            <Link href="/" className="font-medium" style={{ color: "var(--brand)" }}>
              Browse events
            </Link>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <Link key={b._id} href={`/bookings/${b._id}`} className="card card-hover flex items-center gap-4">
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
              {b.eventId && (
                <EventPoster
                  title={b.eventId.title}
                  posterUrl={b.eventId.posterUrl}
                  type={b.eventId.type}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.eventId?.title ?? "Event"}</p>
              <p className="text-sm muted">
                {b.eventId?.date} · {b.eventId?.time} · {b.seatIds.map((s) => s.label).join(", ")}
              </p>
              <p className="mt-1 font-mono text-xs muted">Ref: {b.bookingRef}</p>
            </div>
            <span className={`badge shrink-0 ${b.status === "confirmed" ? "badge-accent" : ""}`}>{b.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
