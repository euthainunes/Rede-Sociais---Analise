/**
 * DADOS DE DEMONSTRAÇÃO — marcas, produtos, lojas e preços FICTÍCIOS, gerados de forma determinística.
 * Servem para desenvolver e testar o site sem banco e sem acesso a programas de afiliados.
 * Nada aqui representa produto ou preço real. Em produção, `is_demo = true` impede publicação.
 */
import type { Availability, Condition, DailyPrice, Specs } from "@veredito/core";

export interface DemoBrand { id: string; slug: string; name: string }
export interface DemoMerchant { id: string; slug: string; name: string; trust: number; programKey: string; host: string }
export interface DemoVariant { id: string; slug: string; label: string; axes: Record<string, string>; gtin: string; basePrice: number }
export interface DemoProduct {
  id: string;
  slug: string;
  name: string;
  model: string;
  brandId: string;
  category: string;
  releaseDate: string;
  summary: string;
  forWho: string[];
  notForWho: string[];
  pros: string[];
  cons: string[];
  specs: Specs;
  variants: DemoVariant[];
  successorSlug?: string;
}
export interface DemoOffer {
  id: string;
  variantId: string;
  merchantId: string;
  externalId: string;
  title: string;
  url: string;
  priceCash: number;
  priceList: number | null;
  priceInstallment: number;
  installments: number;
  shippingCost: number;
  availability: Availability;
  condition: Condition;
  sellerName: string;
  lastCheckedAt: string;
}
export interface DemoContent {
  id: string;
  type: "review" | "best_list" | "guide" | "methodology";
  path: string;
  title: string;
  category: string | null;
  productSlugs: string[];
  evidenceLevel: "hands_on" | "data_based" | null;
  author: string;
  publishedAt: string;
  updatedAt: string;
  intro?: string;
  sections: { heading: string; text: string }[];
  picks?: { role: "best" | "budget" | "premium" | "value"; productSlug: string; note: string }[];
}

/** Data de referência dos dados de demonstração (determinístico). */
export const DEMO_TODAY = "2026-10-08";

export const brands: DemoBrand[] = [
  { id: "b-nebula", slug: "nebula", name: "Nébula" },
  { id: "b-orbita", slug: "orbita", name: "Órbita" },
  { id: "b-kaiju", slug: "kaiju", name: "Kaiju" },
  { id: "b-lumen", slug: "lumen", name: "Lumen" },
];

export const merchants: DemoMerchant[] = [
  { id: "m-alfa", slug: "loja-alfa", name: "Loja Alfa", trust: 0.92, programKey: "demo", host: "loja-alfa.example" },
  { id: "m-beta", slug: "mega-beta", name: "Mega Beta", trust: 0.85, programKey: "demo", host: "mega-beta.example" },
  { id: "m-gama", slug: "gama-store", name: "Gama Store", trust: 0.74, programKey: "demo", host: "gama-store.example" },
];

const gtin = (n: number) => `200${String(n).padStart(9, "0")}0`;

function v(productSlug: string, storage: string, basePrice: number, n: number, color = "preto"): DemoVariant {
  const label = `${storage.replace("gb", " GB").replace("tb", " TB")} · ${color[0]!.toUpperCase()}${color.slice(1)}`;
  return { id: `v-${productSlug}-${storage}`, slug: `${storage}-${color}`, label, axes: { storage, color }, gtin: gtin(n), basePrice };
}

function phone(p: Omit<DemoProduct, "id" | "category"> & { category?: string }): DemoProduct {
  return { ...p, id: `p-${p.slug}`, category: p.category ?? "celulares" };
}

export const products: DemoProduct[] = [
  phone({
    slug: "nebula-aurora-x1", name: "Nébula Aurora X1", model: "Aurora X1", brandId: "b-nebula", releaseDate: "2026-03-10",
    summary: "O intermediário com a melhor câmera da faixa; bateria boa e atualizações longas.",
    forWho: ["Quem tira muitas fotos e quer gastar menos de R$ 3.000", "Quem quer suporte de software por muitos anos"],
    notForWho: ["Quem joga títulos pesados com gráficos no máximo", "Quem precisa de zoom de longo alcance"],
    pros: ["Câmera principal excelente com estabilização óptica", "6 anos de atualizações de sistema", "Tela OLED brilhante"],
    cons: ["Desempenho em jogos pesados apenas mediano", "Carregamento de 45 W, abaixo dos rivais"],
    specs: {
      screen_inches: 6.5, screen_type: "oled", screen_is_oled: true, screen_resolution: "2400 x 1080", refresh_rate_hz: 120, peak_brightness_nits: 2200,
      chipset: "Nébula N7 Gen 2", cpu_benchmark: 4100, gpu_benchmark: 7200, ram_gb: 8, storage_gb: 256,
      main_camera_mp: 50, optical_zoom_x: 2, ois: true, camera_test_score: 8.9, front_camera_mp: 32,
      battery_mah: 5000, battery_test_hours: 17.5, charging_w: 45, os: "android", os_update_years: 6, security_update_years: 6,
      five_g: true, nfc: true, wifi: "Wi-Fi 6E", bluetooth: "5.3", ip_rating: "ip67", water_resistance_level: 2,
      weight_g: 187, dimensions_mm: "157 x 74 x 8,1", premium_materials: true, warranty_months: 12,
    },
    variants: [v("nebula-aurora-x1", "256gb", 2799, 1), v("nebula-aurora-x1", "512gb", 3199, 2)],
  }),
  phone({
    slug: "nebula-aurora-x1-pro", name: "Nébula Aurora X1 Pro", model: "Aurora X1 Pro", brandId: "b-nebula", releaseDate: "2026-03-10",
    summary: "Topo de linha completo para fotografia, com zoom de 5x; caro para quem não aproveita a câmera.",
    forWho: ["Fotógrafos amadores exigentes", "Quem quer o melhor zoom da marca"],
    notForWho: ["Quem quer gastar menos de R$ 5.000", "Quem prefere celular leve"],
    pros: ["Zoom óptico de 5x", "Melhor tela da linha", "Construção premium com IP68"],
    cons: ["Preço alto", "Pesado (221 g)"],
    specs: {
      screen_inches: 6.8, screen_type: "oled", screen_is_oled: true, screen_resolution: "3120 x 1440", refresh_rate_hz: 120, peak_brightness_nits: 3000,
      chipset: "Nébula N9 Elite", cpu_benchmark: 7600, gpu_benchmark: 15500, ram_gb: 12, storage_gb: 256,
      main_camera_mp: 200, optical_zoom_x: 5, ois: true, camera_test_score: 9.6, front_camera_mp: 32,
      battery_mah: 5000, battery_test_hours: 16.8, charging_w: 65, os: "android", os_update_years: 7, security_update_years: 7,
      five_g: true, nfc: true, wifi: "Wi-Fi 7", bluetooth: "5.4", ip_rating: "ip68", water_resistance_level: 3,
      weight_g: 221, dimensions_mm: "163 x 77 x 8,6", premium_materials: true, warranty_months: 12,
    },
    variants: [v("nebula-aurora-x1-pro", "256gb", 4999, 3), v("nebula-aurora-x1-pro", "512gb", 5599, 4)],
  }),
  phone({
    slug: "nebula-aurora-lite", name: "Nébula Aurora Lite", model: "Aurora Lite", brandId: "b-nebula", releaseDate: "2025-11-20",
    summary: "Básico bem resolvido: tela boa e bateria longa por pouco dinheiro.",
    forWho: ["Uso básico: mensagens, redes sociais e vídeos", "Primeiro smartphone"],
    notForWho: ["Quem joga", "Quem fotografa à noite"],
    pros: ["Preço baixo", "Bateria de 5.500 mAh", "NFC"],
    cons: ["Tela LCD", "Câmera fraca com pouca luz", "Só 4 anos de atualização"],
    specs: {
      screen_inches: 6.6, screen_type: "lcd", screen_is_oled: false, screen_resolution: "1600 x 720", refresh_rate_hz: 90, peak_brightness_nits: 800,
      chipset: "Nébula N3", cpu_benchmark: 1900, gpu_benchmark: 2100, ram_gb: 6, storage_gb: 128,
      main_camera_mp: 50, optical_zoom_x: 1, ois: false, camera_test_score: 6.1, front_camera_mp: 8,
      battery_mah: 5500, battery_test_hours: 19.2, charging_w: 25, os: "android", os_update_years: 4, security_update_years: 5,
      five_g: true, nfc: true, wifi: "Wi-Fi 5", bluetooth: "5.2", ip_rating: "ip54", water_resistance_level: 1,
      weight_g: 192, dimensions_mm: "165 x 76 x 8,4", premium_materials: false, warranty_months: 12,
    },
    variants: [v("nebula-aurora-lite", "128gb", 1399, 5), v("nebula-aurora-lite", "256gb", 1599, 6)],
  }),
  phone({
    slug: "orbita-s9", name: "Órbita S9", model: "S9", brandId: "b-orbita", releaseDate: "2026-05-02",
    summary: "O melhor para jogos abaixo de R$ 3.000: processador topo e tela de 144 Hz.",
    forWho: ["Quem joga títulos pesados", "Quem quer desempenho de topo gastando menos"],
    notForWho: ["Quem prioriza câmera", "Quem quer atualizações por muitos anos"],
    pros: ["Desempenho de topo de linha", "Tela de 144 Hz", "Carregamento de 90 W"],
    cons: ["Câmera apenas razoável à noite", "3 anos de atualização de sistema"],
    specs: {
      screen_inches: 6.7, screen_type: "oled", screen_is_oled: true, screen_resolution: "2712 x 1220", refresh_rate_hz: 144, peak_brightness_nits: 2600,
      chipset: "Órbita Hyper 9", cpu_benchmark: 7200, gpu_benchmark: 14800, ram_gb: 12, storage_gb: 256,
      main_camera_mp: 50, optical_zoom_x: 1, ois: true, camera_test_score: 7.4, front_camera_mp: 16,
      battery_mah: 5400, battery_test_hours: 16.2, charging_w: 90, os: "android", os_update_years: 3, security_update_years: 4,
      five_g: true, nfc: true, wifi: "Wi-Fi 7", bluetooth: "5.4", ip_rating: "ip54", water_resistance_level: 1,
      weight_g: 205, dimensions_mm: "162 x 75 x 8,7", premium_materials: true, warranty_months: 12,
    },
    variants: [v("orbita-s9", "256gb", 2899, 7), v("orbita-s9", "512gb", 3299, 8)],
  }),
  phone({
    slug: "orbita-s9-ultra", name: "Órbita S9 Ultra", model: "S9 Ultra", brandId: "b-orbita", releaseDate: "2026-05-02",
    summary: "O mais potente do catálogo, com câmera de topo; só vale para quem usa tudo isso.",
    forWho: ["Quem quer o máximo em tudo", "Criadores de conteúdo"],
    notForWho: ["Quem tem orçamento abaixo de R$ 6.000"],
    pros: ["Desempenho e câmera de topo", "Tela mais brilhante do catálogo", "Zoom óptico de 3,5x"],
    cons: ["Muito caro", "Grande e pesado"],
    specs: {
      screen_inches: 6.9, screen_type: "oled", screen_is_oled: true, screen_resolution: "3200 x 1440", refresh_rate_hz: 144, peak_brightness_nits: 3200,
      chipset: "Órbita Hyper 9 Max", cpu_benchmark: 8100, gpu_benchmark: 16900, ram_gb: 16, storage_gb: 256,
      main_camera_mp: 200, optical_zoom_x: 3.5, ois: true, camera_test_score: 9.4, front_camera_mp: 32,
      battery_mah: 5500, battery_test_hours: 17.1, charging_w: 120, os: "android", os_update_years: 5, security_update_years: 6,
      five_g: true, nfc: true, wifi: "Wi-Fi 7", bluetooth: "5.4", ip_rating: "ip68", water_resistance_level: 3,
      weight_g: 228, dimensions_mm: "164 x 78 x 8,9", premium_materials: true, warranty_months: 12,
    },
    variants: [v("orbita-s9-ultra", "256gb", 6999, 9), v("orbita-s9-ultra", "512gb", 7799, 10)],
  }),
  phone({
    slug: "orbita-a5", name: "Órbita A5", model: "A5", brandId: "b-orbita", releaseDate: "2025-08-15",
    summary: "O mais barato que recomendamos; serve para o básico, sem sobras.",
    forWho: ["Orçamento apertado", "Celular reserva"],
    notForWho: ["Quem joga", "Quem fotografa"],
    pros: ["Preço", "Bateria decente"],
    cons: ["Desempenho limitado", "Sem NFC", "Câmera fraca"],
    specs: {
      screen_inches: 6.5, screen_type: "lcd", screen_is_oled: false, screen_resolution: "1600 x 720", refresh_rate_hz: 90, peak_brightness_nits: 600,
      chipset: "Órbita Core 4", cpu_benchmark: 1500, gpu_benchmark: 1500, ram_gb: 4, storage_gb: 128,
      main_camera_mp: 50, optical_zoom_x: 1, ois: false, camera_test_score: 5.2, front_camera_mp: 5,
      battery_mah: 5000, battery_test_hours: 15.8, charging_w: 18, os: "android", os_update_years: 2, security_update_years: 3,
      five_g: false, nfc: false, wifi: "Wi-Fi 5", bluetooth: "5.0", ip_rating: "none", water_resistance_level: 0,
      weight_g: 195, dimensions_mm: "164 x 76 x 8,8", premium_materials: false, warranty_months: 12,
    },
    variants: [v("orbita-a5", "128gb", 1199, 11)],
  }),
  phone({
    slug: "kaiju-volt", name: "Kaiju Volt", model: "Volt", brandId: "b-kaiju", releaseDate: "2026-01-12",
    summary: "Bateria absurda por preço intermediário; o resto é correto.",
    forWho: ["Quem passa o dia longe da tomada", "Motoristas de aplicativo"],
    notForWho: ["Quem quer um celular leve", "Quem prioriza câmera"],
    pros: ["Bateria de 7.000 mAh", "Autonomia de mais de 24 h no teste", "5G e NFC"],
    cons: ["Pesado", "Câmera mediana", "Tela LCD"],
    specs: {
      screen_inches: 6.7, screen_type: "lcd", screen_is_oled: false, screen_resolution: "2400 x 1080", refresh_rate_hz: 120, peak_brightness_nits: 1000,
      chipset: "Kaiju K6", cpu_benchmark: 3100, gpu_benchmark: 4200, ram_gb: 8, storage_gb: 256,
      main_camera_mp: 64, optical_zoom_x: 1, ois: false, camera_test_score: 6.6, front_camera_mp: 16,
      battery_mah: 7000, battery_test_hours: 24.6, charging_w: 33, os: "android", os_update_years: 3, security_update_years: 4,
      five_g: true, nfc: true, wifi: "Wi-Fi 6", bluetooth: "5.3", ip_rating: "ip54", water_resistance_level: 1,
      weight_g: 219, dimensions_mm: "168 x 77 x 9,6", premium_materials: false, warranty_months: 12,
    },
    variants: [v("kaiju-volt", "256gb", 1799, 12)],
  }),
  phone({
    slug: "kaiju-volt-max", name: "Kaiju Volt Max", model: "Volt Max", brandId: "b-kaiju", releaseDate: "2026-06-20",
    summary: "Bateria enorme com desempenho bom para jogos; o equilíbrio da linha.",
    forWho: ["Quem joga e quer bateria para o dia todo"],
    notForWho: ["Quem prefere celular compacto"],
    pros: ["Bateria de 7.200 mAh", "Tela OLED de 120 Hz", "Bom desempenho"],
    cons: ["Pesado", "Sem zoom óptico"],
    specs: {
      screen_inches: 6.8, screen_type: "oled", screen_is_oled: true, screen_resolution: "2400 x 1080", refresh_rate_hz: 120, peak_brightness_nits: 1800,
      chipset: "Kaiju K8", cpu_benchmark: 5200, gpu_benchmark: 9800, ram_gb: 12, storage_gb: 256,
      main_camera_mp: 50, optical_zoom_x: 1, ois: true, camera_test_score: 7.3, front_camera_mp: 16,
      battery_mah: 7200, battery_test_hours: 23.4, charging_w: 67, os: "android", os_update_years: 4, security_update_years: 5,
      five_g: true, nfc: true, wifi: "Wi-Fi 6E", bluetooth: "5.3", ip_rating: "ip54", water_resistance_level: 1,
      weight_g: 214, dimensions_mm: "166 x 77 x 9,2", premium_materials: true, warranty_months: 12,
    },
    variants: [v("kaiju-volt-max", "256gb", 2399, 13)],
  }),
  phone({
    slug: "lumen-one", name: "Lumen One", model: "One", brandId: "b-lumen", releaseDate: "2025-10-01",
    summary: "Equilibrado e bem acabado; sucessor anunciado para breve.",
    forWho: ["Quem quer um aparelho premium sem extremos"],
    notForWho: ["Quem pode esperar o sucessor", "Quem precisa de bateria muito longa"],
    pros: ["Acabamento premium", "Câmera consistente", "Tela excelente"],
    cons: ["Bateria abaixo da média", "Sucessor previsto para os próximos meses"],
    specs: {
      screen_inches: 6.2, screen_type: "oled", screen_is_oled: true, screen_resolution: "2556 x 1179", refresh_rate_hz: 120, peak_brightness_nits: 2500,
      chipset: "Lumen L2", cpu_benchmark: 6400, gpu_benchmark: 12800, ram_gb: 8, storage_gb: 128,
      main_camera_mp: 48, optical_zoom_x: 2, ois: true, camera_test_score: 8.7, front_camera_mp: 12,
      battery_mah: 4300, battery_test_hours: 14.9, charging_w: 30, os: "android", os_update_years: 6, security_update_years: 7,
      five_g: true, nfc: true, wifi: "Wi-Fi 6E", bluetooth: "5.3", ip_rating: "ip68", water_resistance_level: 3,
      weight_g: 172, dimensions_mm: "148 x 71 x 7,8", premium_materials: true, warranty_months: 12,
    },
    variants: [v("lumen-one", "128gb", 4299, 14), v("lumen-one", "256gb", 4799, 15)],
  }),
  phone({
    slug: "lumen-one-mini", name: "Lumen One Mini", model: "One Mini", brandId: "b-lumen", releaseDate: "2026-02-14",
    summary: "O compacto que não compromete: tela de 5,9\" e câmera muito boa.",
    forWho: ["Quem quer um celular pequeno e leve", "Uso com uma mão"],
    notForWho: ["Quem assiste muitos vídeos", "Quem precisa de bateria longa"],
    pros: ["Compacto e leve (151 g)", "Câmera muito boa", "IP68"],
    cons: ["Bateria pequena", "Preço alto para o tamanho"],
    specs: {
      screen_inches: 5.9, screen_type: "oled", screen_is_oled: true, screen_resolution: "2340 x 1080", refresh_rate_hz: 120, peak_brightness_nits: 2000,
      chipset: "Lumen L2", cpu_benchmark: 6300, gpu_benchmark: 12000, ram_gb: 8, storage_gb: 128,
      main_camera_mp: 48, optical_zoom_x: 2, ois: true, camera_test_score: 8.5, front_camera_mp: 12,
      battery_mah: 3900, battery_test_hours: 13.6, charging_w: 30, os: "android", os_update_years: 6, security_update_years: 7,
      five_g: true, nfc: true, wifi: "Wi-Fi 6E", bluetooth: "5.3", ip_rating: "ip68", water_resistance_level: 3,
      weight_g: 151, dimensions_mm: "139 x 67 x 7,9", premium_materials: true, warranty_months: 12,
    },
    variants: [v("lumen-one-mini", "128gb", 3699, 16)],
  }),
];

// ───────── Geração determinística de ofertas e histórico
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const round = (x: number) => Math.round(x / 10) * 10 - 0.1;

/** Série diária (menor preço entre lojas) desde o lançamento ou 365 dias. */
export function demoSeries(variant: DemoVariant, releaseDate: string, today = DEMO_TODAY): DailyPrice[] {
  const r = rng(seedOf(variant.id));
  const end = Date.parse(`${today}T00:00:00Z`);
  const start = Math.max(Date.parse(`${releaseDate}T00:00:00Z`), end - 365 * DAY);
  const out: DailyPrice[] = [];
  const launch = variant.basePrice * 1.12;
  const totalDays = Math.round((end - start) / DAY);
  for (let t = start, i = 0; t <= end; t += DAY, i++) {
    const decay = 1 - 0.1 * Math.min(i / Math.max(totalDays, 1), 1); // tende a cair após o lançamento
    const wave = 1 + 0.035 * Math.sin(i / 9 + r() * 0.3);
    const promo = r() < 0.04 ? 0.9 : 1; // promoções esporádicas
    out.push({ day: new Date(t).toISOString().slice(0, 10), min: round(launch * decay * wave * promo) });
  }
  return out;
}

/** Preço atual (menor) — algumas variantes em promoção real, outras acima da média. */
export function currentPrice(variant: DemoVariant): number {
  const r = rng(seedOf(`${variant.id}:now`))();
  const factor = r < 0.3 ? 0.9 : r < 0.75 ? 0.99 : 1.05;
  return round(variant.basePrice * factor);
}

export const offers: DemoOffer[] = products.flatMap((p) =>
  p.variants.flatMap((variant) => {
    const low = currentPrice(variant);
    return merchants.map((m, idx): DemoOffer => {
      const r = rng(seedOf(`${variant.id}:${m.id}`))();
      const price = idx === 0 && r > 0.4 ? low : round(low * (1 + 0.015 + r * 0.06));
      const inflated = r > 0.5; // "preço de" inflado para demonstrar desconto enganoso
      return {
        id: `o-${variant.id}-${m.slug}`,
        variantId: variant.id,
        merchantId: m.id,
        externalId: `${m.slug.toUpperCase()}-${seedOf(variant.id + m.id) % 100000}`,
        title: `Smartphone ${p.name} ${variant.label.replace(" · ", " ")} 5G`,
        url: `https://${m.host}/produto/${p.slug}-${variant.slug}`,
        priceCash: idx === 1 && r < 0.35 ? low : price,
        priceList: inflated ? round(variant.basePrice * 1.45) : round(variant.basePrice * 1.08),
        priceInstallment: round(price * 1.08),
        installments: 10,
        shippingCost: idx === 2 ? 29.9 : 0,
        availability: idx === 2 && r < 0.2 ? "out_of_stock" : "in_stock",
        condition: "new",
        sellerName: m.name,
        lastCheckedAt: `${DEMO_TODAY}T${String(9 + idx * 2).padStart(2, "0")}:15:00-03:00`,
      };
    });
  }),
);

// ───────── Conteúdo editorial de demonstração
const review = (slug: string, sections: [string, string][], evidence: "hands_on" | "data_based" = "hands_on"): DemoContent => {
  const p = products.find((x) => x.slug === slug)!;
  return {
    id: `c-review-${slug}`, type: "review", path: `/celulares/${slug}`, title: `Review ${p.name}`, category: "celulares",
    productSlugs: [slug], evidenceLevel: evidence, author: "Equipe Veredito (demo)", publishedAt: "2026-09-01", updatedAt: "2026-10-01",
    sections: sections.map(([heading, text]) => ({ heading, text })),
  };
};

export const contents: DemoContent[] = [
  review("nebula-aurora-x1", [
    ["Resumo", "O Aurora X1 é o intermediário que mais acerta na câmera: no nosso teste de cenas padronizadas ficou à frente de aparelhos mais caros, inclusive à noite. A bateria passa do dia com folga e a promessa de seis anos de atualizações faz dele uma compra para durar."],
    ["Câmera", "A câmera principal de 50 MP com estabilização óptica entrega fotos noturnas limpas e boa faixa dinâmica. O zoom de 2x é útil para retratos, mas não substitui uma teleobjetiva de longo alcance."],
    ["Desempenho", "O processador dá conta de tudo no dia a dia. Em jogos pesados, roda bem em qualidade média; quem quer gráficos no máximo deve olhar o Órbita S9."],
    ["Bateria", "No teste de streaming em brilho fixo, durou 17,5 horas. O carregamento de 45 W é o ponto mais fraco frente aos rivais."],
    ["Custo-benefício", "Na faixa de R$ 2.500 a R$ 3.000, é a escolha mais segura para quem prioriza fotos."],
  ]),
  review("orbita-s9", [
    ["Resumo", "O Órbita S9 é o celular para jogos que recomendamos abaixo de R$ 3.000: desempenho de topo, tela de 144 Hz e carregamento muito rápido."],
    ["Desempenho", "Nos jogos mais pesados manteve taxa de quadros estável por 30 minutos sem aquecer em excesso. É o mais rápido da faixa."],
    ["Câmera", "Durante o dia as fotos são boas; à noite perde detalhes e o processamento é agressivo."],
    ["Software", "São três anos de atualizações de sistema, menos que concorrentes como o Aurora X1."],
  ]),
  review("kaiju-volt", [
    ["Resumo", "O Kaiju Volt existe para uma coisa: bateria. No nosso teste passou de 24 horas de streaming, a maior autonomia do catálogo."],
    ["Bateria", "A bateria de 7.000 mAh dura facilmente dois dias de uso moderado. O preço é o peso: 219 g."],
    ["Câmera", "Câmera correta de dia e fraca à noite."],
  ], "data_based"),
  {
    id: "c-best-ate-3000", type: "best_list", path: "/melhores/celulares-ate-3000", title: "Melhores celulares até R$ 3.000",
    category: "celulares", productSlugs: ["nebula-aurora-x1", "orbita-s9", "kaiju-volt-max", "kaiju-volt", "nebula-aurora-lite"],
    evidenceLevel: "hands_on", author: "Equipe Veredito (demo)", publishedAt: "2026-09-10", updatedAt: "2026-10-05",
    intro: "Comparamos os celulares vendidos até R$ 3.000 pela nossa metodologia de notas e pelo histórico de preço. Estas são as escolhas para cada perfil.",
    sections: [
      { heading: "Como escolhemos", text: "Consideramos apenas aparelhos com nota completa, oferta ativa e pelo menos três anos de atualizações. O preço considerado é o menor à vista entre lojas confiáveis." },
    ],
    picks: [
      { role: "best", productSlug: "nebula-aurora-x1", note: "Melhor câmera da faixa e atualizações longas." },
      { role: "premium", productSlug: "orbita-s9", note: "Para jogos, o mais rápido abaixo de R$ 3.000." },
      { role: "value", productSlug: "kaiju-volt-max", note: "Bateria enorme e bom desempenho." },
      { role: "budget", productSlug: "nebula-aurora-lite", note: "O básico bem feito por pouco." },
    ],
  },
  {
    id: "c-methodology-celulares", type: "methodology", path: "/metodologia/celulares", title: "Como avaliamos celulares",
    category: "celulares", productSlugs: [], evidenceLevel: null, author: "Equipe Veredito (demo)", publishedAt: "2026-09-01", updatedAt: "2026-09-01",
    sections: [
      { heading: "Nota geral", text: "A nota geral é a média ponderada de sete critérios: desempenho (20%), câmera (20%), bateria (15%), tela (15%), software e atualizações (10%), construção (10%) e custo-benefício (10%)." },
      { heading: "Notas por critério", text: "Cada critério combina medidas objetivas convertidas em percentil dentro da categoria nos últimos 24 meses. A editoria pode ajustar no máximo meio ponto, sempre com justificativa pública." },
      { heading: "Custo-benefício", text: "Comparamos a nota do aparelho com a curva de notas por preço da categoria. Acima da curva significa que entrega mais do que o preço sugere. Por depender do preço atual, é o único critério que muda com frequência." },
      { heading: "Independência", text: "Comissões de afiliados não fazem parte de nenhum cálculo. O sistema que calcula notas e rankings não tem acesso aos dados de comissão." },
    ],
  },
];
