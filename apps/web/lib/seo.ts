import { brand } from "@veredito/brand";
import type { ProductPage, ProductSummary } from "@veredito/db";

const abs = (path: string) => new URL(path, brand.url).toString();

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: brand.url,
    sameAs: Object.values(brand.social).filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: brand.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${brand.url}/buscar?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

/** Product + AggregateOffer + Review editorial. Sem AggregateRating: não há avaliações de usuários coletadas. */
export function productJsonLd(page: ProductPage) {
  const { summary, product, variants } = page;
  const prices = variants.flatMap((v) => v.offers.map((o) => o.total));
  const offerCount = variants.reduce((n, v) => n + v.offers.length, 0);
  const gtin = product.variants.find((v) => v.id === page.selected.id)?.gtin;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    model: product.model,
    description: product.summary,
    ...(gtin ? { gtin } : {}),
    url: abs(summary.url),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: Math.min(...prices).toFixed(2),
            highPrice: Math.max(...prices).toFixed(2),
            offerCount,
          },
        }
      : {}),
    ...(summary.scores.overall != null
      ? {
          review: {
            "@type": "Review",
            author: { "@type": "Organization", name: brand.name },
            reviewRating: { "@type": "Rating", ratingValue: summary.scores.overall, bestRating: 10, worstRating: 0 },
            positiveNotes: { "@type": "ItemList", itemListElement: product.pros.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p })) },
            negativeNotes: { "@type": "ItemList", itemListElement: product.cons.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p })) },
          },
        }
      : {}),
  };
}

export function itemListJsonLd(name: string, products: ProductSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(p.url), name: p.name })),
  };
}
