import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function OrganiserEventsPage() {
  const session = await getSession();
  if (!session || session.role !== "organiser") redirect("/login?redirect=/organiser/events");

  await connectDB();
  const events = await Event.find({ organiserId: session.sub })
    .sort({ createdAt: -1 })
    .populate("venueId", "name")
    .lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My events</h1>
        <Link href="/organiser/events/new" className="btn-primary">
          + New event
        </Link>
      </div>

      {events.length === 0 && (
        <div className="card py-12 text-center">
          <p className="muted">No events yet — create your first one.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((ev) => (
          <Link key={ev._id} href={`/organiser/events/${ev._id}/summary`} className="card card-hover flex items-center justify-between">
            <div>
              <p className="font-semibold">{ev.title}</p>
              <p className="text-sm muted">
                {ev.date} · {ev.time} · {ev.venueId?.name}
              </p>
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--brand)" }}>
              Summary →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
