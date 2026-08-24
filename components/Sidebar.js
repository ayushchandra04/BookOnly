"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Persistent left rail on desktop, collapsing to a top bar with a slide-down
 * menu on small screens. Replaces the old horizontal header entirely.
 */
export default function Sidebar() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Re-check the session on every route change — this shell persists across
    // client-side navigations, so a login elsewhere must reflect here.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  // Close the mobile menu whenever the route changes, or it stays open on top
  // of the page the user just navigated to.
  useEffect(() => setOpen(false), [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const links = [{ href: "/", label: "Now showing" }];
  if (user?.role === "customer") links.push({ href: "/bookings", label: "My tickets" });
  if (user?.role === "organiser") links.push({ href: "/organiser/events", label: "My events" });
  if (user?.role === "admin") links.push({ href: "/admin/venues", label: "Venues" });

  return (
    <>
      {/* Mobile bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <Wordmark />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Menu"
          className="btn-secondary !px-4 !py-2 !text-xs"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {open && (
        <div
          className="sticky top-[57px] z-40 border-b px-4 py-4 lg:hidden"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <Nav links={links} pathname={pathname} />
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <Account user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col justify-between border-r p-6 lg:flex"
        style={{
          width: "var(--sidebar-w)",
          borderColor: "var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <Wordmark />
          <div className="rule my-7" />
          <Nav links={links} pathname={pathname} />
        </div>

        <Account user={user} onLogout={handleLogout} />
      </aside>
    </>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 items-center justify-center text-sm font-bold"
        style={{ background: "var(--brand)", color: "var(--brand-fg)", borderRadius: "10px" }}
      >
        B
      </span>
      <span className="font-display text-[15px] tracking-[0.06em]">
        Book<span style={{ color: "var(--brand)" }}>Only</span>
      </span>
    </Link>
  );
}

function Nav({ links, pathname }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-2.5 text-sm font-medium transition"
            style={{
              borderRadius: "10px",
              background: active ? "color-mix(in srgb, var(--brand) 14%, transparent)" : "transparent",
              color: active ? "var(--brand)" : "var(--muted)",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Account({ user, onLogout }) {
  if (user === undefined) return null;

  if (user === null) {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/register" className="btn-primary w-full">
          Sign up
        </Link>
        <Link href="/login" className="btn-secondary w-full">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold"
          style={{ background: "var(--surface-2)", color: "var(--brand)", borderRadius: "999px" }}
        >
          {user.name?.[0]?.toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block text-[11px] uppercase tracking-[0.1em] muted">{user.role}</span>
        </span>
      </div>
      <button onClick={onLogout} className="btn-secondary w-full !py-2.5 !text-xs">
        Log out
      </button>
    </div>
  );
}
