"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type Category = {
  id: string;
  name: string;
  label: string;
  emoji: string;
  color: string;
  isSystem: boolean;
  hidden: boolean;
  createdAt: string;
  transactionCount: number;
  ruleCount: number;
};

export function visibleCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.hidden);
}

type UseCategoriesOptions = {
  /** When true, `categories` includes hidden rows (for the categories admin page). */
  includeHidden?: boolean;
};

export function useCategories(options: UseCategoriesOptions = {}) {
  const includeHidden = options.includeHidden ?? false;
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => (includeHidden ? allCategories : visibleCategories(allCategories)),
    [allCategories, includeHidden],
  );

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAllCategories(data.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setAllCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  const removeCategory = useCallback((id: string) => {
    setAllCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const adjustCategoryCounts = useCallback(
    (
      name: string,
      delta: { transactions?: number; rules?: number },
    ) => {
      setAllCategories((prev) =>
        prev.map((c) => {
          if (c.name !== name) return c;
          return {
            ...c,
            transactionCount: Math.max(
              0,
              c.transactionCount + (delta.transactions ?? 0),
            ),
            ruleCount: Math.max(0, c.ruleCount + (delta.rules ?? 0)),
          };
        }),
      );
    },
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const createCategory = useCallback(
    async (label: string): Promise<Category> => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created: Category = await res.json();
      setAllCategories((prev) =>
        [...prev, created].sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
          return a.label.localeCompare(b.label);
        }),
      );
      return created;
    },
    [],
  );

  return {
    categories,
    allCategories,
    loading,
    error,
    reload,
    createCategory,
    updateCategory,
    removeCategory,
    adjustCategoryCounts,
  };
}
