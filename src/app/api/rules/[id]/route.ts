import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    pattern: z.string().min(1).max(128).optional(),
    category: z.string().min(1).max(64).optional(),
    priority: z.number().int().min(0).max(10000).optional(),
  })
  .refine(
    (v) =>
      v.pattern !== undefined ||
      v.category !== undefined ||
      v.priority !== undefined,
    { message: "Provide at least one of pattern, category, priority" },
  );

function normalizePattern(input: string): string {
  return input.trim().toUpperCase();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const existing = await prisma.categoryRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const nextPattern =
      parsed.data.pattern !== undefined
        ? normalizePattern(parsed.data.pattern)
        : existing.pattern;
    if (!nextPattern) {
      return NextResponse.json(
        { error: "Pattern cannot be empty" },
        { status: 400 },
      );
    }
    const nextCategory = parsed.data.category ?? existing.category;
    if (parsed.data.category !== undefined) {
      const categoryRow = await prisma.category.findUnique({
        where: { name: parsed.data.category },
      });
      if (!categoryRow) {
        return NextResponse.json(
          { error: `Unknown category '${parsed.data.category}'` },
          { status: 404 },
        );
      }
    }

    if (
      nextPattern !== existing.pattern ||
      nextCategory !== existing.category
    ) {
      const duplicate = await prisma.categoryRule.findFirst({
        where: {
          pattern: nextPattern,
          category: nextCategory,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An identical pattern already exists for this category" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.categoryRule.update({
      where: { id },
      data: {
        pattern: nextPattern,
        category: nextCategory,
        priority: parsed.data.priority ?? existing.priority,
      },
    });

    return NextResponse.json({
      id: updated.id,
      pattern: updated.pattern,
      category: updated.category,
      priority: updated.priority,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update rule error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.categoryRule.delete({ where: { id } });
    return NextResponse.json({ deleted: id });
  } catch (err) {
    console.error("Delete rule error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
