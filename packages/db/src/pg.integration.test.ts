/**
 * Integração com Postgres real. Roda só com TEST_DATABASE_URL (banco descartável):
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/veredito_test pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HashingEmbedder, indexDocument, retrieve } from "@veredito/ai";
import { createSql, type Sql } from "./client.ts";
import { PgKnowledgeStore } from "./knowledge-store.ts";
import { migrate } from "./migrate.ts";
import { seedDemo } from "./seed.ts";
import { CatalogService } from "./services.ts";
import { createDemoSource, createPgSource } from "./source.ts";
import { DEMO_TODAY } from "./demo-data.ts";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Postgres", () => {
  let sql: Sql;
  let pg: CatalogService;
  const demo = new CatalogService(createDemoSource());

  beforeAll(async () => {
    sql = createSql(url!, { max: 2, onnotice: () => {} });
    await migrate(sql);
    await seedDemo(sql);
    // Âncora "hoje" na data dos dados de demonstração para comparar com o modo demo.
    pg = new CatalogService({ ...createPgSource(sql, { today: () => DEMO_TODAY }), mode: "demo" });
  }, 60_000);

  afterAll(async () => {
    await sql?.end();
  });

  it("is idempotent (migrate + seed twice)", async () => {
    expect(await migrate(sql)).toEqual([]);
    await seedDemo(sql);
    const rows = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM catalog.product WHERE is_demo`;
    expect(rows[0]!.n).toBe(10);
  });

  it("produces the same product page as demo mode", async () => {
    const a = await demo.getProductPage("celulares", "orbita-s9");
    const b = await pg.getProductPage("celulares", "orbita-s9");
    expect(b!.summary.bestPrice).toBe(a!.summary.bestPrice);
    expect(b!.summary.scores.overall).toBe(a!.summary.scores.overall);
    expect(b!.selected.verdict.label).toBe(a!.selected.verdict.label);
    expect(b!.product.pros).toEqual(a!.product.pros);
    expect(b!.review?.title).toBe(a!.review?.title);
  });

  it("records clicks in the partitioned table", async () => {
    const r = await pg.resolveRedirect("orbita-s9", "loja-alfa");
    const ref = `t${Date.now().toString(36)}`;
    await pg.source.recordClick({
      clickRef: ref, ts: new Date(), offerId: r!.hit!.o.id, productId: r!.product.id, variantId: r!.hit!.v.id,
      merchantId: r!.hit!.o.merchantId,
      programKey: "demo", sourcePath: "/celulares/orbita-s9", pageType: "product", ctaId: "hero_best_offer", position: "hero",
      utm: { utm_source: "test" }, device: "mobile", anonId: null, sessionId: null, priceShown: r!.hit!.o.total, isBot: false,
    });
    const rows = await sql`SELECT cta_id FROM analytics.click WHERE click_ref = ${ref}`;
    expect(rows[0]!.cta_id).toBe("hero_best_offer");
  });

  it("indexes and retrieves knowledge with pgvector + FTS", async () => {
    const embedder = new HashingEmbedder(1024);
    const store = new PgKnowledgeStore(sql, embedder.model);
    for (const d of await pg.knowledgeDocuments()) await indexDocument(d, { embedder, store });
    const r = await retrieve("qual celular tem a maior autonomia de bateria", { embedder, store }, { k: 3, filter: { category: "celulares" } });
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.chunk.headingPath.includes("Kaiju Volt"))).toBe(true);
  });
});
