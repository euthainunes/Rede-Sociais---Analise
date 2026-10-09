/** Conversões, comissões e atribuição contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import { ForbiddenError, type Staff } from "../admin/index.ts";
import { importConversions, recentConversions, revenueBy, revenueSummary } from "./index.ts";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("conversões e receita (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  const admin: Staff = { id: "00000000-0000-0000-0000-000000000001", email: "fin@ex.com", name: "Financeiro", role: "comercial" };
  const editor: Staff = { ...admin, role: "editor" };

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "conv"));
    // Cliques: dois exatos (demo, com sub-ID) e três de um programa só-tag (amazon_br) na janela.
    const offer = async (sku: string) => (await sql<{ id: string; variant_id: string; merchant_id: string; product_id: string }[]>`
      SELECT o.id, o.variant_id, o.merchant_id, v.product_id FROM commerce.offer o JOIN catalog.product_variant v ON v.id = o.variant_id
      WHERE v.sku = ${sku} LIMIT 1`)[0]!;
    const add = async (ref: string, sku: string, program: string, path: string, cta: string, hoursAgo: number, source = "site") => {
      const o = await offer(sku);
      await sql`
        INSERT INTO analytics.click (click_ref, ts, offer_id, product_id, variant_id, merchant_id, source_path, page_type, cta_id, utm, program_key, is_bot)
        VALUES (${ref}, now() - make_interval(hours => ${hoursAgo}), ${o.id}, ${o.product_id}, ${o.variant_id}, ${o.merchant_id}, ${path},
                ${path.startsWith("/melhores") ? "best_list" : "product"}, ${cta}, ${sql.json({ utm_source: source })}, ${program}, false)`;
    };
    await add("EXATO00001", "v-orbita-s9-256gb", "demo", "/celulares/orbita-s9", "hero_best_offer", 5);
    await add("EXATO00002", "v-kaiju-volt-256gb", "demo", "/melhores/celulares-ate-3000", "guide_pick_best", 3, "youtube");
    await add("TAG0000001", "v-nebula-aurora-x1-256gb", "amazon_br", "/celulares/nebula-aurora-x1", "offers_table", 2);
    await add("TAG0000002", "v-nebula-aurora-x1-256gb", "amazon_br", "/melhores/celulares-ate-3000", "guide_pick_best", 4);
    await add("BOT0000001", "v-nebula-aurora-x1-256gb", "amazon_br", "/celulares/nebula-aurora-x1", "sticky_bar", 1);
    await sql`UPDATE analytics.click SET is_bot = true WHERE click_ref = 'BOT0000001'`;
  }, 60_000);
  afterAll(async () => {
    await drop?.();
  });

  const now = new Date().toISOString();

  it("is forbidden for editors (commercial firewall)", async () => {
    await expect(importConversions(sql, editor, { programKey: "demo", format: "planilha", content: "pedido\n1\n" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(revenueSummary(sql, editor)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("imports idempotently and attributes exactly by click_ref", async () => {
    const csv = `pedido,sub_id,data,valor,comissao,status\nP-1,EXATO00001,${now},2899.00,"86,97",pendente\nP-2,EXATO00002,${now},1799.00,"53,97",aprovada\nP-3,,${now},199.00,"5,97",pendente\n`;
    const s1 = await importConversions(sql, admin, { programKey: "demo", format: "planilha", content: csv });
    expect(s1).toMatchObject({ total: 3, created: 3, invalid: 0, exactAttribution: 2 });
    const s2 = await importConversions(sql, admin, { programKey: "demo", format: "planilha", content: csv });
    expect(s2).toMatchObject({ created: 0, unchanged: 3 });
  });

  it("allocates tag-only sales across non-bot clicks in the cookie window", async () => {
    const csv = `pedido,tag,data,valor,comissao,status\nAMZ-1,veredito-20,${now},1000.00,"40,00",estimada\n`;
    await importConversions(sql, admin, { programKey: "amazon_br", format: "planilha", content: csv });
    const rows = await sql<{ click_ref: string; weight: string; method: string }[]>`
      SELECT a.click_ref, a.weight, a.method FROM commerce.conversion_attribution a JOIN commerce.conversion c ON c.id = a.conversion_id
      WHERE c.external_id = 'AMZ-1' ORDER BY a.click_ref`;
    expect(rows.map((r) => [r.click_ref, Number(r.weight), r.method])).toEqual([["TAG0000001", 0.5, "allocated"], ["TAG0000002", 0.5, "allocated"]]);
  });

  it("advances status, records history and handles reversals", async () => {
    await importConversions(sql, admin, { programKey: "demo", format: "planilha",
      content: `pedido,sub_id,data,valor,comissao,status\nP-1,EXATO00001,${now},2899.00,"86,97",aprovada\nP-3,,${now},199.00,"5,97",cancelada\n` });
    const recent = await recentConversions(sql, admin);
    const p1 = recent.find((r) => r.external_id === "P-1")!;
    expect(p1.status).toBe("approved");
    expect(p1.history.map((h) => h.to)).toEqual(["validating", "approved"]);
    expect(recent.find((r) => r.external_id === "P-3")!.status).toBe("reversed");
    // Relatório atrasado não faz voltar o status.
    await importConversions(sql, admin, { programKey: "demo", format: "planilha", content: `pedido,sub_id,data,valor,comissao,status\nP-1,EXATO00001,${now},2899.00,"86,97",pendente\n` });
    expect((await recentConversions(sql, admin)).find((r) => r.external_id === "P-1")!.status).toBe("approved");
  });

  it("reports revenue by content, channel and summary (reversed excluded)", async () => {
    const sum = await revenueSummary(sql, admin);
    expect(sum.commission).toBeCloseTo(86.97 + 53.97 + 40, 2);
    expect(sum.orders).toBe(3);
    expect(sum.clicks).toBe(4); // robô fora
    expect(sum.exactShare).toBeCloseTo((86.97 + 53.97) / (86.97 + 53.97 + 40), 3);
    const byContent = await revenueBy(sql, admin, "source_path");
    const guide = byContent.find((r) => r.key === "/melhores/celulares-ate-3000")!;
    expect(guide.commission).toBeCloseTo(53.97 + 20, 2);
    expect(guide.clicks).toBe(2);
    expect(guide.epc).toBeCloseTo((53.97 + 20) / 2, 1); // EPC é arredondado em centavos
    const byChannel = await revenueBy(sql, admin, "channel");
    expect(byChannel.find((r) => r.key === "youtube")!.commission).toBeCloseTo(53.97, 2);
  });
});
