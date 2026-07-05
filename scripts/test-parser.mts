import fs from "node:fs";
import { extractText } from "../src/lib/pdf/extract";
import { parseStatement } from "../src/lib/pdf/parser";

async function main() {
  const buf = fs.readFileSync("samples/bcp-marzo.PDF");
  const text = await extractText(buf, "<your-DNI-number-used-as-password-by-your-bank>");
  const parsed = parseStatement(text);
  console.log(
    "period:",
    parsed.periodStart?.toISOString().slice(0, 10),
    "→",
    parsed.periodEnd?.toISOString().slice(0, 10),
  );
  console.log("txn count:", parsed.transactions.length);
  const byCur = parsed.transactions.reduce(
    (a, t) => {
      a[t.currency] = (a[t.currency] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  console.log("by currency:", byCur);
  const byCountry = parsed.transactions.reduce(
    (a, t) => {
      const k = t.country || "(none)";
      a[k] = (a[k] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  console.log("by country:", byCountry);
  console.log("---- first 10 ----");
  for (const t of parsed.transactions.slice(0, 10)) {
    console.log(
      t.date.toISOString().slice(0, 10),
      t.currency,
      t.country ?? "--",
      "|",
      t.merchant,
      "|",
      t.location ?? "",
      "|",
      t.operationType,
      t.amount,
    );
  }
  console.log("---- last 10 ----");
  for (const t of parsed.transactions.slice(-10)) {
    console.log(
      t.date.toISOString().slice(0, 10),
      t.currency,
      t.country ?? "--",
      "|",
      t.merchant,
      "|",
      t.location ?? "",
      "|",
      t.operationType,
      t.amount,
    );
  }
  const sumPEN = parsed.transactions
    .filter((t) => t.currency === "PEN")
    .reduce((a, t) => a + t.amount, 0);
  const sumUSD = parsed.transactions
    .filter((t) => t.currency === "USD")
    .reduce((a, t) => a + t.amount, 0);
  console.log("sum PEN:", sumPEN.toFixed(2));
  console.log("sum USD:", sumUSD.toFixed(2));
}

main();
