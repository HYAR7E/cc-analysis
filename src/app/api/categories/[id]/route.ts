import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isValidCategoryColor,
  normalizeCategoryColor,
} from "@/lib/categories/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  label: z.string().min(1).max(64).optional(),
  emoji: z.string().min(1).max(16).optional(),
  color: z.string().optional(),
  hidden: z.boolean().optional(),
});

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
    const { label, emoji, color: colorRaw, hidden } = parsed.data;
    if (
      label === undefined &&
      emoji === undefined &&
      colorRaw === undefined &&
      hidden === undefined
    ) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }
    if (colorRaw !== undefined && !isValidCategoryColor(colorRaw.trim())) {
      return NextResponse.json(
        { error: "Invalid color; use #RRGGBB hex format" },
        { status: 400 },
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label: label.trim() } : {}),
        ...(emoji !== undefined ? { emoji: emoji.trim() } : {}),
        ...(colorRaw !== undefined
          ? { color: normalizeCategoryColor(colorRaw.trim()) }
          : {}),
        ...(hidden !== undefined ? { hidden } : {}),
      },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      label: updated.label,
      emoji: updated.emoji,
      color: updated.color,
      isSystem: updated.isSystem,
      hidden: updated.hidden,
    });
  } catch (err) {
    console.error("Update category error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fallback = req.nextUrl.searchParams.get("fallback");
  if (!fallback) {
    return NextResponse.json(
      { error: "Missing required ?fallback=<slug> query parameter" },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
    if (category.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete a system category" },
        { status: 400 },
      );
    }
    if (fallback === category.name) {
      return NextResponse.json(
        { error: "Fallback cannot be the category being deleted" },
        { status: 400 },
      );
    }
    const fallbackCategory = await prisma.category.findUnique({
      where: { name: fallback },
    });
    if (!fallbackCategory) {
      return NextResponse.json(
        { error: `Fallback category '${fallback}' does not exist` },
        { status: 400 },
      );
    }

    const [txResult, ruleResult] = await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { category: category.name },
        data: { category: fallback },
      }),
      prisma.categoryRule.updateMany({
        where: { category: category.name },
        data: { category: fallback },
      }),
      prisma.category.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      deleted: category.name,
      fallback,
      reassignedTransactions: txResult.count,
      reassignedRules: ruleResult.count,
    });
  } catch (err) {
    console.error("Delete category error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
