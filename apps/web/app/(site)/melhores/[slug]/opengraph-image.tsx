import { catalog } from "@/lib/data";
import { score } from "@/lib/format";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Guia de compra com as escolhas e as notas";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const ROLE = { best: "Nossa escolha", premium: "Premium", value: "Custo-benefício", budget: "Mais barato" };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const b = await catalog().bestList(`/melhores/${slug}`);
  if (!b) return ogCard({ eyebrow: "Guia", title: "Guia não encontrado" });
  return ogCard({
    eyebrow: "Guia de compra",
    layout: "list",
    title: b.content.title,
    stats: b.picks.slice(0, 3).map((p) => ({ label: ROLE[p.role as keyof typeof ROLE] ?? p.role, value: `${p.product!.name} · nota ${score(p.product!.scores.overall)}` })),
  });
}
