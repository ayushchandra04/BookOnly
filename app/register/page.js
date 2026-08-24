"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      if (data.user.role === "organiser") router.push("/organiser/events");
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
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm muted">Book tickets or start hosting events.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Name">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              minLength={8}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="I am a...">
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="customer">Customer — booking tickets</option>
              <option value="organiser">Organiser — creating events</option>
            </select>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--brand)" }}>
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
