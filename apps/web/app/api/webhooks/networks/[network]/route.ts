/**
 * Postback de conversões das redes de afiliados (docs/09 §9.3).
 * Assinatura HMAC-SHA256 do corpo em `x-signature`, com o segredo `POSTBACK_SECRET_<REDE>` (ex.: POSTBACK_SECRET_AWIN).
 * Idempotente: a mesma transação reenviada só atualiza status/valor.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@veredito/db";
import { postbackToConversions, upsertConversion, verifyPostbackSignature } from "@veredito/db/commerce";
import { PROGRAMS } from "@veredito/integrations";

export const dynamic = "force-dynamic";
const MAX_BYTES = 256 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ network: string }> }) {
  const { network } = await ctx.params;
  if (!PROGRAMS.some((p) => p.key === network)) return new NextResponse(null, { status: 404 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
  const secret = process.env[`POSTBACK_SECRET_${network.toUpperCase()}`];
  if (!verifyPostbackSignature(raw, req.headers.get("x-signature"), secret)) return new NextResponse(null, { status: 401 });
  const sql = getSql();
  if (!sql) return new NextResponse(null, { status: 503 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const result = { created: 0, updated: 0, unchanged: 0, invalid: 0 };
  for (const c of postbackToConversions(body)) {
    try {
      result[await upsertConversion(sql, null, network, c)]++;
    } catch {
      result.invalid++;
    }
  }
  return NextResponse.json(result);
}
