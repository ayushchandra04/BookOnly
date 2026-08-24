/**
 * Shell shared by log in / sign up. A single dark panel with the headline
 * stacked above the form — no split card, no centred box.
 */
export default function AuthPanel({ stub, heading, blurb, children, footer }) {
  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: "var(--brand)" }}
          >
            {stub}
          </p>

          <h1 className="mt-4 text-5xl leading-[0.92] sm:text-6xl">{heading}</h1>

          <div className="rule my-7 max-w-xs" />

          <p className="max-w-sm text-sm leading-relaxed muted">{blurb}</p>
        </div>

        <div
          className="p-7 sm:p-8"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          {children}

          {footer && (
            <p className="mt-7 border-t pt-5 text-sm muted" style={{ borderColor: "var(--border)" }}>
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
