import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-bold tracking-tight">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
            >
              🎟️
            </span>
            Book<span style={{ color: "var(--brand)" }}>ify</span>
          </p>
          <p className="mt-2 text-xs muted">Seat maps, instant holds, and automatic waitlists.</p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="transition hover:opacity-70">
            Events
          </Link>
          <Link href="/bookings" className="transition hover:opacity-70">
            My bookings
          </Link>
          <Link href="/login" className="transition hover:opacity-70">
            Log in
          </Link>
        </nav>
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
        <p className="mx-auto max-w-6xl text-xs muted">
          © {new Date().getFullYear()} Bookify. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
