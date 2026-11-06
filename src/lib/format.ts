// Money is in Bolivian Pesos. Clean, no-decimal display: "Bs 48,000".
const bo = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });

export function formatPrice(amount: number): string {
  return `Bs ${bo.format(Math.round(amount))}`;
}

/** Legacy `material` field from the old catalog is sometimes a filler string. */
export function visiblePack(material: string | null | undefined): string | null {
  if (!material || /f[oó]rmula|matem[aá]tica/i.test(material)) return null;
  return material;
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Saved per product vs the compare-at price, or null when not on sale. */
export function savingsOf(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return compareAt - price;
}

/** "12 Oct 2026" (or "12 Oct" with `year: false`, plus "3:05 pm" with `time: true`). */
export function formatDate(
  date: Date | string,
  { year = true, time = false }: { year?: boolean; time?: boolean } = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (year) opts.year = "numeric";
  if (time) Object.assign(opts, { hour: "numeric", minute: "2-digit" });
  return time ? d.toLocaleString("es-BO", opts) : d.toLocaleDateString("es-BO", opts);
}
