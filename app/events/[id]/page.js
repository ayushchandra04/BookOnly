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
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="mb-6 inline-block text-[11px] font-bold uppercase tracking-[0.12em] muted transition hover:text-[var(--brand)]"
      >
        &larr; All events
      </Link>

      {/* Poster beside the facts, rather than text stacked on a darkened hero */}
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <div>
          <div
            className="relative aspect-[3/4] overflow-hidden border-2"
            style={{
              borderColor: "var(--foreground)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-hard)",
            }}
          >
            <EventPoster title={event.title} posterUrl={event.posterUrl} type={event.type} eager />
          </div>

          <Link
            href={`/events/${event._id}/seats`}
            className="btn-primary mt-5 w-full !py-3.5"
          >
            Select seats &rarr;
          </Link>
        </div>

        <div className="min-w-0">
          <span className="badge">{event.type}</span>

          <h1 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
            {event.title}
          </h1>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] muted">
            {event.date} &middot; {event.time} &middot; {event.venueId?.name}
          </p>

          {event.description && (
            <p className="mt-6 max-w-prose leading-relaxed muted">{event.description}</p>
          )}

          {/* Details as a ruled table — closer to a printed listing than a card */}
          <dl
            className="mt-8 border-t-2"
            style={{ borderColor: "var(--foreground)" }}
          >
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

          <h2 className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--brand)" }}>
            Pricing
          </h2>
          <ul className="mt-3 border-t-2" style={{ borderColor: "var(--foreground)" }}>
            {event.categoryPricing.map((cp) => (
              <li
                key={cp.category}
                className="flex items-center justify-between border-b py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-xs font-bold uppercase tracking-[0.1em]">{cp.category}</span>
                <span className="font-display text-lg font-bold">{formatPrice(cp.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      className="grid grid-cols-[90px_1fr] gap-4 border-b py-3 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <dt className="field-label pt-0.5">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
