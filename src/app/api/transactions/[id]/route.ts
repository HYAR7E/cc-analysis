import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  category: z.string().min(1).max(64),
  createRule: z.boolean().optional(),
  applyToMerchant: z.boolean().optional(),
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
    const { category, createRule, applyToMerchant = true } = parsed.data;

    const categoryRow = await prisma.category.findUnique({
      where: { name: category },
    });
    if (!categoryRow) {
      return NextResponse.json(
        { error: `Unknown category '${category}'` },
        { status: 404 },
      );
    }
    if (categoryRow.hidden) {
      return NextResponse.json(
        { error: "Cannot assign transactions to a hidden category" },
        { status: 400 },
      );
    }

    const target = await prisma.transaction.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    let updatedCount = 1;
    if (applyToMerchant) {
      const result = await prisma.transaction.updateMany({
        where: { merchant: { equals: target.merchant, mode: "insensitive" } },
        data: { category },
      });
      updatedCount = result.count;
    } else {
      await prisma.transaction.update({
        where: { id },
        data: { category },
      });
    }

    if (createRule) {
      const pattern = target.merchant.toUpperCase();
      const existing = await prisma.categoryRule.findFirst({
        where: { pattern, category },
      });
      if (!existing) {
        await prisma.categoryRule.create({
          data: { pattern, category, priority: 1 },
        });
      }
    }

    return NextResponse.json({
      id,
      category,
      updatedCount,
      merchant: target.merchant,
    });
  } catch (err) {
    console.error("Patch transaction error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
