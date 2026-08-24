import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import EventPoster from "@/components/EventPoster";
import { formatPriceShort } from "@/lib/currency";

export const dynamic = "force-dynamic";

const TYPE_CHIPS = [
  { value: "", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "concert", label: "Concerts" },
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
    <div className="flex flex-col gap-16">
      {/* ---------- Hero: ink slab, box-office board ---------- */}
      <section
        className="relative -mx-4 overflow-hidden border-2 px-6 py-10 sm:mx-0 sm:px-10 sm:py-12"
        style={{
          background: "var(--foreground)",
          borderColor: "var(--foreground)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Repeating rule lines, echoing the body grid but tighter. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--background) 0 1px, transparent 1px 24px)",
          }}
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span
              className="inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ borderColor: "var(--brand)", color: "var(--brand)", borderRadius: "2px" }}
            >
              Box office &middot; open now
            </span>

            <h1
              className="mt-5 text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl"
              style={{ color: "var(--background)" }}
            >
              Pick the seat.
              <br />
              <span style={{ color: "var(--brand)" }}>Skip the queue.</span>
            </h1>

            <p
              className="mt-5 max-w-md text-sm leading-relaxed"
              style={{ color: "color-mix(in srgb, var(--background) 65%, transparent)" }}
            >
              Every seat in the house, mapped and live. Hold your picks for ten
              minutes while you decide.
            </p>
          </div>

          <form className="flex w-full gap-0 lg:w-auto lg:shrink-0" action="/">
            {type && <input type="hidden" name="type" value={type} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search events…"
              aria-label="Search events"
              className="w-full border-2 border-r-0 px-4 py-3 text-sm outline-none transition placeholder:opacity-50 lg:w-64"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                borderColor: "var(--background)",
                borderRadius: "var(--radius) 0 0 var(--radius)",
              }}
            />
            <button
              type="submit"
              className="shrink-0 border-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] transition hover:opacity-90"
              style={{
                background: "var(--brand)",
                borderColor: "var(--brand)",
                color: "var(--brand-fg)",
                borderRadius: "0 var(--radius) var(--radius) 0",
              }}
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
            className="group relative block overflow-hidden border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            style={{
              borderColor: "var(--foreground)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-hard)",
            }}
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
                    "linear-gradient(90deg, rgba(10,8,6,0.95) 0%, rgba(10,8,6,0.75) 45%, rgba(10,8,6,0.1) 100%)",
                }}
              />
              <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 sm:p-10">
                <span
                  className="w-fit border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                  style={{ borderColor: "rgba(255,255,255,0.5)", borderRadius: "2px" }}
                >
                  {spotlight.type}
                </span>
                <h3 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">
                  {spotlight.title}
                </h3>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                  {spotlight.date} &middot; {spotlight.time} &middot; {spotlight.venueId?.name}
                </p>
                <span
                  className="mt-6 inline-flex w-fit items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition group-hover:gap-3"
                  style={{
                    background: "var(--brand)",
                    color: "#ffffff",
                    borderRadius: "var(--radius)",
                  }}
                >
                  Book now <span aria-hidden>&rarr;</span>
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
          trailing={`${String(events.length).padStart(2, "0")} ${
            events.length === 1 ? "event" : "events"
          }`}
        />

        <div className="mb-7 flex flex-wrap items-center gap-2">
          {TYPE_CHIPS.map((chip) => {
            const active = type === chip.value;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.value)}
                className="border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition"
                style={
                  active
                    ? {
                        background: "var(--foreground)",
                        borderColor: "var(--foreground)",
                        color: "var(--background)",
                        borderRadius: "var(--radius)",
                      }
                    : {
                        borderColor: "var(--border)",
                        background: "transparent",
                        borderRadius: "var(--radius)",
                      }
                }
              >
                {chip.label}
              </Link>
            );
          })}

          <form className="ml-auto flex items-end gap-2" action="/">
            {type && <input type="hidden" name="type" value={type} />}
            {q && <input type="hidden" name="q" value={q} />}
            <input
              type="date"
              name="date"
              defaultValue={date}
              aria-label="Filter by date"
              className="input !py-2"
            />
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
          <div
            className="border-2 border-dashed py-20 text-center"
            style={{ borderColor: "var(--border)", borderRadius: "var(--radius-lg)" }}
          >
            <p className="font-display text-lg font-bold">No events found</p>
            <p className="mx-auto mt-2 max-w-xs text-sm muted">
              {isFiltered
                ? "Try clearing your filters."
                : "Check back soon — new shows drop regularly."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridEvents.map((ev) => {
              const lowest = Math.min(...ev.categoryPricing.map((p) => p.price));
              const { day, month } = formatDate(ev.date);
              return (
                <Link
                  key={ev._id}
                  href={`/events/${ev._id}`}
                  className="group flex flex-col overflow-hidden border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-[var(--foreground)]"
                  style={{
                    borderColor: "var(--border)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface)",
                  }}
                >
                  {/* Poster half */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <EventPoster
                      title={ev.title}
                      posterUrl={ev.posterUrl}
                      type={ev.type}
                      zoomOnHover
                    />

                    <div
                      className="absolute left-0 top-4 flex flex-col items-center px-3 py-1.5 leading-none"
                      style={{
                        background: "var(--brand)",
                        color: "#ffffff",
                        borderRadius: "0 var(--radius) var(--radius) 0",
                      }}
                    >
                      <span className="font-display text-lg font-bold">{day}</span>
                      <span className="text-[9px] font-bold tracking-[0.12em] opacity-80">
                        {month}
                      </span>
                    </div>

                    <span
                      className="absolute right-3 top-4 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm"
                      style={{ borderColor: "rgba(255,255,255,0.55)", borderRadius: "2px" }}
                    >
                      {ev.type}
                    </span>
                  </div>

                  {/* Stub half — split by a perforation, not a gradient fade */}
                  <div
                    className="ticket-notch flex flex-1 flex-col border-t-2 border-dashed p-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <h3 className="font-display text-base font-bold leading-snug">{ev.title}</h3>
                    <p className="mt-1.5 text-xs muted">
                      {ev.time} &middot; {ev.venueId?.name}
                    </p>

                    <div className="mt-4 flex items-end justify-between gap-3 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] muted">
                        from{" "}
                        <span
                          className="font-display text-sm"
                          style={{ color: "var(--foreground)" }}
                        >
                          {formatPriceShort(lowest)}
                        </span>
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={{ color: "var(--brand)" }}
                      >
                        Select seats &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Why BookOnly ---------- */}
      <section>
        <SectionHeading eyebrow="Why BookOnly" title="Built for sold-out nights" />
        <div
          className="grid gap-0 border-2 sm:grid-cols-3"
          style={{ borderColor: "var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          <FeatureCard
            index="01"
            title="Live seat map"
            body="See exactly what's free, held, or gone — updating in real time as others book."
          />
          <FeatureCard
            index="02"
            title="Seats held for you"
            body="Your picks are locked for 10 minutes while you check out. No double bookings, ever."
            bordered
          />
          <FeatureCard
            index="03"
            title="Waitlist that works"
            body="Sold out? Join the queue. Cancellations are offered to you automatically by email."
            bordered
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, trailing }) {
  return (
    <div
      className="mb-6 flex items-end justify-between gap-4 border-b-2 pb-3"
      style={{ borderColor: "var(--foreground)" }}
    >
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--brand)" }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {trailing && (
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] muted">
          {trailing}
        </span>
      )}
    </div>
  );
}

function FeatureCard({ index, title, body, bordered }) {
  return (
    <div
      className={`p-6 ${bordered ? "border-t-2 sm:border-l-2 sm:border-t-0" : ""}`}
      style={bordered ? { borderColor: "var(--border)" } : undefined}
    >
      <span
        className="font-display text-xs font-bold tracking-[0.2em]"
        style={{ color: "var(--brand)" }}
      >
        {index}
      </span>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed muted">{body}</p>
    </div>
  );
}
