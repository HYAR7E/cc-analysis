"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import {
  buildCategoryMetaMap,
  prepareCategorySpendData,
  type CategoryMeta,
  type CategorySpendSlice,
} from "@/lib/categories/labels";
import { categoryDisplayLabel } from "@/components/ui/CategoryBadge";

function CategoryTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CategorySpendSlice }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  if (!slice) return null;
  return (
    <div className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white shadow-lg">
      <div className="font-medium">{categoryDisplayLabel(slice)}</div>
      <div className="tabular-nums text-white/80">
        {formatCurrency(slice.total, currency)} ({slice.pct.toFixed(1)}%)
      </div>
    </div>
  );
}

export function CategoryPie({
  data,
  currency = "PEN",
  categoryMeta,
}: {
  data: { category: string; total: number }[];
  currency?: string;
  categoryMeta?: Map<string, CategoryMeta>;
}) {
  const metaMap = useMemo(
    () => categoryMeta ?? buildCategoryMetaMap([]),
    [categoryMeta],
  );

  const slices = useMemo(
    () => prepareCategorySpendData(data, metaMap),
    [data, metaMap],
  );

  if (slices.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-black/50 dark:text-white/50">
        No spending this month
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="label"
            innerRadius={50}
            outerRadius={90}
          >
            {slices.map((slice) => (
              <Cell key={slice.category} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => (
              <CategoryTooltip
                active={active}
                payload={payload}
                currency={currency}
              />
            )}
          />
          <Legend
            formatter={(_value: string, entry) => {
              const slice = entry.payload as CategorySpendSlice | undefined;
              if (!slice) return _value;
              return `${categoryDisplayLabel(slice)} (${slice.pct.toFixed(0)}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
