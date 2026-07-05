/** Dark-mode-friendly palette (matches original chart colors). */
export const CHART_PALETTE = [
  "#6366f1",
  "#0891b2",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#0ea5e9",
] as const;

export const UNCategorized_COLOR = "#71717a";
export const UNCategorized_EMOJI = "📋";
export const OTHER_CATEGORY_COLOR = "#52525b";
export const OTHER_CATEGORY_EMOJI = "⋯";

export const DEFAULT_CATEGORY_EMOJI = "📁";
export const DEFAULT_CATEGORY_COLOR = CHART_PALETTE[0];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidCategoryColor(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

export function normalizeCategoryColor(color: string): string {
  return color.toLowerCase();
}

export type CategoryAppearance = {
  emoji: string;
  color: string;
};

const APPEARANCE_BY_NAME: Record<string, CategoryAppearance> = {
  food: { emoji: "🍽️", color: "#6366f1" },
  groceries: { emoji: "🛒", color: "#0891b2" },
  transport: { emoji: "🚗", color: "#16a34a" },
  travel: { emoji: "✈️", color: "#f59e0b" },
  subscriptions: { emoji: "📱", color: "#ef4444" },
  shopping: { emoji: "🛍️", color: "#a855f7" },
  services: { emoji: "🔧", color: "#ec4899" },
  business: { emoji: "💼", color: "#14b8a6" },
  utilities: { emoji: "💡", color: "#84cc16" },
  health: { emoji: "💊", color: "#0ea5e9" },
  fees: { emoji: "💸", color: "#f97316" },
  payments: { emoji: "💳", color: "#eab308" },
  uncategorized: { emoji: UNCategorized_EMOJI, color: UNCategorized_COLOR },
};

export function getDefaultCategoryAppearance(
  name: string,
  index = 0,
): CategoryAppearance {
  if (name === "uncategorized") {
    return { emoji: UNCategorized_EMOJI, color: UNCategorized_COLOR };
  }
  const preset = APPEARANCE_BY_NAME[name];
  if (preset) return preset;
  return {
    emoji: DEFAULT_CATEGORY_EMOJI,
    color: CHART_PALETTE[index % CHART_PALETTE.length],
  };
}

export function getCategoryAppearance(
  name: string,
  stored?: Partial<CategoryAppearance>,
  index = 0,
): CategoryAppearance {
  const defaults = getDefaultCategoryAppearance(name, index);
  return {
    emoji: stored?.emoji?.trim() || defaults.emoji,
    color: stored?.color && isValidCategoryColor(stored.color)
      ? normalizeCategoryColor(stored.color)
      : defaults.color,
  };
}
