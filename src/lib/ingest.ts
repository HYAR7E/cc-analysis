import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { parseStatement } from "./pdf/parser";
import { categorizeAll, loadRules } from "./categorizer";
import { isPositiveCharge } from "./transactions";

export const rawTxnSchema = z.object({
  date: z.date(),
  operationDate: z.date().optional(),
  merchant: z.string().min(1),
  location: z.string().optional(),
  country: z.string().optional(),
  operationType: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().finite(),
  currency: z.enum(["PEN", "USD"]),
  rawLine: z.string().optional(),
});

export type IngestResult =
  | {
      status: "ok";
      statementId: string;
      transactionsInserted: number;
      duplicates: number;
    }
  | {
      status: "duplicate";
      statementId: string;
      reason: "hash" | "period";
      existingFileName: string;
      periodStart?: Date;
      periodEnd?: Date;
    }
  | { status: "error"; error: string };

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function ingestPdf(
  fileName: string,
  buffer: Buffer,
  password?: string,
): Promise<IngestResult> {
  const fileHash = sha256(buffer);

  const existing = await prisma.statement.findUnique({ where: { fileHash } });
  if (existing) {
    return {
      status: "duplicate",
      statementId: existing.id,
      reason: "hash",
      existingFileName: existing.fileName,
    };
  }

  const parsed = await parseStatement(buffer, password);

  // Same statement re-downloaded has different bytes, so also dedupe by period.
  if (parsed.periodStart && parsed.periodEnd) {
    const samePeriod = await prisma.statement.findFirst({
      where: { periodStart: parsed.periodStart, periodEnd: parsed.periodEnd },
    });
    if (samePeriod) {
      return {
        status: "duplicate",
        statementId: samePeriod.id,
        reason: "period",
        existingFileName: samePeriod.fileName,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      };
    }
  }

  const valid = parsed.transactions.flatMap((t) => {
    const r = rawTxnSchema.safeParse(t);
    return r.success && isPositiveCharge(r.data.amount) ? [r.data] : [];
  });

  const rules = await loadRules();
  const categorized = categorizeAll(valid, rules);

  const statement = await prisma.statement.create({
    data: {
      fileName,
      fileHash,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      transactions: {
        create: categorized.map((t) => ({
          date: t.date,
          operationDate: t.operationDate,
          merchant: t.merchant,
          location: t.location,
          country: t.country,
          operationType: t.operationType,
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          rawLine: t.rawLine,
        })),
      },
    },
    include: { transactions: true },
  });

  return {
    status: "ok",
    statementId: statement.id,
    transactionsInserted: statement.transactions.length,
    duplicates: 0,
  };
}
