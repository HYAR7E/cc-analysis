import { DEFAULT_CATEGORIES } from "./defaults";
import {
  getCategoryAppearance,
  OTHER_CATEGORY_COLOR,
  OTHER_CATEGORY_EMOJI,
  type CategoryAppearance,
} from "./theme";

export type CategoryMeta = CategoryAppearance & {
  label: string;
};

const DEFAULT_META = new Map<string, CategoryMeta>(
  DEFAULT_CATEGORIES.map((c) => [
    c.name,
    { label: c.label, emoji: c.emoji, color: c.color },
  ]),
);

export function buildCategoryLabelMap(
  categories: { name: string; label: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, meta] of DEFAULT_META) {
    map.set(name, meta.label);
  }
  for (const c of categories) {
    map.set(c.name, c.label);
  }
  return map;
}

export function buildCategoryMetaMap(
  categories: {
    name: string;
    label: string;
    emoji?: string;
    color?: string;
  }[],
): Map<string, CategoryMeta> {
  const map = new Map(DEFAULT_META);
  categories.forEach((c, index) => {
    const appearance = getCategoryAppearance(c.name, c, index);
    map.set(c.name, {
      label: c.label,
      emoji: appearance.emoji,
      color: appearance.color,
    });
  });
  return map;
}

export function getCategoryLabel(
  name: string,
  labelMap: Map<string, string>,
): string {
  return labelMap.get(name) ?? formatCategorySlug(name);
}

export function getCategoryMeta(
  name: string,
  metaMap: Map<string, CategoryMeta>,
): CategoryMeta {
  const stored = metaMap.get(name);
  if (stored) return stored;
  const appearance = getCategoryAppearance(name);
  return {
    label: formatCategorySlug(name),
    emoji: appearance.emoji,
    color: appearance.color,
  };
}

function formatCategorySlug(name: string): string {
  return name
    .split(/[-_]/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export type CategorySpendSlice = {
  category: string;
  label: string;
  emoji: string;
  color: string;
  total: number;
  pct: number;
};

const MAX_SLICES = 8;
const OTHER_KEY = "__other__";

export function prepareCategorySpendData(
  data: { category: string; total: number }[],
  metaMap: Map<string, CategoryMeta>,
): CategorySpendSlice[] {
  const positive = data.filter((d) => d.total > 0);
  if (positive.length === 0) return [];

  const grandTotal = positive.reduce((s, d) => s + d.total, 0);
  if (grandTotal === 0) return [];

  const sorted = [...positive].sort((a, b) => b.total - a.total);

  let slices: { category: string; total: number }[];
  if (sorted.length <= MAX_SLICES) {
    slices = sorted;
  } else {
    const top = sorted.slice(0, MAX_SLICES - 1);
    const otherTotal = sorted
      .slice(MAX_SLICES - 1)
      .reduce((s, d) => s + d.total, 0);
    slices = [...top, { category: OTHER_KEY, total: otherTotal }];
  }

  return slices.map(({ category, total }) => {
    if (category === OTHER_KEY) {
      return {
        category,
        label: "Other",
        emoji: OTHER_CATEGORY_EMOJI,
        color: OTHER_CATEGORY_COLOR,
        total,
        pct: (total / grandTotal) * 100,
      };
    }
    const meta = getCategoryMeta(category, metaMap);
    return {
      category,
      label: meta.label,
      emoji: meta.emoji,
      color: meta.color,
      total,
      pct: (total / grandTotal) * 100,
    };
  });
}
