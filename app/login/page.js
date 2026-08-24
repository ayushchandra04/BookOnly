"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const redirect = searchParams.get("redirect");
      if (redirect) router.push(redirect);
      else if (data.user.role === "admin") router.push("/admin/venues");
      else if (data.user.role === "organiser") router.push("/organiser/events");
      else router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel
      stub="Admit one"
      heading={
        <>
          Welcome
          <br />
          back.
        </>
      }
      blurb="Log in to pick up where you left off — your held seats and past bookings are waiting."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold underline" style={{ color: "var(--brand)" }}>
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="field-label">Email</span>
          <input
            required
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="field-label">Password</span>
          <input
            required
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        {error && (
          <p
            className="border-l-2 py-1 pl-3 text-sm text-red-600 dark:text-red-400"
            style={{ borderColor: "currentColor" }}
          >
            {error}
          </p>
        )}

        <button disabled={loading} className="btn-primary w-full !py-3" type="submit">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthPanel>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
