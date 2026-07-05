import { prisma } from "@/lib/prisma";

export type CategoryVisibilityRow = {
  name: string;
  hidden: boolean;
};

export function filterVisibleCategoryNames(
  names: Iterable<string>,
  hiddenNames: ReadonlySet<string>,
): string[] {
  return [...names].filter((name) => !hiddenNames.has(name));
}

export async function getHiddenCategoryNames(): Promise<Set<string>> {
  const rows = await prisma.category.findMany({
    where: { hidden: true },
    select: { name: true },
  });
  return new Set(rows.map((r) => r.name));
}
