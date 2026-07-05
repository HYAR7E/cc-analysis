import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POSITIVE_CHARGE_FILTER } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pattern = (sp.get("pattern") ?? "").trim();
  const limit = Math.max(1, Math.min(50, Number(sp.get("limit") ?? 10)));

  if (!pattern) {
    return NextResponse.json({ count: 0, samples: [], pattern: "" });
  }

  try {
    const where = {
      ...POSITIVE_CHARGE_FILTER,
      merchant: { contains: pattern, mode: "insensitive" as const },
    };
    const [samples, count] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: { id: true, merchant: true, category: true, date: true },
        orderBy: { merchant: "asc" },
        distinct: ["merchant"],
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      pattern,
      count,
      samples: samples.map((s) => ({
        id: s.id,
        merchant: s.merchant,
        category: s.category,
        date: s.date.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Preview rule error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
