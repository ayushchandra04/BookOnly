import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t-2" style={{ borderColor: "var(--foreground)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <p className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center text-xs font-bold"
              style={{
                background: "var(--brand)",
                color: "var(--brand-fg)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-display)",
              }}
            >
              B
            </span>
            <span className="font-display text-base font-bold tracking-tight">
              Book<span style={{ color: "var(--brand)" }}>Only</span>
            </span>
          </p>
          <p className="mt-3 text-xs leading-relaxed muted">
            Seat maps, instant holds, and automatic waitlists.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-[0.08em]">
          <Link href="/" className="transition hover:text-[var(--brand)]">
            Events
          </Link>
          <Link href="/bookings" className="transition hover:text-[var(--brand)]">
            My bookings
          </Link>
          <Link href="/login" className="transition hover:text-[var(--brand)]">
            Log in
          </Link>
        </nav>
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
        <p className="mx-auto max-w-6xl text-[11px] uppercase tracking-[0.08em] muted">
          © {new Date().getFullYear()} BookOnly. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
