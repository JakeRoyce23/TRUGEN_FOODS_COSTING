import Decimal from "decimal.js";

// Keep decimal strings at the UI boundary; converting them to Number loses centavos
// for large values. Rounding is explicit, independent of Decimal's global settings.
export function formatMoney(value: string | null): string {
  if (value === null) return "—";
  const amount = new Decimal(value);
  if (!amount.isFinite()) return "—";
  const [whole, fraction] = amount.toFixed(2, Decimal.ROUND_HALF_UP).split(".");
  return `₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
