"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { RulesPanel } from "@/components/RulesPanel";
import { useCategories, type Category } from "@/lib/useCategories";
import { CategoryBadge, categoryDisplayLabel } from "@/components/ui/CategoryBadge";
import { isValidCategoryColor } from "@/lib/categories/theme";

function AddCategoryForm({
  onCreated,
}: {
  onCreated: (label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreated(label.trim());
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 flex-wrap text-sm"
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New category label (e.g. Pets)"
        className="flex-1 min-w-[14rem] bg-transparent border border-black/10 dark:border-white/10 rounded px-3 py-1.5"
      />
      <button
        type="submit"
        disabled={saving || !label.trim()}
        className="bg-indigo-600 text-white rounded px-3 py-1.5 disabled:opacity-50"
      >
        Add category
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}

function DeleteDialog({
  category,
  categories,
  onClose,
  onConfirm,
}: {
  category: Category;
  categories: Category[];
  onClose: () => void;
  onConfirm: (fallback: string) => Promise<void>;
}) {
  const candidates = categories.filter((c) => c.name !== category.name);
  const [fallback, setFallback] = useState(
    candidates.find((c) => c.name === "uncategorized")?.name ??
      candidates[0]?.name ??
      "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!fallback) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(fallback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full mx-4 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Delete &quot;{category.label}&quot;</h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          Reassign {category.transactionCount} transaction
          {category.transactionCount === 1 ? "" : "s"} and{" "}
          {category.ruleCount} pattern
          {category.ruleCount === 1 ? "" : "s"} to:
        </p>
        <select
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          className="w-full bg-transparent border border-black/10 dark:border-white/10 rounded px-3 py-2"
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.name}>
              {categoryDisplayLabel(c)}
            </option>
          ))}
        </select>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-black/10 dark:border-white/10 rounded"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={saving || !fallback}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50"
          >
            Delete &amp; reassign
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  categories,
  onUpdated,
  onDeleted,
  onRuleCountChange,
}: {
  category: Category;
  categories: Category[];
  onUpdated: (
    id: string,
    patch: Partial<Pick<Category, "label" | "emoji" | "color" | "hidden">>,
  ) => void;
  onDeleted: (
    id: string,
    fallback: string,
    reassigned: { transactions: number; rules: number },
  ) => void;
  onRuleCountChange: (delta: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [label, setLabel] = useState(category.label);
  const [emoji, setEmoji] = useState(category.emoji);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!renaming) setLabel(category.label);
  }, [category.label, renaming]);

  useEffect(() => {
    if (!editingStyle) {
      setEmoji(category.emoji);
      setColor(category.color);
    }
  }, [category.emoji, category.color, editingStyle]);

  async function patchCategory(
    body: Partial<Pick<Category, "label" | "emoji" | "color" | "hidden">>,
  ) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const bodyJson = await res.json().catch(() => ({}));
        throw new Error(bodyJson.error ?? `HTTP ${res.status}`);
      }
      const updated: Pick<Category, "label" | "emoji" | "color" | "hidden"> =
        await res.json();
      onUpdated(category.id, updated);
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function saveLabel() {
    if (!label.trim() || label === category.label) {
      setRenaming(false);
      return;
    }
    try {
      await patchCategory({ label: label.trim() });
      setRenaming(false);
    } catch {
      /* error shown inline */
    }
  }

  async function saveStyle() {
    const nextEmoji = emoji.trim();
    const nextColor = color.trim();
    if (!nextEmoji) {
      setError("Emoji is required");
      return;
    }
    if (!isValidCategoryColor(nextColor)) {
      setError("Use a #RRGGBB hex color");
      return;
    }
    if (nextEmoji === category.emoji && nextColor === category.color) {
      setEditingStyle(false);
      return;
    }
    try {
      await patchCategory({ emoji: nextEmoji, color: nextColor });
      setEditingStyle(false);
    } catch {
      /* error shown inline */
    }
  }

  async function confirmDelete(fallback: string) {
    const qs = new URLSearchParams({ fallback });
    const res = await fetch(
      `/api/categories/${category.id}?${qs.toString()}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const result: {
      reassignedTransactions: number;
      reassignedRules: number;
    } = await res.json();
    setDeleteOpen(false);
    onDeleted(category.id, fallback, {
      transactions: result.reassignedTransactions ?? 0,
      rules: result.reassignedRules ?? 0,
    });
  }

  async function toggleHidden() {
    setSaving(true);
    setError(null);
    try {
      await patchCategory({ hidden: !category.hidden });
    } catch {
      /* error shown inline */
    }
  }

  return (
    <>
      <tr
        className={`border-b border-black/5 dark:border-white/5 align-top ${
          category.hidden ? "opacity-60" : ""
        }`}
      >
        <td className="py-3 pr-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs underline mr-2"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
          {renaming ? (
            <span className="inline-flex gap-1 items-center">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveLabel();
                  if (e.key === "Escape") {
                    setRenaming(false);
                    setLabel(category.label);
                  }
                }}
                autoFocus
                className="text-sm bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-0.5"
              />
              <button
                onClick={saveLabel}
                disabled={saving}
                className="text-xs underline"
              >
                Save
              </button>
            </span>
          ) : editingStyle ? (
            <div className="inline-flex flex-wrap items-center gap-2 mt-1">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={8}
                className="w-14 text-center text-sm bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-0.5"
                aria-label="Emoji"
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-black/10 dark:border-white/10 bg-transparent"
                aria-label="Color"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-24 font-mono text-xs bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-0.5"
                aria-label="Hex color"
              />
              <button
                onClick={saveStyle}
                disabled={saving}
                className="text-xs underline"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingStyle(false);
                  setEmoji(category.emoji);
                  setColor(category.color);
                }}
                disabled={saving}
                className="text-xs underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <CategoryBadge
              emoji={category.emoji}
              label={category.label}
              color={category.color}
              className="font-medium"
            />
          )}
          {category.isSystem && (
            <span className="ml-2 text-[10px] uppercase tracking-wide bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5">
              system
            </span>
          )}
          {category.hidden && (
            <span className="ml-2 text-[10px] uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 rounded px-1.5 py-0.5">
              hidden
            </span>
          )}
        </td>
        <td className="py-3 pr-4 font-mono text-xs text-black/60 dark:text-white/60">
          {category.name}
        </td>
        <td className="py-3 pr-4 text-right tabular-nums text-xs">
          {category.transactionCount}
        </td>
        <td className="py-3 pr-4 text-right tabular-nums text-xs">
          {category.ruleCount}
        </td>
        <td className="py-3 pr-4 text-center">
          <button
            type="button"
            onClick={toggleHidden}
            disabled={saving || renaming || editingStyle}
            className={`text-xs underline disabled:opacity-50 ${
              category.hidden
                ? "text-amber-700 dark:text-amber-300"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            {category.hidden ? "Show" : "Hide"}
          </button>
        </td>
        <td className="py-3 pr-4 text-right">
          {!renaming && !editingStyle && (
            <>
              <button
                onClick={() => setRenaming(true)}
                className="text-xs underline mr-3"
              >
                Rename
              </button>
              <button
                onClick={() => setEditingStyle(true)}
                className="text-xs underline mr-3"
              >
                Style
              </button>
            </>
          )}
          {!category.isSystem && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-xs text-red-600 underline"
            >
              Delete
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="text-xs text-red-600 pb-2">
            {error}
          </td>
        </tr>
      )}
      {expanded && (
        <tr>
          <td colSpan={6} className="pb-4 pr-4">
            <RulesPanel
              categoryName={category.name}
              onRuleCountChange={onRuleCountChange}
            />
          </td>
        </tr>
      )}
      {deleteOpen && (
        <DeleteDialog
          category={category}
          categories={categories}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

export function CategoryManager() {
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    removeCategory,
    adjustCategoryCounts,
  } = useCategories({ includeHidden: true });

  async function handleCreate(label: string) {
    await createCategory(label);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Add category</CardTitle>
        <AddCategoryForm onCreated={handleCreate} />
      </Card>
      <Card>
        <CardTitle>Categories &amp; patterns</CardTitle>
        {loading ? (
          <div className="text-sm text-black/50 dark:text-white/50 py-6 text-center">
            Loading categories…
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 py-6 text-center">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4 text-right">Transactions</th>
                  <th className="py-2 pr-4 text-right">Patterns</th>
                  <th className="py-2 pr-4 text-center">Visible</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    categories={categories}
                    onUpdated={(id, patch) => updateCategory(id, patch)}
                    onDeleted={(id, fallback, reassigned) => {
                      removeCategory(id);
                      adjustCategoryCounts(fallback, {
                        transactions: reassigned.transactions,
                        rules: reassigned.rules,
                      });
                    }}
                    onRuleCountChange={(delta) =>
                      adjustCategoryCounts(c.name, { rules: delta })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
