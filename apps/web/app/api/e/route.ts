/**
 * Coleta de eventos próprios (beacon). Independente do GA4; lote pequeno e validado.
 *
 * Sem consentimento: eventos anônimos, sem identificador. Com consentimento de medição, o evento "consent"
 * cria o cookie "aid" (pseudônimo, 180 dias) e cada page_view abre ou estende a sessão (cookie "sid"),
 * que alimenta a jornada usada na atribuição multi-toque. Revogar apaga os dois cookies.
 */
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deviceFromUserAgent, isLikelyBot, sanitizeEvents, type IncomingEvent } from "@veredito/core";
import { catalog } from "@/lib/data";

export const dynamic = "force-dynamic";
const MAX_BYTES = 16 * 1024;
const AID = /^[A-Za-z0-9_-]{22}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return new NextResponse(null, { status: 413 });
  const ua = req.headers.get("user-agent");
  if (isLikelyBot(ua)) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const events = sanitizeEvents(body);
  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const cookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

  const rawAid = req.cookies.get("aid")?.value;
  let aid = rawAid && AID.test(rawAid) ? rawAid : null;
  const consent = events.find((e) => e.name === "consent")?.props.analytics;
  if (consent === "denied") {
    aid = null;
    res.cookies.set("aid", "", { ...cookie, maxAge: 0 });
    res.cookies.set("sid", "", { ...cookie, maxAge: 0 });
  } else if (consent === "granted" && !aid) {
    aid = randomBytes(16).toString("base64url");
    res.cookies.set("aid", aid, { ...cookie, maxAge: 180 * 86_400 });
  }

  const rawSid = req.cookies.get("sid")?.value;
  let sessionId = aid && rawSid && UUID.test(rawSid) ? rawSid : null;
  const view = events.find((e) => e.name === "page_view");
  if (aid && view) {
    sessionId = await catalog().source.trackSession({
      anonId: aid, sessionId, now: new Date(), landingPath: view.path, referrerHost: prop(view, "ref"),
      siteHost: req.nextUrl.hostname,
      utm: { source: prop(view, "utm_source"), medium: prop(view, "utm_medium"), campaign: prop(view, "utm_campaign", false), content: prop(view, "utm_content", false), term: prop(view, "utm_term", false) },
      gclid: view.props.gclid === true, device: deviceFromUserAgent(ua),
    }).catch(() => null);
    if (sessionId) res.cookies.set("sid", sessionId, { ...cookie, maxAge: 86_400 });
  }

  await catalog().source.recordEvents(events, { anonId: aid, sessionId, ts: new Date() }).catch(() => {});
  return res;
}

function prop(e: IncomingEvent, key: string, lower = true): string | null {
  const v = e.props[key];
  if (typeof v !== "string" || !v.trim()) return null;
  return (lower ? v.trim().toLowerCase() : v.trim()).slice(0, 100);
}
