/** Chamado pelo worker após mudanças de dados: descarta caches do catálogo e das páginas. */
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCatalogService } from "@veredito/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_TOKEN;
  const got = req.headers.get("x-internal-token") ?? "";
  if (!expected || expected.length < 32 || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new NextResponse(null, { status: 404 });
  }
  getCatalogService().invalidate();
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
