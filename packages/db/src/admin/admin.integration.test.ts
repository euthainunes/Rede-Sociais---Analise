/** Fluxo completo do admin contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import { CatalogService } from "../services.ts";
import { createPgSource } from "../source.ts";
import {
  addVariant, createStaff, decideMatch, getSession, importFeed, listAudit, listMatchQueue, listOpenAlerts, login, logout,
  refreshInternalAlerts, saveContent, saveProduct, totp, transitionContent, ValidationError, ForbiddenError, type Staff,
  matchTotpStep, archiveDemoProducts, deleteProduct, listProductsAdmin, productCounts, setProductArchived, setProductDemo, setVariantActive,
  updateVariant,
} from "./index.ts";

const url = process.env.TEST_DATABASE_URL;
const PASSWORD = "senha-de-teste-bem-longa";

describe.skipIf(!url)("admin (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  let admin: Staff;
  let editor: Staff;
  let editorSecret: string;
  const tag = Date.now().toString(36);
  const gtin = String(Date.now()).slice(-13).padStart(13, "7");
  let productSlug = "";

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "admin"));
    const a = await createStaff(sql, { email: `admin-${tag}@ex.com`, name: "Admin Teste", role: "admin", password: PASSWORD });
    const e = await createStaff(sql, { email: `editor-${tag}@ex.com`, name: "Editora Teste", role: "editor", password: PASSWORD });
    editorSecret = e.totpSecret;
    const la = await login(sql, { email: `admin-${tag}@ex.com`, password: PASSWORD, code: totp(a.totpSecret) });
    if (!la.ok) throw new Error("login admin falhou");
    admin = la.staff;
    editor = { id: e.id, email: `editor-${tag}@ex.com`, name: "Editora Teste", role: "editor" };
  }, 60_000);

  afterAll(async () => {
    await drop?.();
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
  it("accepts each 2FA code once and throttles a network after repeated failures", async () => {
    const email = `otp-${tag}@ex.com`;
    const { totpSecret } = await createStaff(sql, { email, name: "OTP", role: "leitor", password: PASSWORD });
    const code = totp(totpSecret);
    expect(matchTotpStep(totpSecret, code)).not.toBeNull();
    expect((await login(sql, { email, password: PASSWORD, code })).ok).toBe(true);
    expect(await login(sql, { email, password: PASSWORD, code })).toEqual({ ok: false, reason: "invalid" });

    const ipHash = `ip-${tag}`;
    for (let i = 0; i < 20; i++) await login(sql, { email: `ninguem-${i}-${tag}@ex.com`, password: "errada-errada-errada", code: "123456", ipHash });
    const next = await login(sql, { email, password: PASSWORD, code: totp(totpSecret, Date.now() + 30_000), ipHash });
    expect(next).toEqual({ ok: false, reason: "throttled" });
  });

  it("keeps published content on the site while a new version is edited, reviewed or flagged", async () => {
    const svc = () => new CatalogService(createPgSource(sql));
    const live = async (path: string) => (await svc().listContent()).find((c) => c.path === path);
    const [r] = await sql<{ id: string; url_path: string }[]>`SELECT id, url_path FROM editorial.content WHERE title = ${`Review Zeta ${tag}`}`;
    // A edição do teste anterior está em revisão; o site continua com o texto publicado.
    expect((await live(r!.url_path))?.sections[0]?.text).toBe("Texto de teste da review.");
    await transitionContent(sql, admin, r!.id, "approved");
    await transitionContent(sql, admin, r!.id, "published");
    expect((await live(r!.url_path))?.sections[0]?.text).toBe("Texto revisado.");
    // Ciclo de revisão vencido não tira do ar.
    await transitionContent(sql, admin, r!.id, "needs_update");
    expect(await live(r!.url_path)).toBeTruthy();
    // Arquivar tira do ar e remove do índice da IA.
    const removed: string[] = [];
    await transitionContent(sql, admin, r!.id, "archived", { onUnpublished: async (x) => void removed.push(x) });
    expect(await live(r!.url_path)).toBeUndefined();
    expect(removed).toEqual([r!.id]);

    // Guia publicado mantém o endereço mesmo com título novo; o tipo não muda mais.
    const base = { kind: "guide" as const, category: "celulares", productSlugs: [], evidenceLevel: null, intro: "Introdução.", sections: [{ heading: "Parte", text: "Texto." }] };
    const g = await saveContent(sql, admin, { ...base, title: `Guia original ${tag}` });
    for (const to of ["in_review", "approved", "published"] as const) await transitionContent(sql, admin, g, to);
    await saveContent(sql, admin, { ...base, id: g, title: `Guia renomeado ${tag}` });
    const [after] = await sql<{ url_path: string }[]>`SELECT url_path FROM editorial.content WHERE id = ${g}`;
    expect(after!.url_path).toBe(`/guias/guia-original-${tag}`);
    expect((await svc().contentAt(after!.url_path))?.title).toBe(`Guia original ${tag}`);
    await expect(saveContent(sql, admin, { ...base, id: g, kind: "review", title: "x de review" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("redirects old product addresses without chains or loops", async () => {
    const [p] = await sql<{ id: string }[]>`SELECT id FROM catalog.product WHERE slug = ${productSlug}`;
    const save = (slug: string) => saveProduct(sql, admin, {
      id: p!.id, category: "celulares", brand: `Zeta ${tag}`, name: `Zeta Phone ${tag}`, slug, summary: "Um celular de teste com bateria grande e preço baixo.",
      editorial: { forWho: [], notForWho: [], pros: [], cons: [] },
      specs: { battery_mah: 6000, ram_gb: 8, storage_gb: 256, os: "android", nfc: true, five_g: true, cpu_benchmark: 3000 },
      publishStatus: "published", specSource: { kind: "manufacturer" },
    });
    const svc = new CatalogService(createPgSource(sql));
    await save(`${productSlug}-b`);
    await save(`${productSlug}-c`);
    expect(await svc.redirectFor(`/celulares/${productSlug}`)).toBe(`/celulares/${productSlug}-c`);
    expect(await svc.redirectFor(`/celulares/${productSlug}-b`)).toBe(`/celulares/${productSlug}-c`);
    await save(productSlug);
    expect(await svc.redirectFor(`/celulares/${productSlug}`)).toBeNull();
    expect(await svc.redirectFor(`/celulares/${productSlug}-c`)).toBe(`/celulares/${productSlug}`);
  });

  it("archives, restores, marks real and deletes products; edits and deactivates versions", async () => {
    const base = {
      category: "celulares", brand: `Ômega ${tag}`, summary: "Um celular de teste para arquivar e excluir.",
      editorial: { forWho: [], notForWho: [], pros: [], cons: [] }, specs: { battery_mah: 5000 },
      specSource: { kind: "manual" as const },
    };
    const { id, slug } = await saveProduct(sql, admin, { ...base, name: `Omega Arquivo ${tag}`, publishStatus: "published" });
    const v1 = await addVariant(sql, admin, id, { storage: "128gb", color: "Azul" });
    const v2 = await addVariant(sql, admin, id, { storage: "256gb", color: "Azul" });
    const svc = () => new CatalogService(createPgSource(sql));

    // Versão: editar (GTIN repetido é recusado com mensagem) e desativar (sai do site, sobra ao menos uma).
    await expect(updateVariant(sql, admin, v2, { storage: "128gb", color: "azul" })).rejects.toThrow(/já tem uma versão/);
    await expect(updateVariant(sql, admin, v2, { storage: "256gb", color: "Azul", gtin })).rejects.toThrow(/já está em uma versão/);
    await updateVariant(sql, admin, v2, { storage: "512gb", color: "Azul" });
    await setVariantActive(sql, admin, v2, false);
    await expect(setVariantActive(sql, admin, v1, false)).rejects.toThrow(/ao menos uma versão ativa/);
    const page = await svc().getProductPage("celulares", slug);
    expect(page?.variants.map((v) => v.slug)).toEqual(["128gb-azul"]);

    // Arquivar tira do site; salvar sem "Publicado" não desarquiva; restaurar volta como rascunho.
    await setProductArchived(sql, admin, id, true);
    expect(await svc().getProductPage("celulares", slug)).toBeNull();
    await saveProduct(sql, admin, { ...base, id, name: `Omega Arquivo ${tag}`, publishStatus: "draft" });
    expect((await listProductsAdmin(sql, { filter: "arquivados", q: `Omega Arquivo ${tag}` })).length).toBe(1);
    expect((await listProductsAdmin(sql, { filter: "ativos", q: `Omega Arquivo ${tag}` })).length).toBe(0);
    await setProductArchived(sql, admin, id, false);
    expect((await listProductsAdmin(sql, { filter: "rascunhos", q: `Omega Arquivo ${tag}` })).length).toBe(1);

    // Excluir: só arquivado, com o endereço digitado; libera o endereço e pausa as ofertas.
    await expect(deleteProduct(sql, admin, id, slug)).rejects.toThrow(/arquive/);
    await setProductArchived(sql, admin, id, true);
    await expect(deleteProduct(sql, admin, id, "errado")).rejects.toThrow(/digite o endereço/);
    await deleteProduct(sql, admin, id, slug);
    expect((await listProductsAdmin(sql, { filter: "arquivados", q: `Omega Arquivo ${tag}` })).length).toBe(0);
    const again = await saveProduct(sql, admin, { ...base, name: `Omega Arquivo ${tag}`, publishStatus: "draft" });
    expect(again.slug).toBe(slug);

    // Produto citado por conteúdo no ar não pode ser excluído.
    const [cited] = await sql<{ id: string; slug: string }[]>`SELECT id, slug FROM catalog.product WHERE slug = ${`${productSlug}`}`;
    const g = await saveContent(sql, admin, { kind: "guide", title: `Guia citando ${tag}`, category: "celulares", productSlugs: [cited!.slug],
      evidenceLevel: null, intro: null, sections: [{ heading: "A", text: "b" }] });
    for (const to of ["in_review", "approved", "published"] as const) await transitionContent(sql, admin, g, to);
    await setProductArchived(sql, admin, cited!.id, true);
    await expect(deleteProduct(sql, admin, cited!.id, cited!.slug)).rejects.toThrow(/conteúdo no ar/);
    await setProductArchived(sql, admin, cited!.id, false);

    // Demonstração: marcar como real e arquivar em lote só os de demonstração.
    await setProductDemo(sql, admin, again.id, true);
    expect((await productCounts(sql)).demo_no_ar).toBeGreaterThan(0);
    await expect(archiveDemoProducts(sql, admin, "sim")).rejects.toBeInstanceOf(ValidationError);
    const n = await archiveDemoProducts(sql, admin, "arquivar");
    expect(n).toBeGreaterThan(0);
    expect((await productCounts(sql)).demo_no_ar).toBe(0);
    const [real] = await sql`SELECT publish_status FROM catalog.product WHERE id = ${cited!.id}`;
    expect(real!.publish_status).not.toBe("archived");
  });

  it("refuses to change or erase the audit log and filters it", async () => {
    await expect(sql`UPDATE ops.audit_log SET action = 'x' WHERE id = (SELECT max(id) FROM ops.audit_log)`).rejects.toThrow(/somente de inclusão/);
    await expect(sql`DELETE FROM ops.audit_log`).rejects.toThrow(/somente de inclusão/);
    await expect(sql`TRUNCATE ops.audit_log`).rejects.toThrow(/somente de inclusão/);
    const products = await listAudit(sql, 500, { action: "product." });
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((r) => r.action.startsWith("product."))).toBe(true);
    const mine = await listAudit(sql, 500, { actor: editor.id });
    expect(mine.every((r) => r.email === editor.email)).toBe(true);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    expect((await listAudit(sql, 5, { from: today, to: today })).length).toBeGreaterThan(0);
    expect(await listAudit(sql, 5, { to: "2000-01-01" })).toEqual([]);
    const [first, second] = await listAudit(sql, 2);
    expect((await listAudit(sql, 1, { before: first!.id }))[0]!.id).toBe(second!.id);
  });
});
