"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteVenueButton({ venueId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this venue? This only works if it has no events scheduled.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/venues/${venueId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete venue");
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button disabled={busy} onClick={handleDelete} className="text-xs text-red-600 hover:underline">
      Delete
    </button>
  );
}
