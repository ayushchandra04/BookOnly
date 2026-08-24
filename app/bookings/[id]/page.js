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
    <div className="mx-auto max-w-sm py-4">
      <Link
        href="/bookings"
        className="mb-6 inline-block text-[11px] font-bold uppercase tracking-[0.12em] muted transition hover:text-[var(--brand)]"
      >
        &larr; All bookings
      </Link>

      {/* A printed boarding-pass slip: ink header band, punched perforation, stub */}
      <div
        className="overflow-hidden border-2"
        style={{
          borderColor: "var(--foreground)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-hard)",
          background: "var(--surface)",
        }}
      >
        <div className="relative p-6" style={{ background: "var(--foreground)" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--background) 0 1px, transparent 1px 20px)",
            }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--brand)" }}
            >
              E-Ticket
            </p>
            {isCancelled && (
              <span
                className="border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ borderColor: "rgba(255,255,255,0.45)", color: "#fff", borderRadius: "2px" }}
              >
                Cancelled
              </span>
            )}
          </div>

          <h1
            className="relative mt-3 text-2xl font-bold leading-tight tracking-tight"
            style={{ color: "var(--background)" }}
          >
            {booking.eventId?.title}
          </h1>
          <p
            className="relative mt-2 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "color-mix(in srgb, var(--background) 60%, transparent)" }}
          >
            {booking.eventId?.date} &middot; {booking.eventId?.time}
          </p>
        </div>

        {/* Perforation */}
        <div className="ticket-notch relative">
          <div
            className="absolute left-4 right-4 top-0 border-t-2 border-dashed"
            style={{ borderColor: "var(--border)" }}
          />
        </div>

        <div className="p-6">
          <dl>
            <Row label="Seats" value={booking.seatIds.map((s) => s.label).join(", ")} />
            <Row label="Total" value={formatPrice(booking.totalAmount)} mono />
            <Row
              label="Status"
              value={
                <span className={`badge ${isCancelled ? "" : "badge-accent"}`}>{booking.status}</span>
              }
            />
          </dl>

          {qrDataUrl && (
            <div
              className="mt-6 flex flex-col items-center gap-3 border-t-2 border-dashed pt-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="border-2 p-2"
                style={{ borderColor: "var(--foreground)", borderRadius: "var(--radius)", background: "#fff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Booking QR code" width={170} height={170} />
              </div>
              <p className="font-mono text-sm font-bold tracking-[0.15em]">{booking.bookingRef}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] muted">
                Show this code at entry
              </p>
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

function Row({ label, value, mono }) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b py-3 last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <dt className="field-label">{label}</dt>
      <dd className={`text-sm font-bold ${mono ? "font-display text-base" : ""}`}>{value}</dd>
    </div>
  );
}
