"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAmount, formatCurrency, formatCurrencyLabel, formatDate, formatMonth, monthRangeUtc } from "@/lib/format";
import { useCategories } from "@/lib/useCategories";
import { categoryDisplayLabel, CategoryDot } from "@/components/ui/CategoryBadge";
import { getCategoryMeta, buildCategoryMetaMap } from "@/lib/categories/labels";

type Row = {
  id: string;
  date: string;
  merchant: string;
  location: string | null;
  country: string | null;
  operationType: string | null;
  description: string | null;
  amount: string;
  currency: string;
  category: string;
  statementFileName: string;
};

const NEW_CATEGORY_SENTINEL = "__new_category__";

function formatSelectedSums(
  totals: Map<string, number>,
  filterCurrency?: "PEN" | "USD",
): string {
  if (filterCurrency) {
    return formatCurrency(totals.get(filterCurrency) ?? 0, filterCurrency);
  }

  const parts: string[] = [];
  const pen = totals.get("PEN") ?? 0;
  const usd = totals.get("USD") ?? 0;
  if (pen > 0) parts.push(formatCurrency(pen, "PEN"));
  if (usd > 0) parts.push(formatCurrency(usd, "USD"));

  for (const [cur, amount] of totals) {
    if (cur !== "PEN" && cur !== "USD" && amount > 0) {
      parts.push(formatCurrency(amount, cur));
    }
  }

  return parts.length > 0 ? parts.join(" · ") : formatCurrency(0, "PEN");
}

export function TransactionsTable({
  currency,
  month,
}: {
  currency?: "PEN" | "USD";
  month?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category") ?? "";
  const setCategoryFilter = useCallback(
    (category: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (category) params.set("category", category);
      else params.delete("category");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { categories, allCategories, createCategory, reload: reloadCategories } =
    useCategories();

  const categoryMetaMap = useMemo(
    () => buildCategoryMetaMap(allCategories),
    [allCategories],
  );

  const buildQueryString = useCallback(
    (cursor?: string) => {
      const qs = new URLSearchParams({ limit: "50" });
      if (currency) qs.set("currency", currency);
      if (categoryFilter) qs.set("category", categoryFilter);
      if (month) {
        const { from, to } = monthRangeUtc(month);
        qs.set("from", from);
        qs.set("to", to);
      }
      if (cursor) qs.set("cursor", cursor);
      return qs.toString();
    },
    [currency, categoryFilter, month],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions?${buildQueryString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.transactions ?? []);
      setNextCursor(data.nextCursor ?? null);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/transactions?${buildQueryString(nextCursor)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newRows: Row[] = data.transactions ?? [];
      setRows((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...newRows.filter((r) => !existingIds.has(r.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildQueryString]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!categoryFilter) return;
    const selected = allCategories.find((c) => c.name === categoryFilter);
    if (selected?.hidden) setCategoryFilter("");
  }, [allCategories, categoryFilter, setCategoryFilter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;
  const selectedCount = selectedIds.size;
  const selectedTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!selectedIds.has(row.id)) continue;
      totals.set(
        row.currency,
        (totals.get(row.currency) ?? 0) + Number(row.amount),
      );
    }
    return totals;
  }, [rows, selectedIds]);
  const isSaving = bulkSaving || savingId !== null;

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllPage = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageIds));
    }
  }, [allPageSelected, pageIds]);

  const applyCategoryToRow = useCallback(
    async (id: string, category: string) => {
      setSavingId(id);
      const prev = rows;
      const targetMerchant = rows
        .find((r) => r.id === id)
        ?.merchant.toUpperCase();
      setRows((r) =>
        r.map((x) =>
          targetMerchant && x.merchant.toUpperCase() === targetMerchant
            ? { ...x, category }
            : x,
        ),
      );
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            createRule: true,
            applyToMerchant: true,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        const count = Number(json.updatedCount ?? 1);
        setToast(
          count > 1
            ? `Applied "${category}" to ${count} transactions`
            : `Set to "${category}"`,
        );
        await reloadCategories();
      } catch (e) {
        setRows(prev);
        setError(
          e instanceof Error ? e.message : "Failed to update category",
        );
      } finally {
        setSavingId(null);
      }
    },
    [rows, reloadCategories],
  );

  const applyBulkCategory = useCallback(async () => {
    if (!bulkCategory || selectedCount === 0) return;
    setBulkSaving(true);
    const ids = [...selectedIds];
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          category: bulkCategory,
          createRule: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const count = Number(json.updatedCount ?? ids.length);
      setToast(`Applied "${bulkCategory}" to ${count} selected transactions`);
      setSelectedIds(new Set());
      setBulkCategory("");
      await reloadCategories();
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to bulk update categories",
      );
    } finally {
      setBulkSaving(false);
    }
  }, [bulkCategory, selectedCount, selectedIds, reloadCategories, load]);

  async function handleSelectChange(id: string, value: string) {
    if (value === NEW_CATEGORY_SENTINEL) {
      const label = window.prompt("New category name:");
      if (!label || !label.trim()) return;
      try {
        const created = await createCategory(label.trim());
        await applyCategoryToRow(id, created.name);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to create category",
        );
      }
      return;
    }
    await applyCategoryToRow(id, value);
  }

  const filterBar = (
    <div className="mb-4 flex items-center gap-2">
      <label
        htmlFor="category-filter"
        className="text-sm text-black/60 dark:text-white/60"
      >
        Category
      </label>
      <select
        id="category-filter"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="border border-black/10 dark:border-white/10 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {categoryDisplayLabel(c)}
          </option>
        ))}
      </select>
    </div>
  );

  async function handleBulkCategoryChange(value: string) {
    if (value === NEW_CATEGORY_SENTINEL) {
      const label = window.prompt("New category name:");
      if (!label || !label.trim()) return;
      try {
        const created = await createCategory(label.trim());
        setBulkCategory(created.name);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to create category",
        );
      }
      return;
    }
    setBulkCategory(value);
  }

  if (loading) {
    return (
      <div>
        {filterBar}
        <div className="text-sm text-black/50 dark:text-white/50 py-8 text-center">
          Loading transactions...
        </div>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div>
        {filterBar}
        <div className="text-sm text-red-600 py-8 text-center">{error}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    const monthLabel = month ? formatMonth(month) : null;
    const emptyMessage = categoryFilter
      ? monthLabel
        ? `No transactions in ${monthLabel} for this category.`
        : "No transactions in this category."
      : monthLabel
        ? `No transactions in ${monthLabel}.`
        : "No transactions yet. Upload a PDF to get started.";
    return (
      <div>
        {filterBar}
        <div className="text-sm text-black/50 dark:text-white/50 py-8 text-center">
          {emptyMessage}
        </div>
      </div>
    );
  }

  const knownNames = new Set(categories.map((c) => c.name));

  return (
    <div className="overflow-x-auto relative pb-16">
      {filterBar}
      {toast && (
        <div className="absolute top-0 right-0 m-2 rounded-md bg-indigo-600 text-white text-xs px-3 py-2 shadow-lg z-20">
          {toast}
        </div>
      )}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 left-0 right-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/80 px-4 py-3 shadow-lg mb-3">
          <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
            {selectedCount} selected
          </span>
          <span className="text-sm tabular-nums text-indigo-800 dark:text-indigo-200">
            {formatSelectedSums(selectedTotals, currency)}
          </span>
          <select
            className="bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded px-2 py-1.5 text-sm disabled:opacity-50"
            value={bulkCategory}
            disabled={isSaving}
            onChange={(e) => handleBulkCategoryChange(e.target.value)}
          >
            <option value="">Choose category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {categoryDisplayLabel(c)}
              </option>
            ))}
            <option value={NEW_CATEGORY_SENTINEL}>+ New category…</option>
          </select>
          <button
            type="button"
            className="rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 disabled:opacity-50 hover:bg-indigo-700"
            disabled={isSaving || !bulkCategory}
            onClick={applyBulkCategory}
          >
            Apply to {selectedCount} selected
          </button>
          <button
            type="button"
            className="text-sm text-indigo-700 dark:text-indigo-300 hover:underline disabled:opacity-50"
            disabled={isSaving}
            onClick={() => {
              setSelectedIds(new Set());
              setBulkCategory("");
            }}
          >
            Clear
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
          <tr>
            <th className="py-2 pr-2 w-8">
              <input
                type="checkbox"
                className="rounded border-black/20 dark:border-white/20"
                checked={allPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = somePageSelected;
                }}
                disabled={isSaving}
                aria-label="Select all on this page"
                onChange={toggleAllPage}
              />
            </th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Merchant</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Currency</th>
            <th className="py-2 pr-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelected = selectedIds.has(r.id);
            return (
            <tr
              key={r.id}
              onClick={() => {
                if (!isSaving) toggleRow(r.id);
              }}
              className={`border-b border-black/5 dark:border-white/5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-indigo-50 dark:bg-indigo-950/50"
                  : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              }`}
            >
              <td
                className="py-2 pr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="rounded border-black/20 dark:border-white/20 cursor-pointer"
                  checked={isSelected}
                  disabled={isSaving}
                  aria-label={`Select ${r.merchant}`}
                  onChange={() => toggleRow(r.id)}
                />
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {formatDate(r.date)}
              </td>
              <td className="py-2 pr-4">{r.merchant}</td>
              <td
                className="py-2 pr-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="inline-flex items-center gap-2">
                  <CategoryDot
                    color={getCategoryMeta(r.category, categoryMetaMap).color}
                  />
                  <select
                    className="bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-1 text-xs disabled:opacity-50"
                    value={r.category}
                    disabled={isSaving}
                    onChange={(e) => handleSelectChange(r.id, e.target.value)}
                  >
                    {knownNames.has(r.category) ? null : (
                      <option value={r.category}>
                        {categoryDisplayLabel(
                          getCategoryMeta(r.category, categoryMetaMap),
                        )}
                      </option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {categoryDisplayLabel(c)}
                      </option>
                    ))}
                    <option value={NEW_CATEGORY_SENTINEL}>
                      + New category…
                    </option>
                  </select>
                </div>
              </td>
              <td className="py-2 pr-4 text-xs uppercase text-black/60 dark:text-white/60">
                {formatCurrencyLabel(r.currency)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {formatAmount(Number(r.amount), r.currency)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {(nextCursor || loadingMore) && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {loadingMore ? (
            <div className="text-sm text-black/50 dark:text-white/50 py-2">
              Loading more...
            </div>
          ) : (
            <button
              type="button"
              className="rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              disabled={isSaving}
              onClick={loadMore}
            >
              Load more
            </button>
          )}
          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
