import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import { generateQrDataUrl } from "@/lib/qrcode";
import EventPoster from "@/components/EventPoster";
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
    <div className="mx-auto max-w-md py-4">
      <div className="overflow-hidden rounded-3xl shadow-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="relative h-44 text-white">
          {booking.eventId && (
            <EventPoster
              title={booking.eventId.title}
              posterUrl={booking.eventId.posterUrl}
              type={booking.eventId.type}
              eager
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(8,8,14,0.95) 0%, rgba(8,8,14,0.6) 45%, rgba(8,8,14,0.2) 100%)",
            }}
          />
          {isCancelled && (
            <span className="absolute right-5 top-5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm">
              Cancelled
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">E-Ticket</p>
            <h1 className="mt-1 text-2xl font-bold drop-shadow">{booking.eventId?.title}</h1>
            <p className="mt-1 text-sm text-white/80">
              {booking.eventId?.date} · {booking.eventId?.time}
            </p>
          </div>
        </div>

        <div className="relative p-6" style={{ background: "var(--surface)" }}>
          <div
            className="absolute -left-3 top-0 h-6 w-6 rounded-full"
            style={{ background: "var(--background)" }}
          />
          <div
            className="absolute -right-3 top-0 h-6 w-6 rounded-full"
            style={{ background: "var(--background)" }}
          />
          <div
            className="absolute left-3 right-3 top-0 border-t-2 border-dashed"
            style={{ borderColor: "var(--border)" }}
          />

          <dl className="grid grid-cols-[110px_1fr] gap-y-3 pt-3 text-sm">
            <dt className="field-label">Seats</dt>
            <dd className="font-semibold">{booking.seatIds.map((s) => s.label).join(", ")}</dd>
            <dt className="field-label">Total</dt>
            <dd className="font-semibold">{formatPrice(booking.totalAmount)}</dd>
            <dt className="field-label">Status</dt>
            <dd className="capitalize">
              <span className={`badge ${isCancelled ? "" : "badge-accent"}`}>{booking.status}</span>
            </dd>
          </dl>

          {qrDataUrl && (
            <div className="mt-6 flex flex-col items-center gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Booking QR code" width={180} height={180} className="rounded-xl" />
              <p className="font-mono text-sm font-semibold tracking-wider">{booking.bookingRef}</p>
              <p className="text-xs muted">Show this code at entry</p>
            </div>
          )}
        </div>
      </div>

      {booking.status === "confirmed" && (
        <div className="mt-6">
          <CancelBookingButton bookingId={String(booking._id)} />
        </div>
      )}
    </div>
  );
}
