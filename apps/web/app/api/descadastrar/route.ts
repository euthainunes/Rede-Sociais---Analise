import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@veredito/db";
import { unsubscribeAll, verifyToken } from "@veredito/db/people";

export const dynamic = "force-dynamic";

/** RFC 8058 (List-Unsubscribe-Post: One-Click): o provedor de e-mail faz POST neste endereço. */
export async function POST(req: NextRequest) {
  const t = verifyToken(req.nextUrl.searchParams.get("t"), "unsubscribe");
  const sql = getSql();
  if (t && sql) await unsubscribeAll(sql, t.p);
  return new NextResponse(null, { status: t ? 200 : 400 });
}
