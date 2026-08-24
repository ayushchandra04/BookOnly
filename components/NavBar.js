"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function NavBar() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Re-check the session on every route change, not just once on mount —
    // this layout persists across client-side navigations in the App Router,
    // so without this, logging in/out elsewhere wouldn't update the navbar
    // until a full page reload.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-lg" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--background) 75%, transparent)" }}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
          >
            🎟️
          </span>
          <span>Book<span style={{ color: "var(--brand)" }}>ify</span></span>
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/" className="font-medium transition hover:opacity-70">
            Home
          </Link>

          {user === undefined && null}

          {user === null && (
            <>
              <Link href="/login" className="font-medium transition hover:opacity-70">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
                Sign up
              </Link>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <Link href="/bookings" className="font-medium transition hover:opacity-70">
                My Bookings
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}

          {user && user.role === "organiser" && (
            <>
              <Link href="/organiser/events" className="font-medium transition hover:opacity-70">
                My Events
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <Link href="/admin/venues" className="font-medium transition hover:opacity-70">
                Venues
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function UserMenu({ user, onLogout }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden items-center gap-2 sm:flex">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
          style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
        >
          {user.name?.[0]?.toUpperCase()}
        </span>
        <span className="muted">{user.name}</span>
      </span>
      <button onClick={onLogout} className="btn-secondary !px-3 !py-1.5 text-xs">
        Log out
      </button>
    </div>
  );
}
