import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { catalog } from "@/lib/data";
import { dateBR } from "@/lib/format";
import { itemListJsonLd } from "@/lib/seo";

export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };

const ROLE = { best: "Nossa escolha", premium: "Para jogos / premium", value: "Melhor custo-benefício", budget: "Mais barato" };

export async function generateStaticParams() {
  return (await catalog().listContent("best_list")).map((c) => ({ slug: c.path.split("/").pop()! }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await catalog().bestList(`/melhores/${slug}`);
  if (!b) return {};
  return {
    title: b.content.title,
    description: `${b.content.intro ?? ""} Nossa escolha: ${b.picks[0]?.product?.name ?? ""}.`.trim(),
    alternates: { canonical: b.content.path },
  };
}

export default async function BestListPage({ params }: Props) {
  const { slug } = await params;
  const b = await catalog().bestList(`/melhores/${slug}`);
  if (!b) notFound();
  return (
    <article>
      <Breadcrumbs items={[{ name: "Celulares", path: "/celulares" }, { name: b.content.title, path: b.content.path }]} />
      <h1>{b.content.title}</h1>
      <p className="small muted">{b.content.author} · atualizado em {dateBR(b.content.updatedAt)}</p>
      {b.content.intro && <p>{b.content.intro}</p>}
      <section className="soft">
        <h2 style={{ marginTop: 0 }}>Resposta rápida</h2>
        <ul>
          {b.picks.map((p) => (
            <li key={p.role}><strong>{ROLE[p.role]}:</strong> <Link href={p.product!.url}>{p.product!.name}</Link> — {p.note}</li>
          ))}
        </ul>
      </section>
      <div className="grid" style={{ marginTop: 16 }}>
        {b.picks.map((p) => <ProductCard key={p.role} p={p.product!} highlight={ROLE[p.role]} note={p.note} />)}
      </div>
      {b.content.sections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.text}</p></section>)}
      <p><Link href={`/comparar?p=${b.picks.slice(0, 3).map((p) => p.product!.slug).join(",")}`} rel="nofollow">Comparar as escolhas lado a lado →</Link></p>
      <JsonLd data={itemListJsonLd(b.content.title, b.picks.map((p) => p.product!))} />
    </article>
  );
}
