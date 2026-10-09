import { describe, expect, it } from "vitest";
import { HashingEmbedder, InMemoryKnowledgeStore, indexDocument, runAdvisor } from "@veredito/ai";
import { categories, celulares, validateSpecs } from "@veredito/core";
import * as demo from "./demo-data.ts";
import { CatalogService } from "./services.ts";
import { createDemoSource, type ClickRecord } from "./source.ts";

const clicks: ClickRecord[] = [];
const service = new CatalogService(createDemoSource((c) => clicks.push(c)));

describe("demo data", () => {
  it("has valid specs for every product", () => {
    for (const p of demo.products) expect(validateSpecs(celulares, p.specs), p.slug).toEqual([]);
  });
});

describe("CatalogService (demo)", () => {
  it("lists a category with scores and best prices", async () => {
    const list = await service.listCategory("celulares");
    expect(list).toHaveLength(demo.products.length);
    expect(list.every((p) => p.scores.overall != null && p.bestPrice != null)).toBe(true);
    const byScore = list.map((p) => p.scores.overall!);
    expect([...byScore].sort((a, b) => b - a)).toEqual(byScore);
  });

  it("builds a product page with offers, history and alternatives", async () => {
    const page = await service.getProductPage("celulares", "nebula-aurora-x1");
    expect(page).not.toBeNull();
    expect(page!.variants).toHaveLength(2);
    expect(page!.selected.offers.length).toBeGreaterThan(0);
    expect(page!.selected.stats.daysOfData).toBeGreaterThan(30);
    expect(page!.selected.verdict.label).not.toBe("insufficient_data");
    expect(page!.review?.title).toBe("Review Nébula Aurora X1");
    expect(page!.alternatives.length).toBeGreaterThan(0);
    // O ponto de hoje no histórico é o preço exibido.
    expect(page!.selected.series.at(-1)!.min).toBe(page!.selected.best!.total);
  });

  it("returns null for unknown product or category", async () => {
    expect(await service.getProductPage("celulares", "nao-existe")).toBeNull();
    expect(await service.getProductPage("geladeiras", "x")).toBeNull();
  });

  it("compares products with winners and rule-based conclusions", async () => {
    const c = await service.compare("celulares", ["nebula-aurora-x1", "orbita-s9"]);
    expect(c.products).toHaveLength(2);
    expect(c.winners.find((w) => w.criterion === "performance")!.productId).toBe("p-orbita-s9");
    expect(c.winners.find((w) => w.criterion === "camera")!.productId).toBe("p-nebula-aurora-x1");
    expect(c.conclusions.some((x) => x.includes("câmera → Nébula Aurora X1"))).toBe(true);
  });

  it("resolves redirects only to stored offers", async () => {
    const r = await service.resolveRedirect("nebula-aurora-x1", "loja-alfa");
    expect(r?.hit?.o.url).toMatch(/^https:\/\/loja-alfa\.example\//);
    expect((await service.resolveRedirect("nebula-aurora-x1", "loja-inexistente"))?.hit).toBeNull();
    expect(await service.resolveRedirect("nao-existe", "loja-alfa")).toBeNull();
  });

  it("ranks deals without commission and flags misleading discounts", async () => {
    const deals = await service.deals("celulares");
    expect(deals.length).toBeGreaterThan(0);
    expect(deals.every((d) => d.opportunity > 0)).toBe(true);
    const all = await service.deals("celulares", "price");
    expect(all.some((d) => d.variant.misleadingDiscount)).toBe(true);
  });

  it("resolves best-list picks", async () => {
    const b = await service.bestList("/melhores/celulares-ate-3000");
    expect(b!.picks.map((p) => p.role)).toEqual(["best", "premium", "value", "budget"]);
  });

  it("feeds the advisor end to end through RAG (template mode)", async () => {
    const embedder = new HashingEmbedder(256);
    const store = new InMemoryKnowledgeStore();
    for (const d of await service.knowledgeDocuments()) await indexDocument(d, { embedder, store });
    const r = await runAdvisor({ query: "celular até 3 mil para tirar fotos" }, { catalog: service.catalogPort(), embedder, store, llm: null, categories });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.picks[0]!.product.slug).toBe("nebula-aurora-x1");
    expect(r.sources.length).toBeGreaterThan(0);
  });
});
