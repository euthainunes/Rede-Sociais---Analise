import { brand } from "@veredito/brand";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "Reviews · comparação · histórico de preços",
    title: "Notas com metodologia aberta e o preço real de cada celular",
    footnote: brand.tagline,
  });
}
