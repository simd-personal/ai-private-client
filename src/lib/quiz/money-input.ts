/** Formats digits with US grouping while the user types (e.g. 12500000 → 12,500,000). */
export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Parses a display string (with or without commas) to a dollar amount. */
export function parseMoney(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Formats a numeric amount for controlled inputs (e.g. prefilled API estimate). */
export function formatMoneyAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}
