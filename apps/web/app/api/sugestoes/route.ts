/** Autocomplete da busca. Resposta pequena e cacheável; nada de dados pessoais. */
import { NextResponse, type NextRequest } from "next/server";
import { suggestions } from "@/lib/suggest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await suggestions(q).catch(() => []);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", "X-Robots-Tag": "noindex" } },
  );
}
