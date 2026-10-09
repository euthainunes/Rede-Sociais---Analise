import { describe, expect, it } from "vitest";
import {
  PROGRAMS,
  createAmazonAdapter,
  createAwinAdapter,
  createTemplateAdapter,
  emailMayLinkDirectly,
  extractAsin,
  parseBrlNumber,
  parseCsv,
} from "./index.ts";

const ctx = { clickRef: "Ab3dE6gH9k", channel: "organic", pageType: "product" };

describe("csv", () => {
  it("parses quotes, escaped quotes and newlines", () => {
    expect(parseCsv('a,b\n"x, y","he said ""hi"""\n"multi\nline",2\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
      ["multi\nline", "2"],
    ]);
  });
  it("parses Brazilian numbers", () => {
    expect(parseBrlNumber("R$ 1.299,90")).toBe(1299.9);
    expect(parseBrlNumber("1299.90")).toBe(1299.9);
    expect(parseBrlNumber("1.299")).toBe(1299);
    expect(parseBrlNumber("")).toBeNull();
  });
});

describe("amazon", () => {
  const a = createAmazonAdapter({ defaultTag: "veredito-20", tagsByChannel: { youtube: "veredito-yt-20" } });
  it("builds a clean /dp/ URL with the channel tag", () => {
    const url = a.buildAffiliateUrl("https://www.amazon.com.br/Celular-X/dp/B0ABCDEF12/ref=sr_1_1?tag=other-20&keywords=x", { ...ctx, channel: "youtube" });
    expect(url).toBe("https://www.amazon.com.br/dp/B0ABCDEF12?tag=veredito-yt-20");
  });
  it("refuses foreign hosts", () => {
    expect(() => a.buildAffiliateUrl("https://evil.example/dp/B0ABCDEF12", ctx)).toThrow();
  });
  it("extracts ASIN", () => {
    expect(extractAsin("https://www.amazon.com.br/gp/product/b0abcdef12?x=1")).toBe("B0ABCDEF12");
  });
});

describe("awin", () => {
  const aw = createAwinAdapter({ publisherId: "111", advertiserId: "222" });
  it("puts click_ref in clickref and encodes destination", () => {
    const u = new URL(aw.buildAffiliateUrl("https://loja.example/p/123?cor=preto", ctx));
    expect(u.searchParams.get("clickref")).toBe(ctx.clickRef);
    expect(u.searchParams.get("ued")).toBe("https://loja.example/p/123?cor=preto");
    expect(aw.fidelity).toBe("click");
  });
  it("parses feed and conversions", () => {
    const feed = "merchant_product_id,product_name,merchant_deep_link,search_price,rrp_price,in_stock,ean\n" +
      'X1,"Nebula Aurora X1 256GB",https://loja.example/x1,"2.499,00","2.999,00",1,7890000000011\n';
    expect(aw.parseFeed!(feed)[0]).toMatchObject({ externalId: "X1", priceCash: 2499, priceList: 2999, availability: "in_stock", gtin: "7890000000011" });
    const conv = "transaction_id,click_ref,transaction_date,sale_amount,commission_amount,commission_status\nT1,Ab3dE6gH9k,2026-10-01,2499.00,74.97,approved\n";
    expect(aw.parseConversions!(conv)[0]).toMatchObject({ externalId: "T1", clickRef: "Ab3dE6gH9k", commission: 74.97, status: "approved" });
  });
});

describe("template", () => {
  const t = createTemplateAdapter({
    key: "mercadolivre",
    fidelity: "tag",
    linkTemplate: "https://go.example/r?u={url_encoded}&sub={click_ref}&c={channel}",
    allowedHosts: ["mercadolivre.com.br"],
  });
  it("fills placeholders and validates host", () => {
    const out = t.buildAffiliateUrl("https://produto.mercadolivre.com.br/MLB-1", ctx);
    expect(out).toBe("https://go.example/r?u=https%3A%2F%2Fproduto.mercadolivre.com.br%2FMLB-1&sub=Ab3dE6gH9k&c=organic");
    expect(() => t.buildAffiliateUrl("https://mercadolivre.com.br.evil.example/x", ctx)).toThrow();
  });
  it("parses a manual Portuguese CSV feed", () => {
    const feed = "id,titulo,url,preco_a_vista,disponibilidade,condicao\nMLB1,Nebula Aurora X1,https://produto.mercadolivre.com.br/MLB1,\"2.399,00\",sim,recondicionado\n";
    expect(t.parseFeed!(feed)[0]).toMatchObject({ priceCash: 2399, availability: "in_stock", condition: "refurbished" });
  });
});

describe("programs", () => {
  it("are ordered by priority and never allow email deep links by default", () => {
    expect(PROGRAMS.map((p) => p.priority)).toEqual([1, 2, 3, 4, 5]);
    expect(PROGRAMS.every((p) => !emailMayLinkDirectly(p))).toBe(true);
  });
});
