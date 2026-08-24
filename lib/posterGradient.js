const PALETTES = [
  ["#6d28d9", "#ec4899"],
  ["#0891b2", "#6d28d9"],
  ["#f59e0b", "#dc2626"],
  ["#059669", "#0891b2"],
  ["#db2777", "#f59e0b"],
  ["#4f46e5", "#059669"],
];

/** Deterministic gradient for a title, so the same event always gets the same "poster" look. */
export function posterGradient(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const [from, to] = PALETTES[hash % PALETTES.length];
  const angle = 100 + (hash % 60);
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
