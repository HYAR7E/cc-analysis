import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POSITIVE_CHARGE_FILTER } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? undefined;
  const currencyParam = sp.get("currency");
  const currency =
    currencyParam === "PEN" || currencyParam === "USD" ? currencyParam : undefined;
  const from = sp.get("from");
  const to = sp.get("to");
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit") ?? 100)));
  const cursor = sp.get("cursor") ?? undefined;

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        ...POSITIVE_CHARGE_FILTER,
        category,
        currency,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: { date: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { statement: { select: { fileName: true } } },
    });

    const hasMore = transactions.length > limit;
    const rows = (hasMore ? transactions.slice(0, limit) : transactions).map(
      (t) => ({
        id: t.id,
        date: t.date.toISOString(),
        merchant: t.merchant,
        location: t.location,
        country: t.country,
        operationType: t.operationType,
        description: t.description,
        amount: t.amount.toString(),
        currency: t.currency,
        category: t.category,
        statementFileName: t.statement.fileName,
      }),
    );
    const nextCursor = hasMore ? rows[rows.length - 1].id : null;

    return NextResponse.json({ transactions: rows, nextCursor });
  } catch (err) {
    console.error("Transactions error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
