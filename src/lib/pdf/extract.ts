import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";

// Lazily configure the pdfjs worker once per process.
let workerConfigured = false;
function ensureWorker() {
  if (workerConfigured) return;
  workerConfigured = true;
  try {
    // Resolve the worker path using the CommonJS require machinery, which
    // works correctly in both Next.js API routes and standalone scripts.
    const req = createRequire(import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = req.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
  } catch {
    // Fallback: pdfjs will attempt its own worker resolution.
  }
}

type RawItem = { str: string; transform: number[]; width: number };

type PageItem = { str: string; x: number; y: number };

/** A single logical text line reconstructed from pdfjs items on one page. */
export type PositionedLine = {
  /** Full text of the line (items joined in left-to-right order). */
  text: string;
  /**
   * X coordinate of the numeric amount token on this line, if one exists.
   * null when the line has no amount (e.g. headers, labels, blank lines).
   */
  amountX: number | null;
};

/** Currency column thresholds detected from a single page. */
type PageColumnInfo = {
  /** X midpoint between the "Soles" and "Dólares" column headers. */
  dollarThresholdX: number;
  lines: PositionedLine[];
};

const AMOUNT_RE = /^\d[\d,]*\.\d{2}-?$/;

function groupByY(items: PageItem[], tolerance = 2): PageItem[][] {
  const rows: PageItem[][] = [];
  for (const it of items) {
    const row = rows.find((r) => Math.abs(r[0].y - it.y) <= tolerance);
    if (row) {
      row.push(it);
    } else {
      rows.push([it]);
    }
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

function buildPageColumnInfo(rawItems: RawItem[], _pageWidth: number): PageColumnInfo {
  const items: PageItem[] = rawItems
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))
    .filter((it) => it.str !== "");

  // Detect column boundary from "Soles" / "Dólares" header labels.
  // Take the rightmost occurrence per label in case there are repeats (headers
  // can appear once per table section on a page).
  let solesX: number | null = null;
  let dolaresX: number | null = null;
  for (const it of items) {
    const s = it.str.trim();
    if (s === "Soles") solesX = solesX === null ? it.x : Math.max(solesX, it.x);
    if (/^D[oó]lares$/.test(s)) dolaresX = dolaresX === null ? it.x : Math.max(dolaresX, it.x);
  }

  // Fallback: use the bimodal split of amount X positions on this page.
  // Amounts in the right ~35% of the 595pt page belong to one of the two columns.
  let dollarThresholdX = 520; // safe default for 595pt BCP Visa statements
  if (solesX !== null && dolaresX !== null) {
    dollarThresholdX = (solesX + dolaresX) / 2;
  } else if (solesX !== null || dolaresX !== null) {
    // Only one header found — still better than a fixed guess
    const known = (solesX ?? dolaresX)!;
    dollarThresholdX = known + 30;
  }

  // Reconstruct lines and record the X position of any amount token.
  const rows = groupByY(items);
  const lines: PositionedLine[] = rows.map((row) => {
    const text = row.map((it) => it.str).join("");
    const amountItem = row.find((it) => AMOUNT_RE.test(it.str.trim()));
    return { text, amountX: amountItem?.x ?? null };
  });

  return { dollarThresholdX, lines };
}

/**
 * Extract positioned text lines from every page of a PDF.
 * Each line carries the X position of its numeric amount token so that
 * the parser can determine which column (Soles / Dólares) it belongs to.
 */
export async function extractLinesPositioned(
  buffer: Buffer,
  password?: string,
): Promise<PageColumnInfo[]> {
  ensureWorker();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: PageColumnInfo[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push(
      buildPageColumnInfo(tc.items as RawItem[], vp.width),
    );
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

/** Legacy plain-text extraction (kept for compatibility). */
export async function extractText(
  buffer: Buffer,
  password?: string,
): Promise<string> {
  const pages = await extractLinesPositioned(buffer, password);
  return pages
    .map((pg) => pg.lines.map((l) => l.text).join("\n"))
    .join("\n");
}
