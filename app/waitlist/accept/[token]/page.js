"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WaitlistAcceptPage() {
  const { token } = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/waitlist/offer/${token}/accept`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load offer");
        setOffer(json);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/waitlist/offer/${token}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to accept offer");
      router.push(`/bookings/${json.booking._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!offer) return <p className="text-sm muted">Loading offer...</p>;

  if (offer.expired) {
    return (
      <div className="mx-auto max-w-md card py-10 text-center">
        <p className="mb-3 text-3xl">⌛</p>
        <h1 className="mb-2 text-lg font-bold">This offer has expired</h1>
        <p className="text-sm muted">
          The seat has been offered to the next person on the waitlist. You can join the waitlist again from the event page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-5 text-center">
        <p className="mb-2 text-3xl">🎉</p>
        <h1 className="text-xl font-bold">A seat is available for you</h1>
      </div>
      <div className="card">
        <dl className="mb-4 grid grid-cols-[100px_1fr] gap-y-2.5 text-sm">
          <dt className="field-label">Event</dt>
          <dd className="font-medium">{offer.event?.title}</dd>
          <dt className="field-label">When</dt>
          <dd>
            {offer.event?.date} · {offer.event?.time}
          </dd>
          <dt className="field-label">Category</dt>
          <dd><span className="badge">{offer.category}</span></dd>
          <dt className="field-label">Seat</dt>
          <dd className="font-medium">{offer.seatLabel}</dd>
        </dl>
        <p className="mb-4 text-xs muted">
          Offer expires at {new Date(offer.offerExpiresAt).toLocaleString()}
        </p>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button disabled={busy} onClick={handleAccept} className="btn-primary w-full">
          {busy ? "Booking..." : "Claim your seat"}
        </button>
      </div>
    </div>
  );
}
