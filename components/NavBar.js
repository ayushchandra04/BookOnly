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
    <header
      className="sticky top-0 z-50 border-b-2"
      style={{ borderColor: "var(--foreground)", background: "var(--background)" }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center text-sm font-bold"
            style={{
              background: "var(--brand)",
              color: "var(--brand-fg)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-display)",
            }}
          >
            B
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight">
            Book<span style={{ color: "var(--brand)" }}>Only</span>
          </span>
        </Link>

        <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-[0.08em]">
          <NavLink href="/">Home</NavLink>

          {user === undefined && null}

          {user === null && (
            <>
              <NavLink href="/login">Log in</NavLink>
              <Link href="/register" className="btn-primary !px-4 !py-2">
                Sign up
              </Link>
            </>
          )}

          {user && user.role === "customer" && (
            <>
              <NavLink href="/bookings">My Bookings</NavLink>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}

          {user && user.role === "organiser" && (
            <>
              <NavLink href="/organiser/events">My Events</NavLink>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}

          {user && user.role === "admin" && (
            <>
              <NavLink href="/admin/venues">Venues</NavLink>
              <UserMenu user={user} onLogout={handleLogout} />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="border-b-2 border-transparent pb-0.5 transition hover:border-[var(--brand)]"
    >
      {children}
    </Link>
  );
}

function UserMenu({ user, onLogout }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden items-center gap-2 sm:flex">
        <span
          className="flex h-6 w-6 items-center justify-center text-[11px] font-bold"
          style={{
            background: "var(--foreground)",
            color: "var(--background)",
            borderRadius: "var(--radius)",
          }}
        >
          {user.name?.[0]?.toUpperCase()}
        </span>
        <span className="muted normal-case tracking-normal">{user.name}</span>
      </span>
      <button onClick={onLogout} className="btn-secondary !px-3 !py-1.5 !text-[10px]">
        Log out
      </button>
    </div>
  );
}
