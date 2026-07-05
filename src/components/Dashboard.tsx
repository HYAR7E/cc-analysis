"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { CategoryPie } from "@/components/charts/CategoryPie";
import { MonthlyBar } from "@/components/charts/MonthlyBar";
import { TransactionsTable } from "@/components/TransactionsTable";
import { formatCurrency, formatMonth } from "@/lib/format";
import { currentUtcMonthKey, type AnalyticsPayload } from "@/lib/analytics";
import { useCategories } from "@/lib/useCategories";
import {
  buildCategoryMetaMap,
  getCategoryMeta,
} from "@/lib/categories/labels";
import { CategoryBadge } from "@/components/ui/CategoryBadge";

type SingleAnalytics = AnalyticsPayload & { currency: "PEN" | "USD" };

type MixedAnalytics = {
  currency: "ALL";
  selectedMonth: string;
  pen: AnalyticsPayload;
  usd: AnalyticsPayload;
};

type ViewMode = "ALL" | "PEN" | "USD";

const VIEW_MODES: { code: ViewMode; label: string }[] = [
  { code: "ALL", label: "All" },
  { code: "PEN", label: "Soles (S/)" },
  { code: "USD", label: "Dólares (US$)" },
];

const MONTH_KEY_RE = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function parseMonthFromUrl(param: string | null): string {
  if (param && MONTH_KEY_RE.test(param)) return param;
  return currentUtcMonthKey();
}

function previousMonthKey(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const py = d.getUTCFullYear();
  const pm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${py}-${pm}`;
}

function deltaLabel(delta: number | null, selectedMonth: string): string {
  if (delta === null) return "—";
  const prev = formatMonth(previousMonthKey(selectedMonth));
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs ${prev}`;
}

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-black/50 dark:text-white/50";
  return delta > 0 ? "text-red-600" : "text-green-600";
}

function CurrencyTotal({
  amount,
  currency,
  delta,
  selectedMonth,
}: {
  amount: number;
  currency: "PEN" | "USD";
  delta?: number | null;
  selectedMonth?: string;
}) {
  return (
    <div className={delta !== undefined ? "mt-2 first:mt-0" : ""}>
      <div className="text-2xl font-semibold tabular-nums">
        {formatCurrency(amount, currency)}
      </div>
      {delta !== undefined && selectedMonth && (
        <div className={`text-xs mt-1 ${deltaClass(delta)}`}>
          {deltaLabel(delta, selectedMonth)}
        </div>
      )}
    </div>
  );
}

function TopCategoryCard({
  data,
  currency,
  categoryMetaMap,
}: {
  data: AnalyticsPayload;
  currency: "PEN" | "USD";
  categoryMetaMap: Map<
    string,
    { label: string; emoji: string; color: string }
  >;
}) {
  const top = data.categoryTotalsCurrentMonth.find((c) => c.total > 0);
  const topMeta = top
    ? getCategoryMeta(top.category, categoryMetaMap)
    : null;
  const monthLabel = formatMonth(data.selectedMonth);

  return (
    <Card>
      <CardTitle>Top category ({monthLabel})</CardTitle>
      {top && topMeta ? (
        <>
          <div className="text-2xl font-semibold">
            <CategoryBadge
              emoji={topMeta.emoji}
              label={topMeta.label}
              color={topMeta.color}
            />
          </div>
          <div className="text-xs mt-1 text-black/50 dark:text-white/50 tabular-nums">
            {formatCurrency(top.total, currency)}
          </div>
        </>
      ) : (
        <div className="text-2xl font-semibold">—</div>
      )}
    </Card>
  );
}

function MixedTopCategoryCard({
  pen,
  usd,
  categoryMetaMap,
}: {
  pen: AnalyticsPayload;
  usd: AnalyticsPayload;
  categoryMetaMap: Map<
    string,
    { label: string; emoji: string; color: string }
  >;
}) {
  const penTop = pen.categoryTotalsCurrentMonth.find((c) => c.total > 0);
  const usdTop = usd.categoryTotalsCurrentMonth.find((c) => c.total > 0);
  const penMeta = penTop
    ? getCategoryMeta(penTop.category, categoryMetaMap)
    : null;
  const usdMeta = usdTop
    ? getCategoryMeta(usdTop.category, categoryMetaMap)
    : null;
  const monthLabel = formatMonth(pen.selectedMonth);

  return (
    <Card>
      <CardTitle>Top category ({monthLabel})</CardTitle>
      <div className="space-y-3 mt-1">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            Soles
          </div>
          {penMeta ? (
            <>
              <CategoryBadge
                emoji={penMeta.emoji}
                label={penMeta.label}
                color={penMeta.color}
                className="font-semibold"
              />
              <div className="text-xs text-black/50 dark:text-white/50 tabular-nums mt-0.5">
                {formatCurrency(penTop!.total, "PEN")}
              </div>
            </>
          ) : (
            <div className="font-semibold">—</div>
          )}
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50 mb-0.5">
            Dólares
          </div>
          {usdMeta ? (
            <>
              <CategoryBadge
                emoji={usdMeta.emoji}
                label={usdMeta.label}
                color={usdMeta.color}
                className="font-semibold"
              />
              <div className="text-xs text-black/50 dark:text-white/50 tabular-nums mt-0.5">
                {formatCurrency(usdTop!.total, "USD")}
              </div>
            </>
          ) : (
            <div className="font-semibold">—</div>
          )}
        </div>
      </div>
    </Card>
  );
}

function SingleCurrencyDashboard({
  data,
  currency,
  categoryMetaMap,
}: {
  data: AnalyticsPayload;
  currency: "PEN" | "USD";
  categoryMetaMap: Map<
    string,
    { label: string; emoji: string; color: string }
  >;
}) {
  const monthLabel = formatMonth(data.selectedMonth);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>{monthLabel}</CardTitle>
          <CurrencyTotal
            amount={data.currentMonthTotal}
            currency={currency}
            delta={data.deltaPct}
            selectedMonth={data.selectedMonth}
          />
        </Card>
        <TopCategoryCard
          data={data}
          currency={currency}
          categoryMetaMap={categoryMetaMap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Spend by category ({monthLabel})</CardTitle>
          <CategoryPie
            data={data.categoryTotalsCurrentMonth}
            currency={currency}
            categoryMeta={categoryMetaMap}
          />
        </Card>
        <Card>
          <CardTitle>Monthly spend (last 6 months)</CardTitle>
          <MonthlyBar
            monthlyByCategory={data.monthlyByCategory}
            monthlyTotals={data.monthlyTotals}
            currency={currency}
            categoryMeta={categoryMetaMap}
          />
        </Card>
      </div>
    </>
  );
}

function MixedCurrencyDashboard({
  pen,
  usd,
  categoryMetaMap,
}: {
  pen: AnalyticsPayload;
  usd: AnalyticsPayload;
  categoryMetaMap: Map<
    string,
    { label: string; emoji: string; color: string }
  >;
}) {
  const monthLabel = formatMonth(pen.selectedMonth);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>{monthLabel}</CardTitle>
          <div className="space-y-1">
            <CurrencyTotal
              amount={pen.currentMonthTotal}
              currency="PEN"
              delta={pen.deltaPct}
              selectedMonth={pen.selectedMonth}
            />
            <CurrencyTotal
              amount={usd.currentMonthTotal}
              currency="USD"
              delta={usd.deltaPct}
              selectedMonth={usd.selectedMonth}
            />
          </div>
        </Card>
        <MixedTopCategoryCard
          pen={pen}
          usd={usd}
          categoryMetaMap={categoryMetaMap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Spend by category — Soles ({monthLabel})</CardTitle>
          <CategoryPie
            data={pen.categoryTotalsCurrentMonth}
            currency="PEN"
            categoryMeta={categoryMetaMap}
          />
        </Card>
        <Card>
          <CardTitle>Spend by category — Dólares ({monthLabel})</CardTitle>
          <CategoryPie
            data={usd.categoryTotalsCurrentMonth}
            currency="USD"
            categoryMeta={categoryMetaMap}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Monthly spend — Soles (last 6 months)</CardTitle>
          <MonthlyBar
            monthlyByCategory={pen.monthlyByCategory}
            monthlyTotals={pen.monthlyTotals}
            currency="PEN"
            categoryMeta={categoryMetaMap}
          />
        </Card>
        <Card>
          <CardTitle>Monthly spend — Dólares (last 6 months)</CardTitle>
          <MonthlyBar
            monthlyByCategory={usd.monthlyByCategory}
            monthlyTotals={usd.monthlyTotals}
            currency="USD"
            categoryMeta={categoryMetaMap}
          />
        </Card>
      </div>
    </>
  );
}

export function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const selectedMonth = useMemo(
    () => parseMonthFromUrl(searchParams.get("month")),
    [searchParams],
  );
  const setSelectedMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );
  const [singleData, setSingleData] = useState<SingleAnalytics | null>(null);
  const [mixedData, setMixedData] = useState<MixedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categories } = useCategories();

  const categoryMetaMap = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const currencyParam = viewMode === "ALL" ? "ALL" : viewMode;
        const res = await fetch(
          `/api/analytics?months=6&currency=${currencyParam}&month=${selectedMonth}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (viewMode === "ALL") {
          const mixed = json as MixedAnalytics;
          setMixedData(mixed);
          setSingleData(null);
        } else {
          const single = json as SingleAnalytics;
          setSingleData(single);
          setMixedData(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedMonth]);

  const tableCurrency = viewMode === "ALL" ? undefined : viewMode;
  const monthLabel = formatMonth(selectedMonth);
  const tableTitle =
    viewMode === "ALL"
      ? `Transactions (${monthLabel})`
      : `Transactions (${monthLabel}, ${viewMode === "PEN" ? "S/" : "US$"})`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-black/60 dark:text-white/60">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <div className="inline-flex rounded-md border border-black/10 dark:border-white/10 p-1 text-sm">
            {VIEW_MODES.map((m) => (
              <button
                key={m.code}
                onClick={() => setViewMode(m.code)}
                className={`px-3 py-1 rounded ${
                  viewMode === m.code
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50 py-12 text-center">
          Loading dashboard...
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-12 text-center">{error}</div>
      ) : viewMode === "ALL" && mixedData ? (
        <MixedCurrencyDashboard
          pen={mixedData.pen}
          usd={mixedData.usd}
          categoryMetaMap={categoryMetaMap}
        />
      ) : singleData ? (
        <SingleCurrencyDashboard
          data={singleData}
          currency={singleData.currency}
          categoryMetaMap={categoryMetaMap}
        />
      ) : (
        <div className="text-sm text-red-600 py-12 text-center">No data</div>
      )}

      <Card>
        <CardTitle>{tableTitle}</CardTitle>
        <TransactionsTable currency={tableCurrency} month={selectedMonth} />
      </Card>
    </div>
  );
}
