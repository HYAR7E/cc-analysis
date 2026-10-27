import { prisma } from "./prisma";

export type CurrencySummary = {
  count: number;
  total: number;
};

export type StatementSummary = {
  id: string;
  fileName: string;
  fileHashShort: string;
  uploadedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  transactionCount: number;
  pen: CurrencySummary;
  usd: CurrencySummary;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
  /** Other statements whose period overlaps this one. */
  overlapsWith: { id: string; fileName: string }[];
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  return Number(String(value));
}

function periodsOverlap(
  a: { periodStart: Date | null; periodEnd: Date | null },
  b: { periodStart: Date | null; periodEnd: Date | null },
): boolean {
  if (!a.periodStart || !a.periodEnd || !b.periodStart || !b.periodEnd) {
    return false;
  }
  return a.periodStart <= b.periodEnd && b.periodStart <= a.periodEnd;
}

export async function getStatementSummaries(): Promise<StatementSummary[]> {
  const [statements, groups] = await Promise.all([
    prisma.statement.findMany({ orderBy: { uploadedAt: "desc" } }),
    prisma.transaction.groupBy({
      by: ["statementId", "currency"],
      _count: { _all: true },
      _sum: { amount: true },
      _min: { date: true },
      _max: { date: true },
    }),
  ]);

  const byStatement = new Map<string, typeof groups>();
  for (const g of groups) {
    const list = byStatement.get(g.statementId) ?? [];
    list.push(g);
    byStatement.set(g.statementId, list);
  }

  return statements.map((s) => {
    const pen: CurrencySummary = { count: 0, total: 0 };
    const usd: CurrencySummary = { count: 0, total: 0 };
    let first: Date | null = null;
    let last: Date | null = null;

    for (const g of byStatement.get(s.id) ?? []) {
      const target = g.currency === "USD" ? usd : pen;
      target.count += g._count._all;
      target.total += toNumber(g._sum.amount);
      if (g._min.date && (!first || g._min.date < first)) first = g._min.date;
      if (g._max.date && (!last || g._max.date > last)) last = g._max.date;
    }

    return {
      id: s.id,
      fileName: s.fileName,
      fileHashShort: s.fileHash.slice(0, 12),
      uploadedAt: s.uploadedAt.toISOString(),
      periodStart: s.periodStart?.toISOString() ?? null,
      periodEnd: s.periodEnd?.toISOString() ?? null,
      transactionCount: pen.count + usd.count,
      pen,
      usd,
      firstTransactionDate: first?.toISOString() ?? null,
      lastTransactionDate: last?.toISOString() ?? null,
      overlapsWith: statements
        .filter((other) => other.id !== s.id && periodsOverlap(s, other))
        .map((other) => ({ id: other.id, fileName: other.fileName })),
    };
  });
}
