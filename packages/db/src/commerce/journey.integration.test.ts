/** Sessões, jornada e atribuição multi-toque contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import type { Staff } from "../admin/index.ts";
import { createPgSource, type SessionInput } from "../source.ts";
import { revenueByJourney, upsertConversion } from "./index.ts";

const url = process.env.TEST_DATABASE_URL;
const H = 3_600_000;
const noUtm = { source: null, medium: null, campaign: null, content: null, term: null };

describe.skipIf(!url)("jornada e atribuição multi-toque (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  const staff: Staff = { id: "00000000-0000-0000-0000-000000000001", email: "fin@ex.com", name: "Financeiro", role: "comercial" };
  const base = (over: Partial<SessionInput>): SessionInput => ({
    anonId: "anon-A", sessionId: null, now: new Date(), landingPath: "/", referrerHost: null, siteHost: "veredito.example",
    utm: noUtm, gclid: false, device: "mobile", ...over,
  });

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "jrn"));
  }, 60_000);
  afterAll(async () => {
    await drop?.();
  });

  it("opens, extends and splits sessions (idle, new campaign, foreign session id)", async () => {
    const src = createPgSource(sql);
    const t0 = new Date(Date.now() - 100 * H);
    const s1 = await src.trackSession(base({ now: t0, referrerHost: "www.google.com.br" }));
    expect(await src.trackSession(base({ now: new Date(t0.getTime() + 10 * 60_000), sessionId: s1 }))).toBe(s1);
    const s2 = await src.trackSession(base({ now: new Date(t0.getTime() + 50 * 60_000), sessionId: s1 }));
    expect(s2).not.toBe(s1); // 40 min parado
    const s3 = await src.trackSession(base({ now: new Date(t0.getTime() + 55 * 60_000), sessionId: s2, utm: { ...noUtm, source: "newsletter", medium: "email", campaign: "2026-W41" } }));
    expect(s3).not.toBe(s2); // outra campanha
    const s4 = await src.trackSession(base({ anonId: "anon-B", now: new Date(t0.getTime() + 56 * 60_000), sessionId: s3 }));
    expect(s4).not.toBe(s3); // sessão de outro visitante não é reaproveitada
    const rows = await sql<{ id: string; channel: string }[]>`SELECT id, channel FROM analytics.session WHERE id IN ${sql([s1!, s2!, s3!])} ORDER BY started_at`;
    expect(rows.map((r) => r.channel)).toEqual(["organic", "direct", "email"]);
    await sql`DELETE FROM analytics.session`;
  });

  it("splits commission across the journey under each model", async () => {
    const src = createPgSource(sql);
    const now = Date.now();
    const at = (h: number) => new Date(now - h * H);
    // Visitante A: Google há 10 dias → newsletter há 2 dias → direto há 1 h (sessão do clique).
    // Fora da jornada: sessão de 40 dias atrás, sessão depois do clique e sessão de outro visitante.
    await src.trackSession(base({ now: at(40 * 24), referrerHost: "instagram.com" }));
    await src.trackSession(base({ now: at(10 * 24), referrerHost: "www.google.com" }));
    await src.trackSession(base({ now: at(2 * 24), utm: { ...noUtm, source: "newsletter", medium: "email", campaign: "2026-W41" } }));
    const clickSession = await src.trackSession(base({ now: at(1) }));
    await src.trackSession(base({ anonId: "anon-B", now: at(3), referrerHost: "chatgpt.com" }));

    const [o] = await sql<{ id: string; variant_id: string; merchant_id: string; product_id: string }[]>`
      SELECT o.id, o.variant_id, o.merchant_id, v.product_id FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id LIMIT 1`;
    const click = (ref: string, anonId: string | null, sessionId: string | null, utm: Record<string, string>) =>
      src.recordClick({
        clickRef: ref, ts: at(0.5), offerId: o!.id, productId: o!.product_id, variantId: o!.variant_id, merchantId: o!.merchant_id,
        programKey: "demo", sourcePath: "/celulares/x", pageType: "product", ctaId: "hero_best_offer", position: null, utm,
        device: "mobile", anonId, sessionId, priceShown: 1000, isBot: false,
      });
    await click("JRN0000001", "anon-A", clickSession, {});
    await click("JRN0000002", null, null, { utm_source: "youtube" }); // sem consentimento: canal do UTM do clique
    await src.trackSession(base({ now: at(0.25), referrerHost: "bing.com", sessionId: null }));

    const [stored] = await sql<{ session_id: string | null }[]>`SELECT session_id FROM analytics.click WHERE click_ref = 'JRN0000001'`;
    expect(stored!.session_id).toBe(clickSession);

    const sale = (id: string, ref: string, commission: number) => upsertConversion(sql, null, "demo", {
      externalId: id, clickRef: ref, trackingTag: null, orderedAt: new Date(now).toISOString(), orderValue: 1000, commission, status: "validating", raw: {},
    });
    await sale("J-1", "JRN0000001", 100);
    await sale("J-2", "JRN0000002", 30);

    const r = await revenueByJourney(sql, staff);
    const by = Object.fromEntries(r.rows.map((x) => [x.channel, x]));
    expect(by.direct!.last).toBeCloseTo(100, 2);
    expect(by.organic!.first).toBeCloseTo(100, 2);
    expect(by.organic!.last).toBe(0);
    for (const ch of ["organic", "email", "direct"]) expect(by[ch]!.linear).toBeCloseTo(33.33, 2);
    expect([by.organic!.position, by.email!.position, by.direct!.position]).toEqual([40, 20, 40]);
    expect(by.social!.last).toBeCloseTo(30, 2);
    expect(by.ai_referral).toBeUndefined();
    for (const m of ["last", "first", "linear", "position"] as const) {
      expect(r.rows.reduce((a, x) => a + x[m], 0)).toBeCloseTo(130, 1);
    }
    expect(r).toMatchObject({ conversions: 2, withJourney: 1, avgTouches: 3 });
  });
});
