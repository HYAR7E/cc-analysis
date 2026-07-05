import { prisma } from "./prisma";

export const DEFAULT_CATEGORY = "uncategorized";

export type RuleLike = {
  pattern: string;
  category: string;
  priority: number;
};

export async function loadRules(): Promise<RuleLike[]> {
  const rules = await prisma.categoryRule.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rules.map((r) => ({
    pattern: r.pattern,
    category: r.category,
    priority: r.priority,
  }));
}

export function categorize(merchant: string, rules: RuleLike[]): string {
  const target = merchant.toUpperCase();
  for (const rule of rules) {
    if (target.includes(rule.pattern.toUpperCase())) {
      return rule.category;
    }
  }
  return DEFAULT_CATEGORY;
}

export function categorizeAll<T extends { merchant: string }>(
  items: T[],
  rules: RuleLike[],
): (T & { category: string })[] {
  return items.map((item) => ({
    ...item,
    category: categorize(item.merchant, rules),
  }));
}
