import { PRICE_LABELS } from "@veredito/core";
import { catalog } from "@/lib/data";
import { money, score } from "@/lib/format";
import { LABEL_COLORS, ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Nota, menor preço e veredito de preço do produto";
export const size = OG_SIZE;
export const contentType = "image/png";
// Preço muda: a imagem é refeita no máximo a cada hora.
export const revalidate = 3600;

type Props = { params: Promise<{ categoria: string; produto: string }> };

export default async function Image({ params }: Props) {
  const { categoria, produto } = await params;
  const page = await catalog().getProductPage(categoria, produto);
  if (!page) return ogCard({ eyebrow: "Produto", title: "Produto não encontrado" });
  const s = page.summary;
  const v = s.verdict && s.verdict.label !== "insufficient_data" ? s.verdict : null;
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return ogCard({
    eyebrow: `${s.brand} · ${page.config.name}`,
    title: s.name,
    stats: [
      { label: "Nota", value: `${score(s.scores.overall)}/10` },
      ...(s.bestPrice != null ? [{ label: "Menor preço", value: money(s.bestPrice) }] : []),
      ...(v ? [{ label: "Pelo histórico", value: PRICE_LABELS[v.label].text, color: LABEL_COLORS[v.label] }] : []),
    ],
    footnote: s.bestPrice != null ? `Preço de ${now}; pode mudar` : undefined,
  });
}
