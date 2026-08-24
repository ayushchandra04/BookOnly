"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
    <div className="mx-auto max-w-sm py-8">
      <div className="mb-6 text-center">
        <span
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
        >
          🎟️
        </span>
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm muted">Log in to continue booking.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Email</span>
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Password</span>
            <input
              required
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium" style={{ color: "var(--brand)" }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
