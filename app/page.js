import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import EventPoster from "@/components/EventPoster";
import { formatPriceShort } from "@/lib/currency";

export const dynamic = "force-dynamic";

const TYPE_CHIPS = [
  { value: "", label: "Everything" },
  { value: "movie", label: "Movies" },
  { value: "concert", label: "Concerts" },
];

function formatDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { day: ymd, month: "", weekday: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en", { month: "short" }).toUpperCase(),
    weekday: d.toLocaleString("en", { weekday: "short" }).toUpperCase(),
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
  // searching, every result deserves equal weight in the list.
  const showSpotlight = !isFiltered && spotlight;
  const listEvents = showSpotlight ? rest : events;

  const chipHref = (value) => {
    const sp = new URLSearchParams();
    if (value) sp.set("type", value);
    if (q) sp.set("q", q);
    if (date) sp.set("date", date);
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex flex-col gap-12">
      {/* ---------- Masthead ---------- */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--brand)" }}>
          {events.length} showing this season
        </p>
        <h1 className="mt-3 text-5xl leading-[0.92] sm:text-7xl">
          Now
          <br />
          <span style={{ color: "var(--brand)" }}>showing</span>
        </h1>

        <form className="mt-8 flex max-w-lg gap-2" action="/">
          {type && <input type="hidden" name="type" value={type} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title…"
            aria-label="Search events"
            className="input"
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
      </header>

      {/* ---------- Spotlight: a wide landscape banner, not a poster card ---------- */}
      {showSpotlight && (
        <section>
          <SectionRule label="Headliner" />
          <Link
            href={`/events/${spotlight._id}`}
            className="group relative grid overflow-hidden transition-all sm:grid-cols-[1.1fr_1fr]"
            style={{
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="relative order-2 min-h-[220px] sm:order-1 sm:min-h-[300px]">
              <div className="absolute inset-0">
                <EventPoster
                  title={spotlight.title}
                  posterUrl={spotlight.posterUrl}
                  type={spotlight.type}
                  zoomOnHover
                  eager
                />
              </div>
              {/* Fade into the panel so the seam disappears on wide screens */}
              <div
                className="absolute inset-0 hidden sm:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 40%, var(--surface) 100%)",
                }}
              />
            </div>

            <div className="order-1 flex flex-col justify-center gap-4 p-7 sm:order-2 sm:p-10">
              <span className="badge w-fit">{spotlight.type}</span>
              <h2 className="text-3xl leading-none sm:text-5xl">{spotlight.title}</h2>
              <p className="text-sm muted">
                {spotlight.date} &middot; {spotlight.time} &middot; {spotlight.venueId?.name}
              </p>
              <span className="btn-primary mt-2 w-fit">Book now &rarr;</span>
            </div>
          </Link>
        </section>
      )}

      {/* ---------- The board ---------- */}
      <section>
        <SectionRule label={isFiltered ? "Results" : "Schedule"} />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TYPE_CHIPS.map((chip) => {
            const active = type === chip.value;
            return (
              <Link
                key={chip.label}
                href={chipHref(chip.value)}
                className="px-4 py-2 text-xs font-semibold transition"
                style={{
                  borderRadius: "var(--pill)",
                  background: active ? "var(--brand)" : "transparent",
                  color: active ? "var(--brand-fg)" : "var(--muted)",
                  border: `1px solid ${active ? "var(--brand)" : "var(--border-strong)"}`,
                }}
              >
                {chip.label}
              </Link>
            );
          })}

          <form className="ml-auto flex items-center gap-2" action="/">
            {type && <input type="hidden" name="type" value={type} />}
            {q && <input type="hidden" name="q" value={q} />}
            <input
              type="date"
              name="date"
              defaultValue={date}
              aria-label="Filter by date"
              className="input !w-auto !py-2 !text-xs"
            />
            <button type="submit" className="btn-secondary !px-4 !py-2 !text-xs">
              Apply
            </button>
            {isFiltered && (
              <Link href="/" className="btn-secondary !px-4 !py-2 !text-xs">
                Clear
              </Link>
            )}
          </form>
        </div>

        {listEvents.length === 0 ? (
          <div
            className="py-24 text-center"
            style={{
              borderRadius: "var(--radius)",
              border: "1px dashed var(--border-strong)",
            }}
          >
            <p className="font-display text-xl">Nothing on</p>
            <p className="mt-2 text-sm muted">
              {isFiltered ? "Try clearing your filters." : "New shows drop every week."}
            </p>
          </div>
        ) : (
          /* Departures-board rows rather than a grid of poster tiles */
          <ul
            className="overflow-hidden"
            style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)" }}
          >
            {listEvents.map((ev, i) => {
              const lowest = Math.min(...ev.categoryPricing.map((p) => p.price));
              const { day, month, weekday } = formatDate(ev.date);
              return (
                <li key={ev._id}>
                  <Link
                    href={`/events/${ev._id}`}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors sm:gap-6 sm:px-6"
                    style={{
                      background: "var(--surface)",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div className="w-11 shrink-0 text-center sm:w-14">
                      <p className="font-display text-2xl leading-none sm:text-3xl">{day}</p>
                      <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] muted">
                        {month}
                      </p>
                    </div>

                    <div
                      className="hidden h-14 w-10 shrink-0 overflow-hidden sm:block"
                      style={{ borderRadius: "8px" }}
                    >
                      <EventPoster title={ev.title} posterUrl={ev.posterUrl} type={ev.type} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg leading-tight transition-colors group-hover:text-[var(--brand)] sm:text-xl">
                        {ev.title}
                      </p>
                      <p className="mt-1 truncate text-xs muted">
                        {weekday} &middot; {ev.time} &middot; {ev.venueId?.name}
                      </p>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[10px] uppercase tracking-[0.12em] muted">from</p>
                      <p className="font-display text-lg" style={{ color: "var(--brand)" }}>
                        {formatPriceShort(lowest)}
                      </p>
                    </div>

                    <span
                      className="shrink-0 px-4 py-2 text-[11px] font-semibold transition-all sm:px-5"
                      style={{
                        borderRadius: "var(--pill)",
                        border: "1px solid var(--border-strong)",
                      }}
                    >
                      Seats
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- How it works ---------- */}
      <section>
        <SectionRule label="How it works" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Step n="1" title="Pick your seats" body="A live map of the room — free, held and gone, updating as others book." />
          <Step n="2" title="Ten minutes to decide" body="Your picks are locked while you check out. Nobody can take them." />
          <Step n="3" title="Sold out? Queue up" body="Cancellations are offered to the waitlist automatically, by email." />
        </div>
      </section>
    </div>
  );
}

function SectionRule({ label }) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] muted">{label}</p>
      <div className="rule" />
    </div>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="card">
      <span
        className="flex h-9 w-9 items-center justify-center font-display text-base"
        style={{ background: "var(--surface-2)", color: "var(--brand)", borderRadius: "999px" }}
      >
        {n}
      </span>
      <h3 className="mt-4 font-display text-base">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed muted">{body}</p>
    </div>
  );
}
