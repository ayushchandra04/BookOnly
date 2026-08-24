import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import EventPoster from "@/components/EventPoster";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }) {
  const { id } = await params;

  await connectDB();
  const event = await Event.findById(id).populate("venueId").lean().catch(() => null);
  if (!event) notFound();

  return (
    <div>
      <Link
        href="/"
        className="mb-8 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] muted transition hover:text-[var(--brand)]"
      >
        &larr; Now showing
      </Link>

      {/* Full-bleed banner with the title sitting on the artwork's fade */}
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)" }}
      >
        <div className="relative h-56 sm:h-72">
          <EventPoster title={event.title} posterUrl={event.posterUrl} type={event.type} eager />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, var(--background) 4%, rgba(10,10,12,0.55) 55%, rgba(10,10,12,0.2) 100%)",
            }}
          />
        </div>

        <div className="relative -mt-16 px-6 pb-7 sm:px-10">
          <span className="badge">{event.type}</span>
          <h1 className="mt-4 text-4xl leading-[0.95] sm:text-6xl">{event.title}</h1>
          <p className="mt-3 text-sm muted">
            {event.date} &middot; {event.time} &middot; {event.venueId?.name}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {event.description && (
            <p className="max-w-prose text-[15px] leading-relaxed muted">{event.description}</p>
          )}

          <p className="mt-10 mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] muted">
            Details
          </p>
          <div className="rule mb-4" />

          <dl>
            <Row label="Date" value={event.date} />
            <Row label="Time" value={event.time} />
            <Row
              label="Venue"
              value={
                <>
                  <span className="font-semibold">{event.venueId?.name}</span>
                  <br />
                  <span className="muted">{event.venueId?.address}</span>
                </>
              }
            />
          </dl>
        </div>

        {/* Pricing and the CTA travel together in a sticky rail */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] muted">Tickets</p>
            <ul className="mt-4">
              {event.categoryPricing.map((cp) => (
                <li
                  key={cp.category}
                  className="flex items-center justify-between border-b py-3 last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-sm font-medium">{cp.category}</span>
                  <span className="font-display text-xl" style={{ color: "var(--brand)" }}>
                    {formatPrice(cp.price)}
                  </span>
                </li>
              ))}
            </ul>

            <Link href={`/events/${event._id}/seats`} className="btn-primary mt-5 w-full">
              Select seats &rarr;
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      className="grid grid-cols-[100px_1fr] gap-4 border-b py-3.5 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <dt className="field-label pt-0.5">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
