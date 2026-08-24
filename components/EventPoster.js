"use client";

import { useState } from "react";
import { posterGradient } from "@/lib/posterGradient";

const TYPE_ICON = { movie: "🎬", concert: "🎵" };

/**
 * Poster artwork for an event: the organiser's image when they supplied one,
 * otherwise a deterministic gradient + type icon so cards never look empty.
 *
 * Plain <img> rather than next/image because the URL is arbitrary user input,
 * which would otherwise require whitelisting every possible remote host. Since
 * such a URL can 404, expire, or be hotlink-blocked by the host, a load failure
 * falls back to the same gradient rather than leaving a broken image.
 */
export default function EventPoster({
  title = "",
  posterUrl = "",
  type,
  className = "",
  zoomOnHover = false,
  eager = false, // set for above-the-fold hero art so it isn't deferred
}) {
  const [failed, setFailed] = useState(false);
  const zoom = zoomOnHover ? "group-hover:scale-105" : "";

  if (posterUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={posterUrl}
        alt={title}
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-transform duration-500 ${zoom} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center transition-transform duration-500 ${zoom} ${className}`}
      style={{ background: posterGradient(title) }}
    >
      <span className="text-5xl opacity-40 drop-shadow">{TYPE_ICON[type] ?? "🎟️"}</span>
    </div>
  );
}
