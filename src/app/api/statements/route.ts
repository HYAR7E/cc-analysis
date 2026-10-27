import { NextResponse } from "next/server";
import { getStatementSummaries } from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const statements = await getStatementSummaries();
    return NextResponse.json({ statements });
  } catch (err) {
    console.error("Statements error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
