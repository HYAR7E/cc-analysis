import type { Currency, ParsedStatement, RawTxn } from "./types";
import { extractLinesPositioned, type PositionedLine } from "./extract";

const SPANISH_MONTHS: Record<string, number> = {
  Ene: 0,
  Feb: 1,
  Mar: 2,
  Abr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Ago: 7,
  Set: 8,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dic: 11,
};

const OP_TYPES = [
  "CONSUMO",
  "PAGO",
  "CARGO",
  "INTERES",
  "ITF",
  "ABONO",
  "DEVOLUCION",
];

const ROW_RE = new RegExp(
  String.raw`^(\d{2})([A-Z][a-z]{2})\s+(\d{2})([A-Z][a-z]{2})\s+(.+?)\s+(${OP_TYPES.join(
    "|",
  )})\s+([\d.,]+)(-?)$`,
);

const PERIOD_RE = /(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2})\/(\d{2})\/(\d{2,4})/;

function toFullYear(yy: number, anchorYear: number): number {
  if (yy >= 100) return yy;
  const century = Math.floor(anchorYear / 100) * 100;
  return century + yy;
}

function parseShortDate(
  day: string,
  monthAbbr: string,
  year: number,
): Date | null {
  const monthIdx = SPANISH_MONTHS[monthAbbr];
  if (monthIdx === undefined) return null;
  const d = Number(day);
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return new Date(Date.UTC(year, monthIdx, d));
}

function distanceToPeriod(d: Date, periodStart: Date, periodEnd: Date): number {
  if (d < periodStart) return periodStart.getTime() - d.getTime();
  if (d > periodEnd) return d.getTime() - periodEnd.getTime();
  return 0;
}

/**
 * Pick the year variant closest to the statement period (handles Dec/Jan spans).
 * Rows can fall slightly outside the period (e.g. a purchase made a few days
 * before periodStart but processed inside it), so the nearest year wins.
 */
function resolveDateInPeriod(
  day: string,
  monthAbbr: string,
  anchorYear: number,
  periodStart?: Date,
  periodEnd?: Date,
): Date | null {
  const primary = parseShortDate(day, monthAbbr, anchorYear);
  if (!primary || !periodStart || !periodEnd) return primary;

  let best = primary;
  let bestDistance = distanceToPeriod(primary, periodStart, periodEnd);
  for (const year of [anchorYear - 1, anchorYear + 1]) {
    const candidate = parseShortDate(day, monthAbbr, year);
    if (!candidate) continue;
    const distance = distanceToPeriod(candidate, periodStart, periodEnd);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function parseAmount(raw: string, negative: boolean): number | null {
  const cleaned = raw.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function parsePeriod(lines: string[]): {
  periodStart?: Date;
  periodEnd?: Date;
  year: number;
} {
  const now = new Date();
  for (const line of lines) {
    const m = PERIOD_RE.exec(line);
    if (!m) continue;
    const [, sd, sm, syRaw, ed, em, eyRaw] = m;
    const anchor = now.getUTCFullYear();
    const sy = toFullYear(Number(syRaw), anchor);
    const ey = toFullYear(Number(eyRaw), anchor);
    const periodStart = new Date(Date.UTC(sy, Number(sm) - 1, Number(sd)));
    const periodEnd = new Date(Date.UTC(ey, Number(em) - 1, Number(ed)));
    return { periodStart, periodEnd, year: ey };
  }
  return { year: now.getUTCFullYear() };
}

type SplitParts = {
  merchant: string;
  location?: string;
  country?: string;
};

const KNOWN_LOCATIONS = [
  "LIMA",
  "Lima",
  "Lince",
  "San Isidro",
  "Miraflores",
  "MIRAFLORES",
  "La Molina",
  "Jesus Maria",
  "Surco",
  "Surquillo",
  "Barranco",
  "San Borja",
  "San Miguel",
  "Magdalena",
  "Pueblo Libre",
  "Chorrillos",
  "Callao",
  "Jockey Plaza",
];

function splitMerchant(desc: string): SplitParts {
  const trimmed = desc.trim();
  const countryMatch = /^(.*?)\s+([A-Z]{2})$/.exec(trimmed);
  if (!countryMatch) {
    return { merchant: trimmed };
  }
  const [, beforeCountry, country] = countryMatch;
  const before = beforeCountry.trim();

  const sorted = [...KNOWN_LOCATIONS].sort((a, b) => b.length - a.length);
  for (const loc of sorted) {
    if (before.endsWith(` ${loc}`) || before === loc) {
      const merchant =
        before === loc ? loc : before.slice(0, -loc.length).trim();
      if (!merchant) {
        return { merchant: loc, country };
      }
      return { merchant, location: loc, country };
    }
  }
  return { merchant: before, country };
}

/**
 * Determine currency from the X position of the amount token on the line.
 *
 * BCP Visa statements have two amount columns:
 *   - Soles   (PEN): amount printed at X ≈ 470–500
 *   - Dólares (USD): amount printed at X ≈ 525–555
 *
 * `dollarThresholdX` is the midpoint between the two column headers,
 * computed per-page by `extractLinesPositioned`.
 */
function currencyFromColumn(
  amountX: number | null,
  dollarThresholdX: number,
): Currency {
  if (amountX === null) return "PEN"; // fallback
  return amountX >= dollarThresholdX ? "USD" : "PEN";
}

/** Parse a flat list of positioned lines into transactions. */
function parseLines(
  lines: PositionedLine[],
  dollarThresholdX: number,
  periodStart: Date | undefined,
  periodEnd: Date | undefined,
  year: number,
): RawTxn[] {
  const transactions: RawTxn[] = [];

  for (const { text, amountX } of lines) {
    const line = text.trim();
    if (!line) continue;
    const m = ROW_RE.exec(line);
    if (!m) continue;

    const [, procDay, procMonth, opDay, opMonth, descRaw, opType, amountStr, sign] = m;

    const procDate = resolveDateInPeriod(
      procDay,
      procMonth,
      year,
      periodStart,
      periodEnd,
    );
    const opDate = resolveDateInPeriod(
      opDay,
      opMonth,
      year,
      periodStart,
      periodEnd,
    );
    const chargeDate = opDate ?? procDate;
    if (!chargeDate) continue;

    const amount = parseAmount(amountStr, sign === "-");
    if (amount === null || amount <= 0) continue;

    const { merchant, location, country } = splitMerchant(descRaw);
    if (!merchant) continue;

    transactions.push({
      date: chargeDate,
      operationDate: procDate ?? undefined,
      merchant,
      location,
      country,
      operationType: opType,
      amount,
      currency: currencyFromColumn(amountX, dollarThresholdX),
      rawLine: line,
    });
  }

  return transactions;
}

/**
 * Parse a BCP Visa PDF statement buffer into structured transactions.
 *
 * Currency (PEN / USD) is determined entirely by the X position of each
 * transaction's amount token relative to the "Soles" / "Dólares" column
 * headers detected on each page — no country-code heuristics needed.
 */
export async function parseStatement(
  bufferOrText: Buffer | string,
  password?: string,
): Promise<ParsedStatement> {
  // Support the legacy string-based call path used by tests / scripts.
  if (typeof bufferOrText === "string") {
    const text = bufferOrText;
    const allLines: string[] = text.split(/\r?\n/);
    const { periodStart, periodEnd, year } = parsePeriod(allLines);
    // No positional data — fall back to country-code heuristic for currency.
    const posLines: PositionedLine[] = allLines.map((l) => ({
      text: l,
      amountX: null,
    }));
    // 520 is a safe mid-point for a 595pt page; amountX null → always PEN via fallback
    const transactions = parseLines(posLines, 520, periodStart, periodEnd, year);
    return { periodStart, periodEnd, transactions };
  }

  // Primary path: Buffer → pdfjs positional extraction.
  const pages = await extractLinesPositioned(bufferOrText, password);
  const allLines = pages.flatMap((pg) => pg.lines.map((l) => l.text));
  const { periodStart, periodEnd, year } = parsePeriod(allLines);

  const transactions: RawTxn[] = [];
  for (const { dollarThresholdX, lines } of pages) {
    transactions.push(
      ...parseLines(lines, dollarThresholdX, periodStart, periodEnd, year),
    );
  }

  return { periodStart, periodEnd, transactions };
}
