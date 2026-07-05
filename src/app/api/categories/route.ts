import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { POSITIVE_CHARGE_FILTER } from "@/lib/transactions";
import {
  getDefaultCategoryAppearance,
  isValidCategoryColor,
  normalizeCategoryColor,
} from "@/lib/categories/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  label: z.string().min(1).max(64),
  emoji: z.string().min(1).max(16).optional(),
  color: z.string().optional(),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ isSystem: "desc" }, { label: "asc" }],
    });

    // Gather counts for transactions and rules per category in two grouped queries
    const [txCounts, ruleCounts] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["category"],
        where: POSITIVE_CHARGE_FILTER,
        _count: { _all: true },
      }),
      prisma.categoryRule.groupBy({
        by: ["category"],
        _count: { _all: true },
      }),
    ]);
    const txMap = new Map(txCounts.map((c) => [c.category, c._count._all]));
    const ruleMap = new Map(ruleCounts.map((c) => [c.category, c._count._all]));

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.label,
        emoji: c.emoji,
        color: c.color,
        isSystem: c.isSystem,
        hidden: c.hidden,
        createdAt: c.createdAt.toISOString(),
        transactionCount: txMap.get(c.name) ?? 0,
        ruleCount: ruleMap.get(c.name) ?? 0,
      })),
    });
  } catch (err) {
    console.error("List categories error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const label = parsed.data.label.trim();
    const name = slugify(parsed.data.name ?? label);
    if (!name) {
      return NextResponse.json(
        { error: "Name must contain at least one alphanumeric character" },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Category '${name}' already exists` },
        { status: 409 },
      );
    }

    const count = await prisma.category.count();
    const defaults = getDefaultCategoryAppearance(name, count);
    const emoji = parsed.data.emoji?.trim() || defaults.emoji;
    const colorRaw = parsed.data.color?.trim();
    const color =
      colorRaw && isValidCategoryColor(colorRaw)
        ? normalizeCategoryColor(colorRaw)
        : defaults.color;

    const created = await prisma.category.create({
      data: { name, label, emoji, color, isSystem: false },
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      label: created.label,
      emoji: created.emoji,
      color: created.color,
      isSystem: created.isSystem,
      hidden: created.hidden,
      createdAt: created.createdAt.toISOString(),
      transactionCount: 0,
      ruleCount: 0,
    });
  } catch (err) {
    console.error("Create category error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
