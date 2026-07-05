"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency, formatMonth } from "@/lib/format";
import {
  buildCategoryMetaMap,
  getCategoryMeta,
  type CategoryMeta,
} from "@/lib/categories/labels";
import { categoryDisplayLabel } from "@/components/ui/CategoryBadge";
import { OTHER_CATEGORY_COLOR } from "@/lib/categories/theme";

function MonthlyBarTooltip({
  active,
  payload,
  label,
  currency,
  metaMap,
  hiddenCategories,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  currency: string;
  metaMap: Map<string, CategoryMeta>;
  hiddenCategories: Set<string>;
}) {
  if (!active || !payload?.length) return null;

  const items = payload.filter(
    (item) =>
      Number(item.value) > 0 &&
      !hiddenCategories.has(String(item.name)),
  );
  if (items.length === 0) return null;

  return (
    <div className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white shadow-lg">
      <div className="mb-1 font-medium">{formatMonth(String(label))}</div>
      <div className="space-y-1">
        {items.map((item) => {
          const meta = getCategoryMeta(String(item.name), metaMap);
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                {categoryDisplayLabel(meta)}
              </span>
              <span className="tabular-nums text-white/80">
                {formatCurrency(Number(item.value), currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyBar({
  monthlyByCategory,
  monthlyTotals,
  currency = "PEN",
  categoryMeta,
}: {
  monthlyByCategory: { month: string; category: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
  currency?: string;
  categoryMeta?: Map<string, CategoryMeta>;
}) {
  const metaMap = useMemo(
    () => categoryMeta ?? buildCategoryMetaMap([]),
    [categoryMeta],
  );
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleCategory = useCallback((category: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const months = monthlyTotals.map((m) => m.month);
  const categories = Array.from(
    new Set(monthlyByCategory.map((r) => r.category)),
  ).sort();

  const data = months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const cat of categories) {
      row[cat] =
        monthlyByCategory.find((r) => r.month === month && r.category === cat)
          ?.total ?? 0;
    }
    return row;
  });

  if (categories.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-black/50 dark:text-white/50">
        No data yet
      </div>
    );
  }

  return (
    <div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
            <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} />
            <YAxis
              tickFormatter={(v) => `${currency === "USD" ? "$" : "S/"}${v}`}
              fontSize={12}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <MonthlyBarTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  currency={currency}
                  metaMap={metaMap}
                  hiddenCategories={hiddenCategories}
                />
              )}
            />
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat, metaMap);
              return (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="spend"
                  fill={meta.color ?? OTHER_CATEGORY_COLOR}
                  hide={hiddenCategories.has(cat)}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
        {categories.map((cat) => {
          const meta = getCategoryMeta(cat, metaMap);
          const hidden = hiddenCategories.has(cat);
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={!hidden}
              onClick={() => toggleCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-opacity ${
                hidden
                  ? "opacity-40 line-through"
                  : "opacity-100 hover:opacity-80"
              }`}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                style={{ backgroundColor: meta.color ?? OTHER_CATEGORY_COLOR }}
                aria-hidden
              />
              {categoryDisplayLabel(meta)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
