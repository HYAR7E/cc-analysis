"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { MonthlyBar } from "@/components/charts/MonthlyBar";
import { CategoryMonthlyTable } from "@/components/CategoryMonthlyTable";
import { buildCategoryMetaMap } from "@/lib/categories/labels";
import { useCategories } from "@/lib/useCategories";
import type { AnalyticsPayload } from "@/lib/analytics";

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

const MONTHS_BACK = 12;

function CurrencySection({
  title,
  data,
  currency,
  categoryMetaMap,
}: {
  title: string;
  data: AnalyticsPayload;
  currency: "PEN" | "USD";
  categoryMetaMap: ReturnType<typeof buildCategoryMetaMap>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <Card>
        <CardTitle>Monthly spend by category (last 12 months)</CardTitle>
        <MonthlyBar
          monthlyByCategory={data.monthlyByCategory}
          monthlyTotals={data.monthlyTotals}
          currency={currency}
          categoryMeta={categoryMetaMap}
        />
      </Card>
      <Card>
        <CardTitle>Spend by category and month</CardTitle>
        <CategoryMonthlyTable
          monthlyByCategory={data.monthlyByCategory}
          monthlyTotals={data.monthlyTotals}
          topChargesByMonthCategory={data.topChargesByMonthCategory}
          currency={currency}
          categoryMeta={categoryMetaMap}
        />
      </Card>
    </div>
  );
}

export function YearlyReport() {
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
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
    setError(null);

    async function load() {
      try {
        const currencyParam = viewMode === "ALL" ? "ALL" : viewMode;
        const res = await fetch(
          `/api/analytics?months=${MONTHS_BACK}&currency=${currencyParam}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (viewMode === "ALL") {
          setMixedData(json as MixedAnalytics);
          setSingleData(null);
        } else {
          setSingleData(json as SingleAnalytics);
          setMixedData(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [viewMode]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Yearly spend report</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Rolling 12-month totals by category
          </p>
        </div>
        <div className="inline-flex rounded-md border border-black/10 p-1 text-sm dark:border-white/10">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.code}
              type="button"
              onClick={() => setViewMode(mode.code)}
              className={`rounded px-3 py-1 ${
                viewMode === mode.code
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-black/50 dark:text-white/50">
          Loading report...
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-600">{error}</div>
      ) : viewMode === "ALL" && mixedData ? (
        <div className="space-y-10">
          <CurrencySection
            title="Soles (S/)"
            data={mixedData.pen}
            currency="PEN"
            categoryMetaMap={categoryMetaMap}
          />
          <CurrencySection
            title="Dólares (US$)"
            data={mixedData.usd}
            currency="USD"
            categoryMetaMap={categoryMetaMap}
          />
        </div>
      ) : singleData ? (
        <CurrencySection
          title={
            singleData.currency === "PEN" ? "Soles (S/)" : "Dólares (US$)"
          }
          data={singleData}
          currency={singleData.currency}
          categoryMetaMap={categoryMetaMap}
        />
      ) : (
        <div className="py-12 text-center text-sm text-red-600">No data</div>
      )}
    </div>
  );
}
