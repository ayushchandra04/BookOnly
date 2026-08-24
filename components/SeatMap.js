"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";

const POLL_MS = 3000;

const STATUS_STYLES = {
  available: "border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 hover:shadow-md",
  selected: "border-transparent text-white shadow-md scale-105",
  mine: "border-transparent text-white shadow-md",
  held: "border-transparent opacity-40 cursor-not-allowed",
  offered: "border-transparent cursor-not-allowed text-black/80",
  booked: "border-transparent cursor-not-allowed opacity-25",
};

const SWATCH_BG = {
  available: { background: "var(--surface)", borderColor: "var(--border)" },
  selected: { background: "var(--brand)" },
  mine: { background: "#10b981" },
  held: { background: "var(--muted)", opacity: 0.4 },
  offered: { background: "var(--accent)" },
  booked: { background: "var(--foreground)", opacity: 0.3 },
};

// Distinct hue per seat category, assigned by the category's order in the
// event's pricing list, so an available seat's colour tells you its tier
// without hovering. Wraps if a venue somehow defines more than six.
const CATEGORY_COLORS = ["#7c3aed", "#0891b2", "#059669", "#db2777", "#ea580c", "#4f46e5"];

function rowLetter(index) {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export default function SeatMap({ eventId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [now, setNow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState("");
  const heldSeatIdsRef = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/seats`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load seat map");
      setData(json);

      const mine = json.seats.filter((s) => s.status === "held" && s.isMine);
      heldSeatIdsRef.current = new Set(mine.map((s) => s.id));
      if (mine.length > 0) {
        setHoldExpiresAt(mine[0].holdExpiresAt);
      } else {
        setHoldExpiresAt(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [eventId]);

  useEffect(() => {
    // Fetch immediately on mount, then poll — intentional fire-and-forget,
    // not a race-prone pattern since `id` (load's only dependency) is stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  // Best-effort release on tab close / navigation away, so seats free up
  // before the full hold TTL elapses (checkout abandonment).
  useEffect(() => {
    function releaseOnUnload() {
      const seatIds = Array.from(heldSeatIdsRef.current);
      if (seatIds.length === 0) return;
      navigator.sendBeacon(
        `/api/events/${eventId}/release-beacon`,
        new Blob([JSON.stringify({ seatIds })], { type: "application/json" })
      );
    }
    window.addEventListener("pagehide", releaseOnUnload);
    return () => window.removeEventListener("pagehide", releaseOnUnload);
  }, [eventId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm muted">Loading seat map...</p>;

  const { event, layout, seats } = data;
  const secondsLeft = holdExpiresAt && now ? Math.max(0, Math.round((new Date(holdExpiresAt) - now) / 1000)) : 0;
  const heldExpired = holdExpiresAt && now && secondsLeft === 0;

  const categoryColor = Object.fromEntries(
    event.categoryPricing.map((cp, i) => [cp.category, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
  );
  const priceFor = Object.fromEntries(event.categoryPricing.map((cp) => [cp.category, cp.price]));

  function seatVariant(seat) {
    if (seat.status === "available" && selected.has(seat.id)) return "selected";
    if (seat.status === "held" && seat.isMine) return "mine";
    return seat.status;
  }

  function seatClassName(seat) {
    return STATUS_STYLES[seatVariant(seat)] ?? STATUS_STYLES.available;
  }

  function seatInlineStyle(seat) {
    const variant = seatVariant(seat);
    // Available seats are tinted with their category's colour so the tier is
    // readable at a glance; every other state is defined by its status colour.
    if (variant === "available") {
      const c = categoryColor[seat.category] ?? "var(--brand)";
      return { background: `color-mix(in srgb, ${c} 14%, var(--surface))`, borderColor: c, color: c };
    }
    return { background: SWATCH_BG[variant]?.background };
  }

  function toggleSeat(seat) {
    if (seat.status === "held" && seat.isMine) return; // already held, use checkout panel to release
    if (seat.status !== "available") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  async function handleHold() {
    if (selected.size === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to hold seats");
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(seatId) {
    setBusy(true);
    try {
      await fetch(`/api/events/${eventId}/hold`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seatIds: Array.from(heldSeatIdsRef.current) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to confirm booking");
      router.push(`/bookings/${json.booking._id}`);
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinWaitlist(category) {
    setWaitlistMsg("");
    try {
      const res = await fetch(`/api/events/${eventId}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to join waitlist");
      setWaitlistMsg(`You're on the waitlist for ${category}. We'll email you if a seat opens up.`);
    } catch (err) {
      setWaitlistMsg(err.message);
    }
  }

  const mySeats = seats.filter((s) => s.status === "held" && s.isMine);
  const totalForMySeats = mySeats.reduce((sum, s) => {
    const pricing = event.categoryPricing.find((p) => p.category === s.category);
    return sum + (pricing ? pricing.price : 0);
  }, 0);

  const categoriesSoldOut = event.categoryPricing
    .map((cp) => cp.category)
    .filter((cat) => !seats.some((s) => s.category === cat && s.status === "available"));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <h1 className="mb-1 text-xl font-bold">{event.title}</h1>
        <p className="mb-5 muted text-sm">
          {event.date} · {event.time} · {event.venue?.name}
        </p>

        <div className="card !p-4 sm:!p-6">
          <div className="mb-4">
            <p className="field-label mb-2">Seat categories</p>
            <div className="flex flex-wrap gap-2">
              {event.categoryPricing.map((cp) => {
                const left = seats.filter((s) => s.category === cp.category && s.status === "available").length;
                return (
                  <span
                    key={cp.category}
                    className="inline-flex items-center gap-2 rounded-[4px] border px-3 py-1.5 text-xs"
                    style={{
                      borderColor: categoryColor[cp.category],
                      background: `color-mix(in srgb, ${categoryColor[cp.category]} 10%, transparent)`,
                    }}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-[1px] border"
                      style={{
                        background: `color-mix(in srgb, ${categoryColor[cp.category]} 14%, var(--surface))`,
                        borderColor: categoryColor[cp.category],
                      }}
                    />
                    <span className="font-semibold" style={{ color: categoryColor[cp.category] }}>
                      {cp.category}
                    </span>
                    <span className="font-semibold">{formatPrice(cp.price)}</span>
                    <span className="muted">· {left} left</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div
            className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <Legend variant="selected" label="Selected" />
            <Legend variant="mine" label="Held by you" />
            <Legend variant="held" label="Held by others" />
            <Legend variant="offered" label="Waitlist pending" />
            <Legend variant="booked" label="Booked" />
          </div>

          <div className="mb-8 flex justify-center">
            <div
              className="h-1.5 w-3/4"
              style={{
                background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 40%, transparent), transparent)",
                boxShadow: "0 8px 20px -4px var(--ring)",
              }}
            />
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              className="mx-auto grid w-fit gap-1.5 sm:gap-2"
              style={{
                gridTemplateColumns: `1.25rem repeat(${layout?.cols ?? 1}, minmax(0, 2.25rem))`,
                gridTemplateRows: `repeat(${layout?.rows ?? 1}, 2.25rem)`,
              }}
            >
              {Array.from({ length: layout?.rows ?? 0 }, (_, r) => (
                <span
                  key={`row-${r}`}
                  style={{ gridColumn: 1, gridRow: r + 1 }}
                  className="flex items-center justify-center font-mono text-[10px] muted"
                >
                  {rowLetter(r)}
                </span>
              ))}

              {seats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  disabled={busy || (seat.status !== "available" && !(seat.status === "held" && seat.isMine))}
                  onClick={() => toggleSeat(seat)}
                  title={`${seat.label} · ${seat.category} · ${formatPrice(priceFor[seat.category])} · ${seat.status}`}
                  style={{ gridColumn: seat.col + 1, gridRow: seat.row, ...seatInlineStyle(seat) }}
                  className={`flex h-9 w-9 items-center justify-center rounded-[2px] border text-[10px] font-semibold transition-all ${seatClassName(seat)}`}
                >
                  {seat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {categoriesSoldOut.length > 0 && (
          <div className="card mt-4 !p-4">
            <h2 className="mb-2 text-sm font-semibold">Sold out</h2>
            <div className="flex flex-wrap gap-2">
              {categoriesSoldOut.map((cat) => (
                <button key={cat} onClick={() => handleJoinWaitlist(cat)} className="btn-secondary text-xs">
                  Join waitlist — {cat}
                </button>
              ))}
            </div>
            {waitlistMsg && <p className="mt-2 text-sm" style={{ color: "var(--brand)" }}>{waitlistMsg}</p>}
          </div>
        )}
      </div>

      <aside className="card sticky top-20 h-fit">
        <h2 className="mb-3 font-semibold">Your selection</h2>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        {selected.size > 0 && (
          <div className="mb-3">
            <ul className="mb-2 text-sm">
              {seats
                .filter((s) => selected.has(s.id))
                .map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between border-b py-1.5 last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="flex items-center gap-1.5">
                      {s.label}
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${categoryColor[s.category]} 14%, transparent)`,
                          color: categoryColor[s.category],
                        }}
                      >
                        {s.category}
                      </span>
                    </span>
                    <span className="muted">{formatPrice(priceFor[s.category])}</span>
                  </li>
                ))}
            </ul>
            <p className="mb-2 flex justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>
                {formatPrice(
                  seats
                    .filter((s) => selected.has(s.id))
                    .reduce((sum, s) => sum + (priceFor[s.category] ?? 0), 0)
                )}
              </span>
            </p>
            <button disabled={busy} onClick={handleHold} className="btn-primary w-full">
              Hold {selected.size} seat{selected.size > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {mySeats.length > 0 && (
          <div>
            <p
              className="mb-3 inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1 text-xs font-semibold"
              style={{
                background: secondsLeft <= 60 ? "rgba(220,38,38,0.12)" : "color-mix(in srgb, var(--brand) 12%, transparent)",
                color: secondsLeft <= 60 ? "#dc2626" : "var(--brand)",
              }}
            >
              ⏱ {heldExpired ? "Hold expired" : `${formatTime(secondsLeft)} left`}
            </p>
            <ul className="mb-3 text-sm">
              {mySeats.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b py-1.5 last:border-0" style={{ borderColor: "var(--border)" }}>
                  <span className="flex items-center gap-1.5">
                    {s.label}
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${categoryColor[s.category]} 14%, transparent)`,
                        color: categoryColor[s.category],
                      }}
                    >
                      {s.category}
                    </span>
                    <span className="muted">{formatPrice(priceFor[s.category])}</span>
                  </span>
                  <button disabled={busy} onClick={() => handleRelease(s.id)} className="text-xs text-red-600 hover:underline">
                    remove
                  </button>
                </li>
              ))}
            </ul>
            <p className="mb-3 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{formatPrice(totalForMySeats)}</span>
            </p>
            <button disabled={busy || heldExpired} onClick={handleConfirm} className="btn-primary w-full">
              Confirm booking
            </button>
          </div>
        )}

        {selected.size === 0 && mySeats.length === 0 && (
          <p className="text-sm muted">Click available seats to select them.</p>
        )}
      </aside>
    </div>
  );
}

function Legend({ variant, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-[1px] border" style={SWATCH_BG[variant]} />
      {label}
    </span>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
