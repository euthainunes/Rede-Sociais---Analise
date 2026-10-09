/** Jobs do worker contra Postgres real e um servidor HTTP local (TEST_DATABASE_URL). */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import { createStaff, totp, login, type Staff } from "../admin/index.ts";
import { addFeedSource, checkLinks, expireStaleOffers, fetchFeeds, flagContentForReview, JOBS, rollupDay, runJob, type JobContext } from "./index.ts";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("worker jobs (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  let server: Server;
  let base: string;
  let staff: Staff;
  const tag = Date.now().toString(36);
  let feedStatus = 200;

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "jobs"));
    const [g] = await sql<{ gtin: string }[]>`SELECT gtin FROM catalog.product_variant WHERE sku = 'v-kaiju-volt-256gb'`;
    server = createServer((req, res) => {
      const p = req.url ?? "/";
      if (p === "/feed.csv") {
        res.writeHead(feedStatus, { "content-type": "text/csv" });
        res.end(`id,titulo,url,preco_a_vista,disponibilidade,gtin\nW-${tag},Kaiju Volt 256GB,https://loja-feed.example/kv,"1.690,00",sim,${g!.gtin}\n`);
      } else if (p === "/p/ok") res.end("<html>Comprar agora</html>");
      else if (p === "/p/sumiu") { res.writeHead(404); res.end(); }
      else if (p === "/p/home") { res.writeHead(301, { location: "/" }); res.end(); }
      else if (p === "/p/esgotado") res.end("<html>Produto indisponível no momento</html>");
      else if (p === "/") res.end("home");
      else { res.writeHead(500); res.end(); }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const s = await createStaff(sql, { email: `worker-${tag}@ex.com`, name: "Worker Teste", role: "analista_dados", password: "senha-de-teste-bem-longa" });
    const l = await login(sql, { email: `worker-${tag}@ex.com`, password: "senha-de-teste-bem-longa", code: totp(s.totpSecret) });
    if (!l.ok) throw new Error("login");
    staff = l.staff;
  }, 60_000);

  afterAll(async () => {
    server?.closeAllConnections();
    server?.close();
    await drop?.();
  });

  const ctx = (): JobContext => ({ sql, now: new Date(), net: { allowPrivate: true }, log: () => {} });

  it("refuses feeds on internal addresses without the test override", async () => {
    await expect(addFeedSource(sql, staff, { merchantName: `Loja Feed ${tag}`, url: `${base}/feed.csv`, format: "planilha", intervalMinutes: 60 }))
      .rejects.toThrow(/URL recusada/);
  });

  it("fetches due feeds, imports offers and records failures as alerts", async () => {
    const id = await addFeedSource(sql, staff, { merchantName: `Loja Feed ${tag}`, url: `${base}/feed.csv`, format: "planilha", intervalMinutes: 60 }, { allowPrivate: true });
    const r1 = await fetchFeeds(ctx());
    expect(r1).toMatchObject({ ok: 1, failed: 0, autoMatched: 1 });
    expect((await fetchFeeds(ctx())).due).toBe(0); // intervalo ainda não venceu

    await sql`UPDATE ops.feed_source SET last_run_at = now() - interval '2 hours' WHERE id = ${id}`;
    feedStatus = 503;
    expect(await fetchFeeds(ctx())).toMatchObject({ failed: 1 });
    const [alert] = await sql`SELECT status FROM ops.internal_alert WHERE kind = 'feed_error' AND entity_id = ${id}`;
    expect(alert!.status).toBe("open");

    await sql`UPDATE ops.feed_source SET last_run_at = now() - interval '2 hours' WHERE id = ${id}`;
    feedStatus = 200;
    await fetchFeeds(ctx());
    const [after] = await sql`SELECT status FROM ops.internal_alert WHERE kind = 'feed_error' AND entity_id = ${id}`;
    expect(after!.status).toBe("resolved");
  });

  it("closes the daily history from observations", async () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(await rollupDay(sql, today)).toBeGreaterThan(0);
    const [d] = await sql`
      SELECT min_price::float AS p FROM pricing.price_daily
      WHERE day = ${today}::date AND variant_id = (SELECT id FROM catalog.product_variant WHERE sku = 'v-kaiju-volt-256gb')`;
    expect(d!.p).toBe(1690);
  });

  it("pauses anomalous prices instead of publishing them", async () => {
    const [g] = await sql<{ gtin: string }[]>`SELECT gtin FROM catalog.product_variant WHERE sku = 'v-orbita-a5-128gb'`;
    const { importOffers } = await import("../admin/offers.ts");
    await importOffers(sql, null, { merchantName: `Loja Erro ${tag}`, format: "planilha",
      content: `id,titulo,url,preco_a_vista,disponibilidade,gtin\nE-${tag},Orbita A5,https://erro.example/a5,"119,00",sim,${g!.gtin}\n` });
    const [o] = await sql`SELECT status FROM commerce.offer WHERE external_id = ${`E-${tag}`}`;
    expect(o!.status).toBe("paused");
    const [a] = await sql`SELECT count(*)::int AS n FROM ops.internal_alert a JOIN commerce.offer o ON o.id = a.entity_id WHERE a.kind = 'price_anomaly' AND o.external_id = ${`E-${tag}`}`;
    expect(a!.n).toBe(1);
  });

  it("checks links: 404 and redirect-to-home break the offer, 'indisponível' marks out of stock", async () => {
    const mk = async (path: string) => {
      const [o] = await sql<{ id: string }[]>`
        INSERT INTO commerce.offer (id, variant_id, merchant_id, seller_name, external_id, title_raw, url_original, price_cash, availability, match_status, source_id, last_checked_at, last_link_check_at)
        SELECT gen_random_uuid(), (SELECT id FROM catalog.product_variant WHERE sku = 'v-lumen-one-128gb'), m.id, '', ${`L-${tag}-${path}`}, 'x', ${`${base}${path}`}, 4000, 'in_stock', 'confirmed',
               (SELECT id FROM ops.data_source LIMIT 1), now(), NULL
        FROM commerce.merchant m LIMIT 1 RETURNING id`;
      return o!.id;
    };
    await sql`UPDATE commerce.offer SET last_link_check_at = now()`; // só as ofertas do teste ficam "vencidas"
    const ids = { ok: await mk("/p/ok"), sumiu: await mk("/p/sumiu"), home: await mk("/p/home"), esgotado: await mk("/p/esgotado") };
    await checkLinks(ctx(), 4);
    const rows = await sql<{ id: string; status: string; availability: string }[]>`SELECT id, status, availability FROM commerce.offer WHERE id = ANY(${Object.values(ids)}::uuid[])`;
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by[ids.ok]!.status).toBe("active");
    expect(by[ids.sumiu]!.status).toBe("broken");
    expect(by[ids.home]!.status).toBe("broken");
    expect(by[ids.esgotado]!.availability).toBe("out_of_stock");
    const [lc] = await sql`SELECT count(*)::int AS n FROM ops.link_check WHERE offer_id = ANY(${Object.values(ids)}::uuid[])`;
    expect(lc!.n).toBe(4);
  });

  it("expires offers no source confirms for 7 days and flags overdue content", async () => {
    await sql`UPDATE commerce.offer SET last_checked_at = now() - interval '8 days' WHERE external_id = ${`L-${tag}-/p/ok`}`;
    expect((await expireStaleOffers(ctx())).expired).toBeGreaterThanOrEqual(1);
    await sql`UPDATE editorial.content SET status = 'published', next_review_at = current_date - 1 WHERE url_path = '/celulares/kaiju-volt'`;
    expect((await flagContentForReview(ctx())).flagged).toBeGreaterThanOrEqual(1);
    const [c] = await sql`SELECT status FROM editorial.content WHERE url_path = '/celulares/kaiju-volt'`;
    expect(c!.status).toBe("needs_update");
  });

  it("runs each job once across concurrent workers (advisory lock) and logs runs", async () => {
    let calls = 0;
    const slow = { name: `teste-lock-${tag}`, everyMinutes: 1, affectsSite: false, run: async () => { calls++; await new Promise((r) => setTimeout(r, 300)); return {}; } };
    const [a, b] = await Promise.all([runJob(sql, slow, ctx()), runJob(sql, slow, ctx())]);
    expect([a.status, b.status].sort()).toEqual(["ok", "skipped"]);
    expect(calls).toBe(1);
    const all = await Promise.all(JOBS.filter((j) => j.name !== "fetch-feeds" && j.name !== "check-links").map((j) => runJob(sql, j, ctx())));
    expect(all.filter((r) => r.status !== "ok")).toEqual([]);
  });
});
