import type { MetadataRoute } from "next";
import { brand } from "@veredito/brand";
import { categories } from "@veredito/core";
import { catalog, isDemo } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemo()) return [];
  const u = (p: string) => new URL(p, brand.url).toString();
  const [products, content] = await Promise.all([catalog().allSummaries(), catalog().listContent()]);
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    ...Object.keys(categories).map((c) => ({ url: u(`/${c}`), changeFrequency: "daily" as const, priority: 0.9 })),
    { url: u("/ofertas"), changeFrequency: "hourly", priority: 0.8 },
    ...products.map((p) => ({ url: u(p.url), changeFrequency: "daily" as const, priority: 0.8 })),
    ...content.filter((c) => c.type !== "review").map((c) => ({ url: u(c.path), lastModified: c.updatedAt, priority: 0.7 })),
    { url: u("/metodologia/precos"), priority: 0.4 },
    { url: u("/como-ganhamos-dinheiro"), priority: 0.4 },
  ];
}
