import { prisma } from "./prisma";
import { POSITIVE_CHARGE_FILTER } from "./transactions";
import { getHiddenCategoryNames } from "./categories/visibility";

export type MonthlyCategoryRow = {
  month: string;
  category: string;
  total: number;
};

export type MonthlyTotalRow = {
  month: string;
  total: number;
};

export type CategoryTotal = {
  category: string;
  total: number;
};

export type MonthCategoryTopCharge = {
  month: string;
  category: string;
  amount: number;
  merchant: string;
  date: string;
};

export type AnalyticsPayload = {
  selectedMonth: string;
  currentMonthTotal: number;
  previousMonthTotal: number;
  deltaPct: number | null;
  categoryTotalsCurrentMonth: CategoryTotal[];
  monthlyTotals: MonthlyTotalRow[];
  monthlyByCategory: MonthlyCategoryRow[];
  topChargesByMonthCategory: MonthCategoryTopCharge[];
};

export type MixedAnalyticsPayload = {
  currency: "ALL";
  selectedMonth: string;
  pen: AnalyticsPayload;
  usd: AnalyticsPayload;
};

export type SingleAnalyticsPayload = AnalyticsPayload & {
  currency: "PEN" | "USD";
};

type TransactionRow = {
  date: Date;
  amount: unknown;
  category: string;
  currency: string;
  merchant: string;
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && value !== null && "toString" in value) {
    return Number((value as { toString(): string }).toString());
  }
  return Number(value);
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

export function currentUtcMonthKey(): string {
  return monthKey(startOfMonthUtc(new Date()));
}

export function parseSelectedMonth(param?: string): Date {
  if (!param) return startOfMonthUtc(new Date());
  const match = /^(\d{4})-(\d{2})$/.exec(param.trim());
  if (!match) return startOfMonthUtc(new Date());
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return startOfMonthUtc(new Date());
  return new Date(Date.UTC(year, month - 1, 1));
}

function aggregateTransactions(
  transactions: TransactionRow[],
  monthsBack: number,
  rangeStart: Date,
  selectedMonthStart: Date,
  selectedNextMonthStart: Date,
  selectedPrevMonthStart: Date,
  hiddenCategoryNames: ReadonlySet<string> = new Set(),
): AnalyticsPayload {
  const selectedMonthKey = monthKey(selectedMonthStart);
  const previousMonthKey = monthKey(selectedPrevMonthStart);

  const categoryCurrent = new Map<string, number>();
  const monthlyTotalsMap = new Map<string, number>();
  const monthlyByCategoryMap = new Map<string, Map<string, number>>();
  const topChargeMap = new Map<
    string,
    { amount: number; merchant: string; date: Date }
  >();

  for (const t of transactions) {
    const amount = toNumber(t.amount);
    const mKey = monthKey(t.date);
    monthlyTotalsMap.set(mKey, (monthlyTotalsMap.get(mKey) ?? 0) + amount);

    if (hiddenCategoryNames.has(t.category)) continue;

    let byMonth = monthlyByCategoryMap.get(mKey);
    if (!byMonth) {
      byMonth = new Map<string, number>();
      monthlyByCategoryMap.set(mKey, byMonth);
    }
    byMonth.set(t.category, (byMonth.get(t.category) ?? 0) + amount);

    const topKey = `${mKey}|${t.category}`;
    const existingTop = topChargeMap.get(topKey);
    if (!existingTop || amount > existingTop.amount) {
      topChargeMap.set(topKey, {
        amount,
        merchant: t.merchant,
        date: t.date,
      });
    }

    if (t.date >= selectedMonthStart && t.date < selectedNextMonthStart) {
      categoryCurrent.set(
        t.category,
        (categoryCurrent.get(t.category) ?? 0) + amount,
      );
    }
  }

  const monthlyTotals: MonthlyTotalRow[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = addMonths(rangeStart, i);
    const key = monthKey(d);
    monthlyTotals.push({ month: key, total: monthlyTotalsMap.get(key) ?? 0 });
  }

  const monthlyByCategory: MonthlyCategoryRow[] = [];
  for (const [month, byCategory] of monthlyByCategoryMap.entries()) {
    for (const [category, total] of byCategory.entries()) {
      monthlyByCategory.push({ month, category, total });
    }
  }
  monthlyByCategory.sort((a, b) =>
    a.month === b.month
      ? a.category.localeCompare(b.category)
      : a.month.localeCompare(b.month),
  );

  const topChargesByMonthCategory: MonthCategoryTopCharge[] = [
    ...topChargeMap.entries(),
  ]
    .map(([key, charge]) => {
      const [month, category] = key.split("|");
      return {
        month,
        category,
        amount: charge.amount,
        merchant: charge.merchant,
        date: charge.date.toISOString(),
      };
    })
    .sort((a, b) =>
      a.month === b.month
        ? a.category.localeCompare(b.category)
        : a.month.localeCompare(b.month),
    );

  const currentMonthTotal = monthlyTotalsMap.get(selectedMonthKey) ?? 0;
  const previousMonthTotal = monthlyTotalsMap.get(previousMonthKey) ?? 0;

  const categoryTotalsCurrentMonth: CategoryTotal[] = [...categoryCurrent.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const deltaPct =
    previousMonthTotal === 0
      ? null
      : ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;

  return {
    selectedMonth: selectedMonthKey,
    currentMonthTotal,
    previousMonthTotal,
    deltaPct,
    categoryTotalsCurrentMonth,
    monthlyTotals,
    monthlyByCategory,
    topChargesByMonthCategory,
  };
}

async function fetchTransactionsInRange(monthsBack: number, monthParam?: string) {
  const now = new Date();
  const currentUtcMonthStart = startOfMonthUtc(now);
  const barChartNextMonthStart = addMonths(currentUtcMonthStart, 1);
  const barChartRangeStart = addMonths(currentUtcMonthStart, -(monthsBack - 1));

  const selectedMonthStart = parseSelectedMonth(monthParam);
  const selectedNextMonthStart = addMonths(selectedMonthStart, 1);
  const selectedPrevMonthStart = addMonths(selectedMonthStart, -1);

  const fetchStart =
    selectedPrevMonthStart < barChartRangeStart
      ? selectedPrevMonthStart
      : barChartRangeStart;
  const fetchEnd =
    selectedNextMonthStart > barChartNextMonthStart
      ? selectedNextMonthStart
      : barChartNextMonthStart;

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: fetchStart, lt: fetchEnd },
      ...POSITIVE_CHARGE_FILTER,
    },
    select: {
      date: true,
      amount: true,
      category: true,
      currency: true,
      merchant: true,
    },
  });

  return {
    transactions,
    rangeStart: barChartRangeStart,
    selectedMonthStart,
    selectedNextMonthStart,
    selectedPrevMonthStart,
  };
}

export async function getAnalytics(
  monthsBack = 6,
  currency: "PEN" | "USD" = "PEN",
  monthParam?: string,
): Promise<AnalyticsPayload> {
  const {
    transactions,
    rangeStart,
    selectedMonthStart,
    selectedNextMonthStart,
    selectedPrevMonthStart,
  } = await fetchTransactionsInRange(monthsBack, monthParam);

  const hiddenCategoryNames = await getHiddenCategoryNames();
  const filtered = transactions.filter((t) => t.currency === currency);
  return aggregateTransactions(
    filtered,
    monthsBack,
    rangeStart,
    selectedMonthStart,
    selectedNextMonthStart,
    selectedPrevMonthStart,
    hiddenCategoryNames,
  );
}

export async function getMixedAnalytics(
  monthsBack = 6,
  monthParam?: string,
): Promise<MixedAnalyticsPayload> {
  const {
    transactions,
    rangeStart,
    selectedMonthStart,
    selectedNextMonthStart,
    selectedPrevMonthStart,
  } = await fetchTransactionsInRange(monthsBack, monthParam);

  const hiddenCategoryNames = await getHiddenCategoryNames();
  const pen = transactions.filter((t) => t.currency === "PEN");
  const usd = transactions.filter((t) => t.currency === "USD");

  const penPayload = aggregateTransactions(
    pen,
    monthsBack,
    rangeStart,
    selectedMonthStart,
    selectedNextMonthStart,
    selectedPrevMonthStart,
    hiddenCategoryNames,
  );

  return {
    currency: "ALL",
    selectedMonth: penPayload.selectedMonth,
    pen: penPayload,
    usd: aggregateTransactions(
      usd,
      monthsBack,
      rangeStart,
      selectedMonthStart,
      selectedNextMonthStart,
      selectedPrevMonthStart,
      hiddenCategoryNames,
    ),
  };
}
