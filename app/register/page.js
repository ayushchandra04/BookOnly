"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";

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
    <AuthPanel
      stub="New here"
      heading={
        <>
          Get your
          <br />
          seat.
        </>
      }
      blurb="One account books tickets and hosts events. Choose which you are below — you can always start hosting later."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold underline" style={{ color: "var(--brand)" }}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

        {/* Role reads better as two explicit choices than a hidden select */}
        <fieldset className="flex flex-col gap-2">
          <legend className="field-label mb-2">I am a…</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <RoleOption
              checked={form.role === "customer"}
              onSelect={() => setForm({ ...form, role: "customer" })}
              title="Customer"
              note="Booking tickets"
            />
            <RoleOption
              checked={form.role === "organiser"}
              onSelect={() => setForm({ ...form, role: "organiser" })}
              title="Organiser"
              note="Creating events"
            />
          </div>
        </fieldset>

        {error && (
          <p
            className="border-l-2 py-1 pl-3 text-sm text-red-600 dark:text-red-400"
            style={{ borderColor: "currentColor" }}
          >
            {error}
          </p>
        )}

        <button disabled={loading} className="btn-primary w-full !py-3" type="submit">
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthPanel>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function RoleOption({ checked, onSelect, title, note }) {
  return (
    <label
      className="flex cursor-pointer flex-col border-2 p-3 transition"
      style={{
        borderColor: checked ? "var(--brand)" : "var(--border)",
        background: checked ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "transparent",
        borderRadius: "var(--radius)",
      }}
    >
      <input
        type="radio"
        name="role"
        className="sr-only"
        checked={checked}
        onChange={onSelect}
      />
      <span className="text-xs font-bold uppercase tracking-[0.08em]">{title}</span>
      <span className="mt-0.5 text-xs muted">{note}</span>
    </label>
  );
}
