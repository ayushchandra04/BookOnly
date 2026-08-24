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
    <div className="mx-auto max-w-4xl">
      <div
        className="mb-7 flex items-end justify-between gap-4 border-b-2 pb-3"
        style={{ borderColor: "var(--foreground)" }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--brand)" }}>
            Your tickets
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">My bookings</h1>
        </div>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] muted">
          {String(bookings.length).padStart(2, "0")}{" "}
          {bookings.length === 1 ? "ticket" : "tickets"}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div
          className="border-2 border-dashed py-20 text-center"
          style={{ borderColor: "var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          <p className="font-display text-lg font-bold">Nothing booked yet</p>
          <p className="mt-2 text-sm muted">
            <Link href="/" className="font-bold underline" style={{ color: "var(--brand)" }}>
              Browse events
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => (
            <Link
              key={b._id}
              href={`/bookings/${b._id}`}
              className="group flex items-stretch overflow-hidden border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-[var(--foreground)]"
              style={{
                borderColor: "var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
              }}
            >
              <div className="w-16 shrink-0 sm:w-20">
                {b.eventId && (
                  <EventPoster
                    title={b.eventId.title}
                    posterUrl={b.eventId.posterUrl}
                    type={b.eventId.type}
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                <p className="font-display text-base font-bold leading-snug">
                  {b.eventId?.title ?? "Event"}
                </p>
                <p className="mt-1 text-xs muted">
                  {b.eventId?.date} &middot; {b.eventId?.time}
                </p>
                <p className="mt-2 text-xs">
                  <span className="field-label">Seats </span>
                  <span className="font-semibold">{b.seatIds.map((s) => s.label).join(", ")}</span>
                </p>
              </div>

              {/* Ref + status live on a perforated stub, like a real tear-off */}
              <div
                className="flex w-28 shrink-0 flex-col items-center justify-center gap-2 border-l-2 border-dashed p-3 text-center sm:w-36"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className={`badge ${b.status === "confirmed" ? "badge-accent" : ""}`}
                >
                  {b.status}
                </span>
                <span className="font-mono text-[10px] leading-tight muted">{b.bookingRef}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
