/** Coleta de eventos próprios (beacon). Independente do GA4; lote pequeno e validado. */
import { NextResponse, type NextRequest } from "next/server";
import { isLikelyBot, sanitizeEvents } from "@veredito/core";
import { catalog } from "@/lib/data";

export const dynamic = "force-dynamic";
const MAX_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return new NextResponse(null, { status: 413 });
  if (isLikelyBot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const events = sanitizeEvents(body);
  // Identificador persistente só existe se o visitante consentiu (cookie "aid" é criado apenas após consentimento).
  await catalog().source.recordEvents(events, { anonId: req.cookies.get("aid")?.value ?? null, ts: new Date() }).catch(() => {});
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
