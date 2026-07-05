import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_RULES,
} from "../src/lib/categories/defaults";
import { getDefaultCategoryAppearance } from "../src/lib/categories/theme";

const prisma = new PrismaClient();

async function seedRules() {
  console.log("Seeding category rules...");
  let inserted = 0;
  let skipped = 0;

  for (const rule of DEFAULT_CATEGORY_RULES) {
    const existing = await prisma.categoryRule.findFirst({
      where: { pattern: rule.pattern, category: rule.category },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.categoryRule.create({ data: rule });
    inserted++;
  }

  console.log(`Rules: inserted ${inserted}, skipped ${skipped}.`);
}

async function seedCategories() {
  console.log("Seeding categories...");
  let inserted = 0;
  let skipped = 0;

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findUnique({
      where: { name: category.name },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.category.create({
      data: { ...category, isSystem: true },
    });
    inserted++;
  }

  // Backfill any extra categories already referenced by transactions or rules
  // that aren't in the defaults list. They get isSystem=false so users can
  // rename/delete them.
  const [txCats, ruleCats] = await Promise.all([
    prisma.transaction.findMany({
      select: { category: true },
      distinct: ["category"],
    }),
    prisma.categoryRule.findMany({
      select: { category: true },
      distinct: ["category"],
    }),
  ]);
  const seen = new Set(
    (await prisma.category.findMany({ select: { name: true } })).map(
      (c) => c.name,
    ),
  );
  const extras = new Set<string>();
  for (const { category } of [...txCats, ...ruleCats]) {
    if (category && !seen.has(category)) extras.add(category);
  }
  for (const name of extras) {
    const appearance = getDefaultCategoryAppearance(name, inserted);
    await prisma.category.create({
      data: {
        name,
        label: name,
        emoji: appearance.emoji,
        color: appearance.color,
        isSystem: false,
      },
    });
    inserted++;
  }

  console.log(`Categories: inserted ${inserted}, skipped ${skipped}.`);
}

async function main() {
  await seedRules();
  await seedCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
