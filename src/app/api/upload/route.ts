import { NextRequest, NextResponse } from "next/server";
import { ingestPdf } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const passwordRaw = form.get("password");
    const password =
      typeof passwordRaw === "string" && passwordRaw.length > 0
        ? passwordRaw
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field" },
        { status: 400 },
      );
    }

    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: `Unsupported content type: ${file.type}` },
        { status: 415 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestPdf(file.name, buffer, password);

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
