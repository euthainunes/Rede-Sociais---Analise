import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCategory } from "@veredito/core";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { catalog } from "@/lib/data";
import { dateBR } from "@/lib/format";

export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };

/** Explicadores criados no painel (Conteúdo › Explicador) são publicados em /guias/<endereço>. */
async function guide(slug: string) {
  const c = await catalog().contentAt(`/guias/${slug}`);
  return c?.type === "guide" ? c : null;
}

export async function generateStaticParams() {
  return (await catalog().listContent("guide")).filter((c) => c.path.startsWith("/guias/")).map((c) => ({ slug: c.path.split("/").pop()! }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await guide((await params).slug);
  if (!c) return {};
  return { title: c.title, description: c.intro ?? undefined, alternates: { canonical: c.path } };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const c = await guide(slug);
  if (!c) {
    const to = await catalog().redirectFor(`/guias/${slug}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const cat = c.category ? getCategory(c.category) : null;
  return (
    <article>
      <Breadcrumbs items={[{ name: "Tecnologia", path: "/" }, ...(cat ? [{ name: cat.name, path: `/${c.category}` }] : []), { name: c.title, path: c.path }]} />
      <header className="page-head">
        <span className="eyebrow"><Icon name="book" /> Guia</span>
        <h1>{c.title}</h1>
        <p className="small muted">{c.author} · atualizado em {dateBR(c.updatedAt)}</p>
        {c.intro && <p className="lead">{c.intro}</p>}
      </header>
      <div className="prose">
        {c.sections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.text}</p></section>)}
      </div>
    </article>
  );
}
