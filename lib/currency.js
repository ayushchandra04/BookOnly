/** Formats an amount as Indian rupees, e.g. 1250 -> "₹1,250.00". */
export function formatPrice(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0.00";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Whole-rupee variant for tight spots like card badges, e.g. 1250 -> "₹1,250". */
export function formatPriceShort(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
