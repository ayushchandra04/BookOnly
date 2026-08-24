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
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--brand)" }}>
        {bookings.length} {bookings.length === 1 ? "ticket" : "tickets"}
      </p>
      <h1 className="mt-3 text-5xl leading-[0.92] sm:text-6xl">My tickets</h1>
      <div className="rule my-8" />

      {bookings.length === 0 ? (
        <div
          className="py-24 text-center"
          style={{ borderRadius: "var(--radius)", border: "1px dashed var(--border-strong)" }}
        >
          <p className="font-display text-xl">No tickets yet</p>
          <p className="mt-2 text-sm muted">
            <Link href="/" className="font-semibold" style={{ color: "var(--brand)" }}>
              Browse what&apos;s on
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {bookings.map((b) => (
            <li key={b._id}>
              <Link
                href={`/bookings/${b._id}`}
                className="card card-hover flex h-full items-center gap-4 !p-4"
              >
                <div
                  className="h-20 w-14 shrink-0 overflow-hidden"
                  style={{ borderRadius: "8px" }}
                >
                  {b.eventId && (
                    <EventPoster
                      title={b.eventId.title}
                      posterUrl={b.eventId.posterUrl}
                      type={b.eventId.type}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base leading-tight">
                    {b.eventId?.title ?? "Event"}
                  </p>
                  <p className="mt-1.5 truncate text-xs muted">
                    {b.eventId?.date} &middot; {b.eventId?.time}
                  </p>
                  <p className="mt-1 truncate text-xs">
                    <span className="muted">Seats </span>
                    <span className="font-semibold">{b.seatIds.map((s) => s.label).join(", ")}</span>
                  </p>
                  <p className="mt-2 font-mono text-[10px] muted">{b.bookingRef}</p>
                </div>

                <span className={`badge shrink-0 ${b.status === "confirmed" ? "" : "badge-accent"}`}>
                  {b.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
