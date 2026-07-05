const LOCALES: Record<string, string> = {
  PEN: "es-PE",
  USD: "en-US",
  EUR: "de-DE",
};

export function formatCurrencyLabel(currency: string): string {
  if (currency === "PEN") return "S/.";
  if (currency === "USD") return "$";
  return currency;
}

export function formatCurrency(value: number, currency = "PEN"): string {
  const amount = formatAmount(value, currency);
  const symbol = formatCurrencyLabel(currency);
  if (currency === "USD") return `${symbol}${amount}`;
  if (currency === "PEN") return `${symbol} ${amount}`;
  return `${symbol} ${amount}`;
}

export function formatAmount(value: number, currency = "PEN"): string {
  const locale = LOCALES[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** UTC inclusive bounds for a YYYY-MM month (matches analytics month keys). */
export function monthRangeUtc(yyyymm: string): { from: string; to: string } {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) throw new Error(`Invalid month: ${yyyymm}`);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
