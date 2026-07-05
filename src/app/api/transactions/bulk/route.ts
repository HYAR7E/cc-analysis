import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  category: z.string().min(1).max(64),
  createRule: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 },
      );
    }
    const { ids, category, createRule } = parsed.data;

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

    const uniqueIds = [...new Set(ids)];
    const result = await prisma.transaction.updateMany({
      where: { id: { in: uniqueIds } },
      data: { category },
    });

    if (createRule) {
      const targets = await prisma.transaction.findMany({
        where: { id: { in: uniqueIds } },
        select: { merchant: true },
      });
      const patterns = [
        ...new Set(targets.map((t) => t.merchant.toUpperCase())),
      ];
      for (const pattern of patterns) {
        const existing = await prisma.categoryRule.findFirst({
          where: { pattern, category },
        });
        if (!existing) {
          await prisma.categoryRule.create({
            data: { pattern, category, priority: 1 },
          });
        }
      }
    }

    return NextResponse.json({ updatedCount: result.count });
  } catch (err) {
    console.error("Bulk update transactions error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
