"use client";

import { useMemo } from "react";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import {
  buildCategoryMetaMap,
  getCategoryMeta,
  type CategoryMeta,
} from "@/lib/categories/labels";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import type { MonthCategoryTopCharge } from "@/lib/analytics";

type MonthlyCategoryRow = {
  month: string;
  category: string;
  total: number;
};

type MonthlyTotalRow = {
  month: string;
  total: number;
};

export function CategoryMonthlyTable({
  monthlyByCategory,
  monthlyTotals,
  topChargesByMonthCategory = [],
  currency = "PEN",
  categoryMeta,
}: {
  monthlyByCategory: MonthlyCategoryRow[];
  monthlyTotals: MonthlyTotalRow[];
  topChargesByMonthCategory?: MonthCategoryTopCharge[];
  currency?: string;
  categoryMeta?: Map<string, CategoryMeta>;
}) {
  const metaMap = useMemo(
    () => categoryMeta ?? buildCategoryMetaMap([]),
    [categoryMeta],
  );

  const { months, categories, lookup, monthTotals, maxByMonth, topChargeLookup } =
    useMemo(() => {
    const months = monthlyTotals.map((m) => m.month);
    const lookup = new Map<string, number>();
    const categoryTotals = new Map<string, number>();

    for (const row of monthlyByCategory) {
      lookup.set(`${row.month}|${row.category}`, row.total);
      categoryTotals.set(
        row.category,
        (categoryTotals.get(row.category) ?? 0) + row.total,
      );
    }

    const categories = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    const monthTotals = new Map(
      monthlyTotals.map((m) => [m.month, m.total] as const),
    );

    const maxByMonth = new Map<string, number>();
    for (const month of months) {
      let maxVal = 0;
      for (const category of categories) {
        const total = lookup.get(`${month}|${category}`) ?? 0;
        if (total > maxVal) maxVal = total;
      }
      if (maxVal > 0) maxByMonth.set(month, maxVal);
    }

    const topChargeLookup = new Map<string, MonthCategoryTopCharge>(
      topChargesByMonthCategory.map((charge) => [
        `${charge.month}|${charge.category}`,
        charge,
      ]),
    );

    return { months, categories, lookup, monthTotals, maxByMonth, topChargeLookup };
  }, [monthlyByCategory, monthlyTotals, topChargesByMonthCategory]);

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-black/50 dark:text-white/50">
        No spending data for this period.
      </div>
    );
  }

  function cellTotal(month: string, category: string): number {
    return lookup.get(`${month}|${category}`) ?? 0;
  }

  function rowTotal(category: string): number {
    return months.reduce((sum, month) => sum + cellTotal(month, category), 0);
  }

  function formatCell(value: number): string {
    if (value === 0) return "—";
    return formatCurrency(value, currency);
  }

  function topChargeTooltip(month: string, category: string): string | undefined {
    const charge = topChargeLookup.get(`${month}|${category}`);
    if (!charge) return undefined;
    return `Top charge: ${charge.merchant} — ${formatCurrency(charge.amount, currency)} (${formatDate(charge.date)})`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm whitespace-nowrap">
        <thead className="border-b border-black/10 text-left text-black/60 dark:border-white/10 dark:text-white/60">
          <tr>
            <th className="sticky left-0 z-10 bg-white/95 py-2 pr-4 dark:bg-zinc-950/95 whitespace-nowrap">
              Category
            </th>
            {months.map((month) => (
              <th
                key={month}
                className="py-2 px-3 text-right whitespace-nowrap font-medium"
              >
                {formatMonth(month)}
              </th>
            ))}
            <th className="py-2 pl-3 text-right font-medium whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const meta = getCategoryMeta(category, metaMap);
            return (
              <tr
                key={category}
                className="border-b border-black/5 dark:border-white/5"
              >
                <td className="sticky left-0 z-10 bg-white/95 py-2 pr-4 dark:bg-zinc-950/95 whitespace-nowrap">
                  <CategoryBadge
                    emoji={meta.emoji}
                    label={meta.label}
                    color={meta.color}
                  />
                </td>
                {months.map((month) => {
                  const value = cellTotal(month, category);
                  const isColumnMax =
                    value > 0 && maxByMonth.get(month) === value;
                  return (
                  <td
                    key={month}
                    title={
                      isColumnMax ? topChargeTooltip(month, category) : undefined
                    }
                    className={`py-2 px-3 text-right tabular-nums whitespace-nowrap ${
                      isColumnMax
                        ? "bg-amber-100 font-semibold text-amber-950 ring-1 ring-inset ring-amber-300/70 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-700/60"
                        : "text-black/80 dark:text-white/80"
                    }`}
                  >
                    {formatCell(value)}
                  </td>
                  );
                })}
                <td className="py-2 pl-3 text-right tabular-nums font-medium whitespace-nowrap">
                  {formatCurrency(rowTotal(category), currency)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-black/10 font-medium dark:border-white/10">
            <td className="sticky left-0 z-10 bg-white/95 py-2 pr-4 dark:bg-zinc-950/95 whitespace-nowrap">
              Month total
            </td>
            {months.map((month) => (
              <td key={month} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                {formatCurrency(monthTotals.get(month) ?? 0, currency)}
              </td>
            ))}
            <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
              {formatCurrency(
                months.reduce((sum, month) => sum + (monthTotals.get(month) ?? 0), 0),
                currency,
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
