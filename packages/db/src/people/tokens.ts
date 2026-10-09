/**
 * Tokens assinados (HMAC-SHA256) para links de e-mail: confirmar alerta/newsletter, gerenciar conta, descadastrar.
 * Sem estado no banco; expiram; a ação fica dentro do token assinado e não pode ser trocada.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type TokenAction = "confirm_alert" | "confirm_newsletter" | "manage" | "unsubscribe";

export interface TokenPayload {
  a: TokenAction;
  p: string;          // person id
  r?: string;         // recurso (ex.: id do alerta)
  e: number;          // expiração (epoch s)
}

const TTL: Record<TokenAction, number> = {
  confirm_alert: 7 * 86_400,
  confirm_newsletter: 7 * 86_400,
  manage: 2 * 3_600,
  unsubscribe: 365 * 86_400,
};

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET ausente ou curto (mín. 32 caracteres)");
    return "dev-only-secret-dev-only-secret-dev-only";
  }
  return s;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signToken(action: TokenAction, personId: string, resource?: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const payload: TokenPayload = { a: action, p: personId, ...(resource ? { r: resource } : {}), e: nowSec + TTL[action] };
  const body = b64(JSON.stringify(payload));
  const sig = b64(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | null | undefined, expected: TokenAction, nowSec = Math.floor(Date.now() / 1000)): TokenPayload | null {
  if (!token || token.length > 1000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (p.a !== expected || typeof p.p !== "string" || p.e < nowSec) return null;
    return p;
  } catch {
    return null;
  }
}
