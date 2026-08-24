import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Event, Booking } from "@/lib/models";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function EventSummaryPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "organiser") redirect(`/login?redirect=/organiser/events/${id}/summary`);

  await connectDB();
  const event = await Event.findById(id).lean().catch(() => null);
  if (!event || String(event.organiserId) !== String(session.sub)) notFound();

  const bookings = await Booking.find({ eventId: id, status: "confirmed" }).populate("seatIds").lean();
  const revenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const seatsSold = bookings.reduce((sum, b) => sum + b.seatIds.length, 0);

  const byCategory = {};
  for (const b of bookings) {
    for (const s of b.seatIds) {
      byCategory[s.category] ??= { seatsSold: 0, revenue: 0 };
      byCategory[s.category].seatsSold += 1;
      const pricing = event.categoryPricing.find((p) => p.category === s.category);
      byCategory[s.category].revenue += pricing ? pricing.price : 0;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{event.title}</h1>
      <p className="mt-1 text-sm muted">
        {event.date} · {event.time}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Bookings" value={bookings.length} />
        <Stat label="Seats sold" value={seatsSold} />
        <Stat label="Revenue" value={formatPrice(revenue)} accent />
      </div>

      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">By category</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left muted">
              <th className="pb-2 font-normal">Category</th>
              <th className="pb-2 font-normal">Seats sold</th>
              <th className="pb-2 font-normal">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCategory).map(([cat, stats]) => (
              <tr key={cat} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2.5"><span className="badge">{cat}</span></td>
                <td className="py-2.5">{stats.seatsSold}</td>
                <td className="py-2.5 font-medium">{formatPrice(stats.revenue)}</td>
              </tr>
            ))}
            {Object.keys(byCategory).length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center muted">
                  No bookings yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold" style={accent ? { color: "var(--brand)" } : undefined}>{value}</p>
      <p className="text-xs muted">{label}</p>
    </div>
  );
}
