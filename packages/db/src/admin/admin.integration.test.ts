/** Fluxo completo do admin contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSql, type Sql } from "../client.ts";
import { migrate } from "../migrate.ts";
import { seedDemo } from "../seed.ts";
import { CatalogService } from "../services.ts";
import { createPgSource } from "../source.ts";
import {
  addVariant, createStaff, decideMatch, getSession, importFeed, listAudit, listMatchQueue, listOpenAlerts, login, logout,
  refreshInternalAlerts, saveContent, saveProduct, totp, transitionContent, ValidationError, ForbiddenError, type Staff,
} from "./index.ts";

const url = process.env.TEST_DATABASE_URL;
const PASSWORD = "senha-de-teste-bem-longa";

describe.skipIf(!url)("admin (Postgres)", () => {
  let sql: Sql;
  let admin: Staff;
  let editor: Staff;
  let editorSecret: string;
  const tag = Date.now().toString(36);
  const gtin = String(Date.now()).slice(-13).padStart(13, "7");
  let productSlug = "";

  beforeAll(async () => {
    sql = createSql(url!, { max: 2, onnotice: () => {} });
    await migrate(sql);
    await seedDemo(sql);
    const a = await createStaff(sql, { email: `admin-${tag}@ex.com`, name: "Admin Teste", role: "admin", password: PASSWORD });
    const e = await createStaff(sql, { email: `editor-${tag}@ex.com`, name: "Editora Teste", role: "editor", password: PASSWORD });
    editorSecret = e.totpSecret;
    const la = await login(sql, { email: `admin-${tag}@ex.com`, password: PASSWORD, code: totp(a.totpSecret) });
    if (!la.ok) throw new Error("login admin falhou");
    admin = la.staff;
    editor = { id: e.id, email: `editor-${tag}@ex.com`, name: "Editora Teste", role: "editor" };
  }, 60_000);

  afterAll(async () => {
    await sql?.end();
  });

  it("requires password AND TOTP, and locks after repeated failures", async () => {
    const email = `editor-${tag}@ex.com`;
    expect((await login(sql, { email, password: PASSWORD, code: "000000" })).ok).toBe(false);
    const ok = await login(sql, { email, password: PASSWORD, code: totp(editorSecret) });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect((await getSession(sql, ok.token))?.role).toBe("editor");
    await logout(sql, ok.token);
    expect(await getSession(sql, ok.token)).toBeNull();
    for (let i = 0; i < 5; i++) await login(sql, { email, password: "errada-errada-errada", code: "123456" });
    const locked = await login(sql, { email, password: PASSWORD, code: totp(editorSecret) });
    expect(locked).toEqual({ ok: false, reason: "locked" });
  });

  it("creates a product with validated specs and provenance", async () => {
    await expect(saveProduct(sql, admin, {
      category: "celulares", brand: "Teste", name: "Ruim", summary: "", editorial: { forWho: [], notForWho: [], pros: [], cons: [] },
      specs: { battery_mah: 99999 }, publishStatus: "published", specSource: { kind: "manual" },
    })).rejects.toBeInstanceOf(ValidationError);

    const { id, slug } = await saveProduct(sql, admin, {
      category: "celulares", brand: `Zeta ${tag}`, name: `Zeta Phone ${tag}`, model: `Phone ${tag}`, summary: "Um celular de teste com bateria grande e preço baixo.",
      editorial: { forWho: ["Testes"], notForWho: ["Produção"], pros: ["Bateria"], cons: ["Câmera"] },
      specs: { battery_mah: 6000, ram_gb: 8, storage_gb: 256, os: "android", nfc: true, five_g: true, cpu_benchmark: 3000 },
      publishStatus: "published", specSource: { kind: "manufacturer", url: "https://fabricante.example/zeta" },
    });
    expect(slug).toBe(`zeta-phone-${tag}`);
    productSlug = slug;
    const prov = await sql`SELECT count(*)::int AS n FROM catalog.product_attribute_value WHERE product_id = ${id} AND is_current`;
    expect(prov[0]!.n).toBe(7);
    await addVariant(sql, admin, id, { storage: "256GB", color: "Verde", gtin });
    await expect(addVariant(sql, editor, id, { storage: "x", color: "y" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("blocks the commercial firewall and publishing by role", async () => {
    const comercial: Staff = { ...admin, role: "comercial" };
    await expect(saveProduct(sql, comercial, {} as never)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(importFeed(sql, editor, { merchantName: "X", format: "planilha", content: "id\n" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("imports a feed: auto-matches by GTIN and queues ambiguous listings", async () => {
    const feed = [
      "id,titulo,url,preco_a_vista,disponibilidade,gtin",
      `A1-${tag},Smartphone Zeta Phone 256GB,https://loja-nova.example/a1,"1.749,00",sim,${gtin}`,
      `A2-${tag},Celular Zeta Phone ${tag} verde,https://loja-nova.example/a2,"1.799,00",sim,`,
      `A3-${tag},Sem preco,https://loja-nova.example/a3,,sim,`,
    ].join("\n");
    const stats = await importFeed(sql, admin, { merchantName: `Loja Nova ${tag}`, format: "planilha", content: feed });
    expect(stats).toMatchObject({ total: 3, auto: 1, queued: 1, invalid: 1 });
    const queue = await listMatchQueue(sql);
    const item = queue.find((q) => q.title_raw.includes(`Zeta Phone ${tag} verde`))!;
    expect(item.suggestions.length).toBeGreaterThan(0);
    const offerId = await decideMatch(sql, admin, item.id, { variantId: item.suggestions[0]!.variantId });
    expect(offerId).toBeTruthy();
    await expect(decideMatch(sql, admin, item.id, "reject")).rejects.toBeInstanceOf(ValidationError);
    const daily = await sql`SELECT min_price::float AS p FROM pricing.price_daily WHERE day = current_date AND variant_id = (SELECT id FROM catalog.product_variant WHERE gtin = ${gtin})`;
    expect(daily[0]!.p).toBe(1749);
  });

  it("runs the editorial workflow and only chiefs/admins publish", async () => {
    const id = await saveContent(sql, editor, {
      kind: "review", title: `Review Zeta ${tag}`, category: "celulares", productSlugs: [productSlug], evidenceLevel: "data_based",
      intro: null, sections: [{ heading: "Resumo", text: "Texto de teste da review." }],
    });
    await transitionContent(sql, editor, id, "in_review");
    await expect(transitionContent(sql, editor, id, "published")).rejects.toBeInstanceOf(ForbiddenError);
    await transitionContent(sql, admin, id, "approved");
    const published: string[] = [];
    await transitionContent(sql, admin, id, "published", { onPublished: async (x) => void published.push(x) });
    expect(published).toEqual([id]);
    await expect(transitionContent(sql, admin, id, "draft")).rejects.toBeInstanceOf(ValidationError);
    // Editar algo publicado devolve para revisão.
    await saveContent(sql, editor, {
      id, kind: "review", title: `Review Zeta ${tag}`, category: "celulares", productSlugs: [productSlug], evidenceLevel: "data_based",
      intro: null, sections: [{ heading: "Resumo", text: "Texto revisado." }], changeNote: "ajuste",
    });
    const [c] = await sql`SELECT status FROM editorial.content WHERE id = ${id}`;
    expect(c!.status).toBe("in_review");
    // Uma review por produto: segunda review no mesmo endereço é recusada com mensagem clara.
    await expect(saveContent(sql, editor, {
      kind: "review", title: "Outra review duplicada", category: "celulares", productSlugs: [productSlug], evidenceLevel: null,
      intro: null, sections: [{ heading: "Resumo", text: "x" }],
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it("shows new published products on the public site and raises internal alerts", async () => {
    const svc = new CatalogService(createPgSource(sql));
    const list = await svc.listCategory("celulares");
    expect(list.some((p) => p.slug === `zeta-phone-${tag}`)).toBe(true);
    await refreshInternalAlerts(sql);
    const again = await refreshInternalAlerts(sql);
    expect(again.opened).toBe(0); // idempotente
    const alerts = await listOpenAlerts(sql, 500);
    // O produto ganhou ofertas na importação: não pode haver alerta de "sem oferta" para ele.
    expect(alerts.some((a) => a.kind === "no_offer" && (a.details as { name: string }).name === `Zeta Phone ${tag}`)).toBe(false);
    const log = await listAudit(sql, 50);
    expect(log.some((l) => l.action === "offers.import")).toBe(true);
  });
});
