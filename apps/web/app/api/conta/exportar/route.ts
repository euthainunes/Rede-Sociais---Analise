import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@veredito/db";
import { exportPersonData, verifyToken } from "@veredito/db/people";

export const dynamic = "force-dynamic";

/** Portabilidade (LGPD art. 18): download dos dados, com o mesmo link assinado de "gerenciar conta". */
export async function GET(req: NextRequest) {
  const t = verifyToken(req.nextUrl.searchParams.get("t"), "manage");
  const sql = getSql();
  if (!t || !sql) return new NextResponse("Link inválido ou expirado", { status: 403 });
  const data = await exportPersonData(sql, t.p);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="meus-dados.json"', "cache-control": "no-store" },
  });
}
