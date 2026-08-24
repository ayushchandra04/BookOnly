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
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-6 overflow-hidden rounded-3xl" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="relative h-64 sm:h-80">
          <EventPoster title={event.title} posterUrl={event.posterUrl} type={event.type} eager />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(8,8,14,0.95) 0%, rgba(8,8,14,0.6) 40%, rgba(8,8,14,0.15) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {event.type}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-white drop-shadow sm:text-4xl">{event.title}</h1>
            <p className="mt-1.5 text-sm text-white/75">
              {event.date} · {event.time} · {event.venueId?.name}
            </p>
          </div>
        </div>
      </div>

      {event.description && <p className="mb-6 leading-relaxed muted">{event.description}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="grid grid-cols-[70px_1fr] gap-y-3 text-sm">
            <dt className="field-label">Date</dt>
            <dd className="font-medium">{event.date}</dd>
            <dt className="field-label">Time</dt>
            <dd className="font-medium">{event.time}</dd>
            <dt className="field-label">Venue</dt>
            <dd>
              <span className="font-medium">{event.venueId?.name}</span>
              <br />
              <span className="muted">{event.venueId?.address}</span>
            </dd>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Pricing</h2>
          <ul className="text-sm">
            {event.categoryPricing.map((cp) => (
              <li
                key={cp.category}
                className="flex items-center justify-between border-b py-2 last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="badge">{cp.category}</span>
                <span className="font-semibold">{formatPrice(cp.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link href={`/events/${event._id}/seats`} className="btn-primary mt-6 w-full !py-3 sm:w-auto sm:!px-8">
        Select seats →
      </Link>
    </div>
  );
}
