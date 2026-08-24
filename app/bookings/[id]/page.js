import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import { generateQrDataUrl } from "@/lib/qrcode";
import { formatPrice } from "@/lib/currency";
import CancelBookingButton from "@/components/CancelBookingButton";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/bookings/${id}`);

  await connectDB();
  const booking = await Booking.findOne({ _id: id, customerId: session.sub })
    .populate("eventId")
    .populate("seatIds")
    .lean()
    .catch(() => null);
  if (!booking) notFound();

  const qrDataUrl = booking.status === "confirmed" ? await generateQrDataUrl(booking.bookingRef) : null;
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/bookings"
        className="mb-8 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] muted transition hover:text-[var(--brand)]"
      >
        &larr; My tickets
      </Link>

      <span className={`badge ${isCancelled ? "badge-accent" : ""}`}>{booking.status}</span>
      <h1 className="mt-4 text-4xl leading-[0.95] sm:text-5xl">{booking.eventId?.title}</h1>
      <p className="mt-3 text-sm muted">
        {booking.eventId?.date} &middot; {booking.eventId?.time}
      </p>

      <div className="rule my-8" />

      {/* The pass itself: details on the left, scannable code on the right */}
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] muted">Your seats</p>
          <p className="mt-3 font-display text-3xl" style={{ color: "var(--brand)" }}>
            {booking.seatIds.map((s) => s.label).join(" · ")}
          </p>

          <dl className="mt-6">
            <Row label="Tickets" value={String(booking.seatIds.length)} />
            <Row label="Total paid" value={formatPrice(booking.totalAmount)} />
            <Row label="Reference" value={<span className="font-mono">{booking.bookingRef}</span>} />
          </dl>
        </div>

        {qrDataUrl && (
          <div className="card flex flex-col items-center gap-3 sm:w-56">
            <div style={{ background: "#fff", padding: "10px", borderRadius: "10px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Booking QR code" width={160} height={160} />
            </div>
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] muted">
              Show this at entry
            </p>
          </div>
        )}
      </div>

      {booking.status === "confirmed" && (
        <div className="mt-8">
          <CancelBookingButton bookingId={String(booking._id)} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b py-3 last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <dt className="field-label">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
