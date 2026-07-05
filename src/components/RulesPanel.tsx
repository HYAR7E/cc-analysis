"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";

type Rule = {
  id: string;
  pattern: string;
  category: string;
  priority: number;
  createdAt: string;
};

type PreviewSample = {
  id: string;
  merchant: string;
  category: string;
  date: string;
};

type PreviewState = {
  pattern: string;
  count: number;
  samples: PreviewSample[];
  loading: boolean;
  error: string | null;
};

const EMPTY_PREVIEW: PreviewState = {
  pattern: "",
  count: 0,
  samples: [],
  loading: false,
  error: null,
};

function usePreview(pattern: string, currentCategory: string) {
  const [state, setState] = useState<PreviewState>(EMPTY_PREVIEW);

  useEffect(() => {
    const trimmed = pattern.trim();
    if (!trimmed) {
      setState(EMPTY_PREVIEW);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const handle = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ pattern: trimmed, limit: "10" });
        const res = await fetch(`/api/rules/preview?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setState({
          pattern: trimmed,
          count: data.count ?? 0,
          samples: data.samples ?? [],
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          pattern: trimmed,
          count: 0,
          samples: [],
          loading: false,
          error: e instanceof Error ? e.message : "Failed to preview",
        });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [pattern]);

  const conflictCount = useMemo(
    () =>
      state.samples.filter(
        (s) => s.category && s.category !== currentCategory,
      ).length,
    [state.samples, currentCategory],
  );

  return { ...state, conflictCount };
}

function PreviewCard({
  pattern,
  currentCategory,
}: {
  pattern: string;
  currentCategory: string;
}) {
  const preview = usePreview(pattern, currentCategory);
  if (!pattern.trim()) return null;

  return (
    <div className="mt-2 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-xs">
      {preview.loading ? (
        <span className="text-black/50 dark:text-white/50">Previewing…</span>
      ) : preview.error ? (
        <span className="text-red-600">{preview.error}</span>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span>
              Would match <strong>{preview.count}</strong> transaction
              {preview.count === 1 ? "" : "s"} (
              {preview.samples.length} distinct merchant
              {preview.samples.length === 1 ? "" : "s"} shown)
            </span>
            {preview.conflictCount > 0 && (
              <span className="text-amber-600">
                {preview.conflictCount} already in another category
              </span>
            )}
          </div>
          {preview.samples.length > 0 && (
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {preview.samples.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="font-mono truncate">{s.merchant}</span>
                  <span
                    className={
                      s.category === currentCategory
                        ? "text-black/50 dark:text-white/50"
                        : "text-amber-600"
                    }
                  >
                    {s.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  onSaved,
  onDeleted,
  saving,
  setSaving,
}: {
  rule: Rule;
  onSaved: (next: Rule) => void;
  onDeleted: (id: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pattern, setPattern] = useState(rule.pattern);
  const [priority, setPriority] = useState(String(rule.priority));
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setPattern(rule.pattern);
    setPriority(String(rule.priority));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern,
          priority: Number(priority) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const updated: Rule = await res.json();
      onSaved(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete pattern "${rule.pattern}"? Existing transactions keep their current category — only future ingests are affected.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onDeleted(rule.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-black/5 dark:border-white/5 align-top">
        <td className="py-2 pr-3" colSpan={4}>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value.toUpperCase())}
                className="flex-1 font-mono text-xs bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-1"
                placeholder="PATTERN"
              />
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-20 text-xs bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-1"
                placeholder="priority"
              />
              <button
                onClick={save}
                disabled={saving || !pattern.trim()}
                className="text-xs bg-indigo-600 text-white rounded px-3 py-1 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="text-xs border border-black/10 dark:border-white/10 rounded px-3 py-1"
              >
                Cancel
              </button>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <PreviewCard pattern={pattern} currentCategory={rule.category} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      <td className="py-2 pr-3 font-mono text-xs">{rule.pattern}</td>
      <td className="py-2 pr-3 text-xs tabular-nums">{rule.priority}</td>
      <td className="py-2 pr-3 text-xs text-black/50 dark:text-white/50 whitespace-nowrap">
        {formatDate(rule.createdAt)}
      </td>
      <td className="py-2 pr-3 text-right">
        <button
          onClick={startEdit}
          disabled={saving}
          className="text-xs underline mr-3 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={saving}
          className="text-xs text-red-600 underline disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function AddRuleRow({
  categoryName,
  onAdded,
}: {
  categoryName: string;
  onAdded: (rule: Rule) => void;
}) {
  const [pattern, setPattern] = useState("");
  const [priority, setPriority] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = pattern.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: trimmed,
          category: categoryName,
          priority: Number(priority) || 100,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created: Rule = await res.json();
      onAdded(created);
      setPattern("");
      setPriority("100");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-black/15 dark:border-white/15 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value.toUpperCase())}
          placeholder="Add pattern (e.g. STARBUCKS)"
          className="flex-1 font-mono text-xs bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-1"
        />
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-20 text-xs bg-transparent border border-black/10 dark:border-white/10 rounded px-2 py-1"
          placeholder="priority"
        />
        <button
          onClick={submit}
          disabled={saving || !pattern.trim()}
          className="text-xs bg-indigo-600 text-white rounded px-3 py-1 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <PreviewCard pattern={pattern} currentCategory={categoryName} />
    </div>
  );
}

export function RulesPanel({
  categoryName,
  onRuleCountChange,
}: {
  categoryName: string;
  onRuleCountChange?: (delta: number) => void;
}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ category: categoryName });
      const res = await fetch(`/api/rules?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => {
    load();
  }, [load]);

  function handleAdded(rule: Rule) {
    setRules((prev) =>
      [...prev, rule].sort(
        (a, b) =>
          a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
      ),
    );
    onRuleCountChange?.(1);
  }

  function handleSaved(next: Rule) {
    setRules((prev) =>
      prev
        .map((r) => (r.id === next.id ? next : r))
        .sort(
          (a, b) =>
            a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
        ),
    );
  }

  function handleDeleted(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    onRuleCountChange?.(-1);
  }

  return (
    <div className="space-y-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-black/60 dark:text-white/60">
          Patterns match anywhere in the merchant string, case-insensitive —
          not regex. Lower priority is evaluated first; defaults seed
          priorities 5–40.
        </div>
      </div>
      {loading ? (
        <div className="text-xs text-black/50 dark:text-white/50">
          Loading rules…
        </div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : rules.length === 0 ? (
        <div className="text-xs text-black/50 dark:text-white/50">
          No patterns yet. Add one below — or assign this category to a
          transaction from the dashboard, which auto-creates a pattern for that
          merchant.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
              <tr>
                <th className="py-2 pr-3">Pattern</th>
                <th className="py-2 pr-3 w-20">Priority</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  saving={saving}
                  setSaving={setSaving}
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddRuleRow categoryName={categoryName} onAdded={handleAdded} />
    </div>
  );
}
