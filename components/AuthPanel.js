/**
 * Split shell shared by log in / sign up: an ink stub on the left carrying the
 * headline, the form on the right. Stacks to a single column on small screens,
 * where the stub collapses to a slim header strip.
 */
export default function AuthPanel({ stub, heading, blurb, children, footer }) {
  return (
    <div className="mx-auto max-w-4xl py-4">
      <div
        className="grid overflow-hidden border-2 md:grid-cols-[1fr_1.1fr]"
        style={{
          borderColor: "var(--foreground)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-hard)",
        }}
      >
        {/* Stub */}
        <div
          className="relative flex flex-col justify-between gap-8 p-7 sm:p-9"
          style={{ background: "var(--foreground)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--background) 0 1px, transparent 1px 22px)",
            }}
          />

          <div className="relative">
            <span
              className="inline-block border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ borderColor: "var(--brand)", color: "var(--brand)", borderRadius: "2px" }}
            >
              {stub}
            </span>

            <h1
              className="mt-6 text-3xl font-bold leading-[0.95] tracking-tight sm:text-4xl"
              style={{ color: "var(--background)" }}
            >
              {heading}
            </h1>

            <p
              className="mt-4 max-w-xs text-sm leading-relaxed"
              style={{ color: "color-mix(in srgb, var(--background) 60%, transparent)" }}
            >
              {blurb}
            </p>
          </div>

          {/* Torn edge, drawn as a row of half-circles punched out of the stub */}
          <div
            aria-hidden
            className="relative hidden h-3 md:block"
            style={{
              backgroundImage:
                "radial-gradient(circle at 6px 12px, var(--background) 5px, transparent 5px)",
              backgroundSize: "16px 12px",
              opacity: 0.25,
            }}
          />
        </div>

        {/* Form */}
        <div
          className="flex flex-col justify-center p-7 sm:p-9"
          style={{ background: "var(--surface)" }}
        >
          {children}

          {footer && (
            <p
              className="mt-7 border-t pt-5 text-sm muted"
              style={{ borderColor: "var(--border)" }}
            >
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
