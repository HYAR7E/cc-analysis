/**
 * Clear statements/transactions and ingest all sample PDFs from samples/.
 *
 * Usage:
 *   npm run samples:load -- --password YOUR_PASSWORD
 *   SAMPLES_PDF_PASSWORD=YOUR_PASSWORD npm run samples:load
 *
 * PDF password is never stored in repo — pass via --password or SAMPLES_PDF_PASSWORD.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ingestPdf } from "../src/lib/ingest";

const SAMPLES_DIR = path.resolve(process.cwd(), "samples");
const prisma = new PrismaClient();

function parsePassword(): string {
  const flagIdx = process.argv.indexOf("--password");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    return process.argv[flagIdx + 1];
  }
  const fromEnv = process.env.SAMPLES_PDF_PASSWORD;
  if (fromEnv) return fromEnv;
  console.error(
    "Missing PDF password. Pass --password or set SAMPLES_PDF_PASSWORD.",
  );
  process.exit(1);
}

function listSamplePdfs(): string[] {
  const entries = fs.readdirSync(SAMPLES_DIR, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.toLowerCase().endsWith(".pdf") &&
        e.name !== "README.md",
    )
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

async function clearMovements(): Promise<{ statements: number; transactions: number }> {
  const [txCount, stmtCount] = await Promise.all([
    prisma.transaction.count(),
    prisma.statement.count(),
  ]);

  await prisma.statement.deleteMany();

  return { statements: stmtCount, transactions: txCount };
}

async function main() {
  const password = parsePassword();

  const cleared = await clearMovements();
  console.log(
    `Cleared ${cleared.statements} statement(s) and ${cleared.transactions} transaction(s).`,
  );

  const files = listSamplePdfs();
  if (files.length === 0) {
    console.error(`No PDF files found in ${SAMPLES_DIR}`);
    process.exit(1);
  }

  console.log(`Ingesting ${files.length} PDF(s) from samples/...\n`);

  let totalInserted = 0;
  let failures = 0;

  for (const fileName of files) {
    const filePath = path.join(SAMPLES_DIR, fileName);
    const buffer = fs.readFileSync(filePath);

    try {
      const result = await ingestPdf(fileName, buffer, password);

      if (result.status === "ok") {
        totalInserted += result.transactionsInserted;
        console.log(
          `  ✓ ${fileName}: ${result.transactionsInserted} transaction(s) inserted`,
        );
      } else if (result.status === "duplicate") {
        console.log(`  ~ ${fileName}: duplicate (statement ${result.statementId})`);
      } else {
        failures++;
        console.error(`  ✗ ${fileName}: ${result.error}`);
      }
    } catch (err) {
      failures++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${fileName}: ${message}`);
    }
  }

  const [statements, transactions] = await Promise.all([
    prisma.statement.count(),
    prisma.transaction.count(),
  ]);

  console.log("\n--- Summary ---");
  console.log(`Files processed: ${files.length}`);
  console.log(`Failures: ${failures}`);
  console.log(`Statements in DB: ${statements}`);
  console.log(`Transactions in DB: ${transactions}`);
  console.log(`Transactions inserted this run: ${totalInserted}`);

  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
