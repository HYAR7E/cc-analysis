import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  pattern: z.string().min(1).max(128),
  category: z.string().min(1).max(64),
  priority: z.number().int().min(0).max(10000).optional(),
});

function normalizePattern(input: string): string {
  return input.trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  try {
    const rules = await prisma.categoryRule.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
      rules: rules.map((r) => ({
        id: r.id,
        pattern: r.pattern,
        category: r.category,
        priority: r.priority,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("List rules error", err);
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
    const pattern = normalizePattern(parsed.data.pattern);
    if (!pattern) {
      return NextResponse.json(
        { error: "Pattern cannot be empty" },
        { status: 400 },
      );
    }
    const categoryRow = await prisma.category.findUnique({
      where: { name: parsed.data.category },
    });
    if (!categoryRow) {
      return NextResponse.json(
        { error: `Unknown category '${parsed.data.category}'` },
        { status: 404 },
      );
    }
    const duplicate = await prisma.categoryRule.findFirst({
      where: { pattern, category: parsed.data.category },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "An identical pattern already exists for this category" },
        { status: 409 },
      );
    }
    const created = await prisma.categoryRule.create({
      data: {
        pattern,
        category: parsed.data.category,
        priority: parsed.data.priority ?? 100,
      },
    });
    return NextResponse.json({
      id: created.id,
      pattern: created.pattern,
      category: created.category,
      priority: created.priority,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Create rule error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
