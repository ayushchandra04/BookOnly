import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import EventPoster from "@/components/EventPoster";
import { formatPriceShort } from "@/lib/currency";

export const dynamic = "force-dynamic";

const TYPE_CHIPS = [
  { value: "", label: "All" },
  { value: "movie", label: "🎬 Movies" },
  { value: "concert", label: "🎵 Concerts" },
];

function formatDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { day: ymd, month: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en", { month: "short" }).toUpperCase(),
  };
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const type = params?.type ?? "";
  const date = params?.date ?? "";
  const q = params?.q ?? "";

  await connectDB();
  const filter = { status: "scheduled" };
  if (type === "movie" || type === "concert") filter.type = type;
  if (date) filter.date = date;
  if (q) filter.title = { $regex: q, $options: "i" };

  const events = await Event.find(filter)
    .sort({ date: 1, time: 1 })
    .populate("venueId", "name address")
    .lean();

  const isFiltered = Boolean(type || date || q);
  const [spotlight, ...rest] = events;
  // Only headline an event when the visitor hasn't filtered — once they're
  // searching, every result deserves equal weight in the grid.
  const showSpotlight = !isFiltered && spotlight;
  const gridEvents = showSpotlight ? rest : events;

  const chipHref = (value) => {
    const sp = new URLSearchParams();
    if (value) sp.set("type", value);
    if (q) sp.set("q", q);
    if (date) sp.set("date", date);
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex flex-col gap-14">
      {/* ---------- Hero ---------- */}
      <section className="relative -mx-4 overflow-hidden px-5 py-6 sm:mx-0 sm:rounded-2xl sm:px-8">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(115deg, #2e1065, #5b21b6 45%, #9d174d 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 82% 20%, rgba(251,191,36,0.35), transparent 50%), radial-gradient(circle at 5% 90%, rgba(56,189,248,0.28), transparent 48%)",
          }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Book your seat,{" "}
              <span className="bg-gradient-to-r from-amber-200 to-sky-200 bg-clip-text text-transparent">
                live the moment.
              </span>
            </h1>
          </div>

          <form className="flex w-full gap-2 sm:w-auto sm:shrink-0" action="/">
            {type && <input type="hidden" name="type" value={type} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search events…"
              aria-label="Search events"
              className="w-full rounded-lg border-0 bg-white/95 px-3.5 py-2 text-sm text-neutral-900 outline-none ring-2 ring-transparent transition placeholder:text-neutral-500 focus:ring-white/60 sm:w-56"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ---------- Spotlight ---------- */}
      {showSpotlight && (
        <section>
          <SectionHeading eyebrow="Spotlight" title="Next up" />
          <Link
            href={`/events/${spotlight._id}`}
            className="group relative block overflow-hidden rounded-3xl"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div className="relative h-64 sm:h-80">
              <EventPoster
                title={spotlight.title}
                posterUrl={spotlight.posterUrl}
                type={spotlight.type}
                zoomOnHover
                eager
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(8,8,14,0.94) 0%, rgba(8,8,14,0.72) 45%, rgba(8,8,14,0.1) 100%)",
                }}
              />
              <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 sm:p-10">
                <span className="w-fit rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  {spotlight.type}
                </span>
                <h3 className="mt-3 text-2xl font-bold text-white drop-shadow sm:text-4xl">
                  {spotlight.title}
                </h3>
                <p className="mt-2 text-sm text-white/75">
                  {spotlight.date} · {spotlight.time} · {spotlight.venueId?.name}
                </p>
                <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition group-hover:gap-2.5">
                  Book now <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ---------- Browse ---------- */}
      <section>
        <SectionHeading
          eyebrow="Browse"
          title={isFiltered ? "Search results" : "All events"}
          trailing={`${events.length} ${events.length === 1 ? "event" : "events"}`}
        />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TYPE_CHIPS.map((chip) => {
            const active = type === chip.value;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.value)}
                className="rounded-full border px-4 py-1.5 text-sm font-medium transition"
                style={
                  active
                    ? { background: "var(--brand)", borderColor: "var(--brand)", color: "var(--brand-fg)" }
                    : { borderColor: "var(--border)", background: "var(--surface)" }
                }
              >
                {chip.label}
              </Link>
            );
          })}

          <form className="ml-auto flex items-end gap-2" action="/">
            {type && <input type="hidden" name="type" value={type} />}
            {q && <input type="hidden" name="q" value={q} />}
            <input type="date" name="date" defaultValue={date} aria-label="Filter by date" className="input !py-2" />
            <button type="submit" className="btn-secondary !py-2">
              Apply
            </button>
            {isFiltered && (
              <Link href="/" className="btn-secondary !py-2">
                Clear
              </Link>
            )}
          </form>
        </div>

        {gridEvents.length === 0 ? (
          <div className="card py-20 text-center">
            <p className="mb-2 text-4xl">🎭</p>
            <p className="font-medium">No events found</p>
            <p className="mt-1 text-sm muted">
              {isFiltered ? "Try clearing your filters." : "Check back soon — new shows drop regularly."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gridEvents.map((ev) => {
              const lowest = Math.min(...ev.categoryPricing.map((p) => p.price));
              const { day, month } = formatDate(ev.date);
              return (
                <Link
                  key={ev._id}
                  href={`/events/${ev._id}`}
                  className="group relative block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                  style={{ boxShadow: "var(--shadow-md)" }}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <EventPoster title={ev.title} posterUrl={ev.posterUrl} type={ev.type} zoomOnHover />

                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(8,8,14,0.94) 0%, rgba(8,8,14,0.55) 38%, rgba(8,8,14,0.04) 68%)",
                      }}
                    />

                    <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1.5 leading-none text-neutral-900 shadow-sm">
                      <span className="text-base font-bold">{day}</span>
                      <span className="text-[9px] font-semibold tracking-wider text-neutral-500">{month}</span>
                    </div>

                    <span
                      className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      from {formatPriceShort(lowest)}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span className="mb-2 inline-block rounded-full bg-white/18 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {ev.type}
                      </span>
                      <h3 className="text-base font-bold leading-snug text-white drop-shadow-sm">
                        {ev.title}
                      </h3>
                      <p className="mt-1 text-xs text-white/70">
                        {ev.time} · {ev.venueId?.name}
                      </p>

                      <span className="mt-0 block max-h-0 overflow-hidden text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:mt-2.5 group-hover:max-h-8 group-hover:opacity-100">
                        Select seats →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Why Bookify ---------- */}
      <section>
        <SectionHeading eyebrow="Why Bookify" title="Built for sold-out nights" />
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon="🪑"
            title="Live seat map"
            body="See exactly what's free, held, or gone — updating in real time as others book."
          />
          <FeatureCard
            icon="⏱"
            title="Seats held for you"
            body="Your picks are locked for 10 minutes while you check out. No double bookings, ever."
          />
          <FeatureCard
            icon="🎟️"
            title="Waitlist that works"
            body="Sold out? Join the queue. Cancellations are offered to you automatically by email."
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, trailing }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--brand)" }}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {trailing && <span className="shrink-0 text-sm muted">{trailing}</span>}
    </div>
  );
}

function FeatureCard({ icon, title, body }) {
  return (
    <div className="card">
      <span
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg"
        style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}
      >
        {icon}
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed muted">{body}</p>
    </div>
  );
}
