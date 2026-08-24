"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEventForm() {
  const router = useRouter();
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterOk, setPosterOk] = useState(null); // null = untested, false = failed to load
  const [type, setType] = useState("movie");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [prices, setPrices] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/venues")
      .then((r) => r.json())
      .then((d) => setVenues(d.venues ?? []))
      .catch(() => setVenues([]));
  }, []);

  const selectedVenue = venues.find((v) => v._id === venueId);

  // Reset the price fields when the venue changes. Adjusted directly during
  // render (React's documented pattern for "state that depends on a prop")
  // rather than in an effect, so it doesn't cause an extra render pass.
  const [pricesForVenue, setPricesForVenue] = useState("");
  if (selectedVenue && pricesForVenue !== venueId) {
    setPricesForVenue(venueId);
    setPrices(Object.fromEntries(selectedVenue.categories.map((c) => [c, ""])));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const categoryPricing = Object.entries(prices).map(([category, price]) => ({
        category,
        price: Number(price),
      }));
      if (categoryPricing.some((cp) => !cp.price || cp.price <= 0)) {
        throw new Error("Set a price greater than 0 for every category");
      }
      if (posterUrl.trim() && !/^https:\/\//i.test(posterUrl.trim())) {
        throw new Error("Poster URL must start with https://");
      }

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          posterUrl: posterUrl.trim(),
          type,
          venueId,
          date,
          time,
          categoryPricing,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create event");
      router.push("/organiser/events");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Title</span>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="field-label">Description</span>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Poster image URL (optional)</span>
            <input
              type="url"
              className="input"
              placeholder="https://image.tmdb.org/..."
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
            />
          </label>
          <p className="text-xs muted">
            Paste a direct https image link. Leave blank for an auto-generated gradient poster.
            Some sites (e.g. Wikipedia) block hotlinking — check the preview below actually loads.
          </p>
          {posterUrl.trim() && (
            <div className="mt-1 flex items-center gap-3">
              <div
                className="h-40 w-28 shrink-0 overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterUrl}
                  alt="Poster preview"
                  onLoad={() => setPosterOk(true)}
                  onError={() => setPosterOk(false)}
                  className="h-full w-full object-cover"
                />
              </div>
              {posterOk === false && (
                <p className="text-xs text-red-600">
                  This image didn&apos;t load — it&apos;ll show the gradient poster instead. Try another URL.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="movie">Movie</option>
              <option value="concert">Concert</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Venue</span>
            <select required className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
              <option value="">Select a venue...</option>
              {venues.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Date</span>
            <input required type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Time</span>
            <input required type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
      </div>

      {selectedVenue && (
        <div className="card">
          <p className="field-label mb-3">Pricing per category (₹)</p>
          <div className="flex flex-col gap-2.5">
            {selectedVenue.categories.map((c) => (
              <label key={c} className="flex items-center gap-3 text-sm">
                <span className="badge w-fit">{c}</span>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  className="input max-w-[140px]"
                  value={prices[c] ?? ""}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [c]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={loading} type="submit" className="btn-primary w-fit">
        {loading ? "Creating..." : "Create event"}
      </button>
    </form>
  );
}
