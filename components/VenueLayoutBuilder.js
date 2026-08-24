"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function rowLetter(index) {
  // 0 -> A, 1 -> B ... 25 -> Z, 26 -> AA ...
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export default function VenueLayoutBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [categories, setCategories] = useState(["Premium", "Standard"]);
  const [newCategory, setNewCategory] = useState("");
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(8);
  const [rowCategories, setRowCategories] = useState(() => Array.from({ length: 4 }, (_, i) => (i < 1 ? "Premium" : "Standard")));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateRows(n) {
    const clamped = Math.min(26, Math.max(1, n));
    setRows(clamped);
    setRowCategories((prev) => {
      const next = prev.slice(0, clamped);
      while (next.length < clamped) next.push(categories[categories.length - 1] ?? "Standard");
      return next;
    });
  }

  function addCategory() {
    const c = newCategory.trim();
    if (!c || categories.includes(c)) return;
    setCategories((prev) => [...prev, c]);
    setNewCategory("");
  }

  function removeCategory(c) {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((x) => x !== c));
    setRowCategories((prev) => prev.map((rc) => (rc === c ? categories[0] : rc)));
  }

  const seats = useMemo(() => {
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c <= cols; c++) {
        out.push({ row: r + 1, col: c, label: `${rowLetter(r)}${c}`, category: rowCategories[r] ?? categories[0] });
      }
    }
    return out;
  }, [rows, cols, rowCategories, categories]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, categories, layout: { rows, cols, seats } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create venue");
      router.push("/admin/venues");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Venue name</span>
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Address</span>
          <input required className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <p className="field-label mb-2">Seat categories</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="badge">
              {c}
              <button type="button" onClick={() => removeCategory(c)} className="ml-0.5 opacity-60 hover:text-red-600 hover:opacity-100">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input max-w-[200px]"
            placeholder="Add category..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
          />
          <button type="button" onClick={addCategory} className="btn-secondary">
            Add
          </button>
        </div>
      </div>

      <div className="card grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Rows</span>
          <input
            type="number"
            min={1}
            max={26}
            className="input"
            value={rows}
            onChange={(e) => updateRows(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Seats per row</span>
          <input
            type="number"
            min={1}
            max={40}
            className="input"
            value={cols}
            onChange={(e) => setCols(Math.min(40, Math.max(1, Number(e.target.value))))}
          />
        </label>
      </div>

      <div className="card">
        <p className="field-label mb-3">Category per row</p>
        <div className="flex flex-col gap-1.5">
          {rowCategories.map((rc, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-6 font-mono muted">{rowLetter(i)}</span>
              <select
                className="input max-w-[160px]"
                value={rc}
                onChange={(e) =>
                  setRowCategories((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="field-label mb-3">Preview ({seats.length} seats)</p>
        <div className="overflow-x-auto">
          <div
            className="grid w-fit gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1.5rem))` }}
          >
            {seats.map((s) => (
              <div
                key={s.label}
                title={`${s.label} · ${s.category}`}
                className="flex h-6 w-6 items-center justify-center rounded border text-[8px]"
                style={{ borderColor: "var(--border)" }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={loading} type="submit" className="btn-primary w-fit">
        {loading ? "Creating..." : "Create venue"}
      </button>
    </form>
  );
}
