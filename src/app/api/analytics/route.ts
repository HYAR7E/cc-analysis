import { NextRequest, NextResponse } from "next/server";
import { getAnalytics, getMixedAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const monthsParam = sp.get("months");
  const months = monthsParam ? Math.max(1, Math.min(24, Number(monthsParam))) : 6;
  const currencyParam = sp.get("currency")?.toUpperCase();
  const monthParam = sp.get("month") ?? undefined;
  try {
    if (!currencyParam || currencyParam === "ALL") {
      const data = await getMixedAnalytics(months, monthParam);
      return NextResponse.json(data);
    }
    const currency = currencyParam === "USD" ? "USD" : "PEN";
    const data = await getAnalytics(months, currency, monthParam);
    return NextResponse.json({ ...data, currency });
  } catch (err) {
    console.error("Analytics error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
