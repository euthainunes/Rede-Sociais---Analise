import { describe, expect, it } from "vitest";
import { celulares, scoreProduct, type Specs } from "@veredito/core";
import { HashingEmbedder, InMemoryKnowledgeStore } from "../rag/index.ts";
import type { LlmClient, LlmRequest } from "../llm.ts";
import { parseBudget, parseIntent } from "./intent.ts";
import { runAdvisor } from "./advisor.ts";
import type { AdvisorProduct, CatalogPort } from "./ports.ts";

describe("intent", () => {
  it("parses budgets in Brazilian formats", () => {
    expect(parseBudget("celular até 3 mil")).toBe(3000);
    expect(parseBudget("até R$ 2.500")).toBe(2500);
    expect(parseBudget("máximo 1500 reais")).toBe(1500);
    expect(parseBudget("celular bom")).toBeNull();
  });

  it("extracts category, priorities and OS", () => {
    const i = parseIntent("Quero um celular até R$ 3.000 para tirar fotos e jogar, android, 5G");
    expect(i.category).toBe("celulares");
    expect(i.budgetMax).toBe(3000);
    expect(i.priorities).toMatchObject({ camera: "high", performance: "high" });
    expect(i.exclude.os).toEqual(["ios"]);
    expect(i.mustHave).toContain("five_g");
    expect(i.missing).toEqual([]);
  });

  it("reports missing info", () => {
    expect(parseIntent("qual celular comprar?").missing).toEqual(["budget", "use"]);
  });
});

const raw: { id: string; name: string; price: number; specs: Specs }[] = [
  { id: "a", name: "Foto Max", price: 2900, specs: { camera_test_score: 9.4, optical_zoom_x: 3, ois: true, main_camera_mp: 200, cpu_benchmark: 5000, gpu_benchmark: 9000, ram_gb: 8, battery_mah: 5000, battery_test_hours: 16, os: "android", five_g: true } },
  { id: "b", name: "Game Pro", price: 2800, specs: { camera_test_score: 7, optical_zoom_x: 1, ois: true, main_camera_mp: 50, cpu_benchmark: 7000, gpu_benchmark: 14000, ram_gb: 12, battery_mah: 5500, battery_test_hours: 18, os: "android", five_g: true } },
  { id: "c", name: "Barato Bom", price: 1700, specs: { camera_test_score: 7.5, optical_zoom_x: 1, ois: false, main_camera_mp: 50, cpu_benchmark: 4000, gpu_benchmark: 6000, ram_gb: 8, battery_mah: 6000, battery_test_hours: 20, os: "android", five_g: true } },
  { id: "d", name: "Top Caro", price: 6500, specs: { camera_test_score: 9.8, optical_zoom_x: 5, ois: true, main_camera_mp: 200, cpu_benchmark: 8000, gpu_benchmark: 16000, ram_gb: 12, battery_mah: 5000, battery_test_hours: 17, os: "android", five_g: true } },
  { id: "e", name: "Fone iOS", price: 2700, specs: { camera_test_score: 9, optical_zoom_x: 2, ois: true, main_camera_mp: 48, cpu_benchmark: 7500, gpu_benchmark: 15000, ram_gb: 8, battery_mah: 4000, battery_test_hours: 17, os: "ios", five_g: true } },
];
const population = raw.map((r) => ({ specs: r.specs, price: r.price }));
const products: AdvisorProduct[] = raw.map((r) => ({
  id: r.id, slug: r.id, name: r.name, brand: "Nébula", category: "celulares", url: `/celulares/${r.id}`, specs: r.specs,
  scores: scoreProduct({ specs: r.specs, price: r.price, population, methodology: celulares.methodology }),
  bestPrice: r.price, bestMerchant: "Loja A", priceVerdict: null,
}));
const catalog: CatalogPort = {
  listCandidates: async () => products,
  getFacts: async (id) => {
    const p = products.find((x) => x.id === id)!;
    return [
      { id: `${id}-price`, productId: id, key: "price.best", label: `Menor preço do ${p.name}`, value: p.bestPrice!, unit: "R$", source: "Loja A", lastVerifiedAt: "2026-10-08", confidence: 0.9 },
      { id: `${id}-cam`, productId: id, key: "camera_test_score", label: `Teste de câmera do ${p.name}`, value: p.specs.camera_test_score as number, source: "teste editorial", lastVerifiedAt: "2026-09-01", confidence: 0.95 },
    ];
  },
};
const base = { catalog, embedder: new HashingEmbedder(64), store: new InMemoryKnowledgeStore(), categories: { celulares } };

class FakeLlm implements LlmClient {
  calls: LlmRequest[] = [];
  private readonly replies: string[];
  constructor(replies: string[]) {
    this.replies = replies;
  }
  async complete(req: LlmRequest) {
    this.calls.push(req);
    return { text: this.replies[this.calls.length - 1] ?? "", model: "fake", inputTokens: 0, outputTokens: 0, costUsd: 0, refused: false };
  }
}

describe("runAdvisor", () => {
  it("asks for missing information first", async () => {
    const r = await runAdvisor({ query: "qual celular comprar?" }, { ...base, llm: null });
    expect(r.status).toBe("needs_input");
    if (r.status === "needs_input") expect(r.questions.map((q) => q.key)).toEqual(["use", "budget"]);
  });

  it("picks deterministically by Fit and respects OS/budget", async () => {
    const r = await runAdvisor({ query: "celular android até 3 mil para fotos" }, { ...base, llm: null });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const roles = Object.fromEntries(r.picks.map((p) => [p.role, p.product.id]));
    expect(roles.best).toBe("a");
    expect(roles.budget).toBe("c");
    expect(roles.premium).toBe("d");
    expect(r.picks.some((p) => p.product.id === "e")).toBe(false);
    // "O que eu evitaria" nunca contradiz uma escolha.
    expect(r.picks.some((p) => p.product.id === r.avoid?.product.id)).toBe(false);
    expect(r.explanation.mode).toBe("template");
    expect(r.explanation.text).toContain("Minha recomendação: Foto Max");
  });

  it("uses LLM text only when it passes grounding, otherwise retries then falls back", async () => {
    const good = new FakeLlm(["Recomendo o Foto Max: no nosso teste de câmera teve 9,4 [F2] e custa R$ 2.900 [F1]."]);
    const ok = await runAdvisor({ query: "celular android até 3 mil para fotos" }, { ...base, llm: good });
    expect(ok.status === "ok" && ok.explanation.mode).toBe("llm");

    const bad = new FakeLlm(["Tem 16 GB de RAM [F1].", "Ainda inventando 99 horas [F9]."]);
    const fb = await runAdvisor({ query: "celular android até 3 mil para fotos" }, { ...base, llm: bad });
    expect(bad.calls).toHaveLength(2);
    expect(fb.status === "ok" && fb.explanation.mode).toBe("template");
  });

  it("returns no_match with reasons when constraints exclude everything", async () => {
    const r = await runAdvisor({ query: "iphone até 1000 reais para fotos" }, { ...base, llm: null });
    expect(r.status).toBe("no_match");
  });
});
