import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, slugify } from "@veredito/core";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { catalog } from "@/lib/data";
import { itemListJsonLd } from "@/lib/seo";

export const revalidate = 900;

type Props = { params: Promise<{ categoria: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const cfg = getCategory(categoria);
  if (!cfg) return {};
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: `${cfg.name}: reviews, comparação e preços`,
    description: `Compare ${cfg.name.toLowerCase()} com notas por critério, histórico real de preços e recomendação para o seu perfil.`,
    alternates: { canonical: `/${categoria}` },
    // Combinações de filtros não são indexadas (docs/10 §10.2).
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  const sp = await searchParams;
  const cfg = getCategory(categoria);
  if (!cfg) notFound();

  const sort = sp.ordem === "preco" ? "price" : "score";
  let list = await catalog().listCategory(categoria, sort);
  const brands = [...new Map(list.map((p) => [slugify(p.brand), p.brand])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  if (sp.marca) list = list.filter((p) => slugify(p.brand) === sp.marca);
  const max = Number(sp.preco_max) || null;
  if (max) list = list.filter((p) => p.bestPrice != null && p.bestPrice <= max);
  if (sp["5g"] === "1") list = list.filter((p) => p.specs.five_g === true);
  if (sp.nfc === "1") list = list.filter((p) => p.specs.nfc === true);
  const minRam = Number(sp.ram) || null;
  if (minRam) list = list.filter((p) => typeof p.specs.ram_gb === "number" && p.specs.ram_gb >= minRam);

  // Filtros ativos viram chips removíveis: cada um aponta para a mesma busca sem aquele parâmetro.
  const brandName = new Map(brands).get(sp.marca ?? "");
  const active = [
    sp.preco_max && max ? { key: "preco_max", label: `Até R$ ${max.toLocaleString("pt-BR")}` } : null,
    sp.marca && brandName ? { key: "marca", label: brandName } : null,
    sp.ram && minRam ? { key: "ram", label: `${minRam} GB+ de RAM` } : null,
    sp["5g"] === "1" ? { key: "5g", label: "5G" } : null,
    sp.nfc === "1" ? { key: "nfc", label: "NFC" } : null,
  ].filter((x): x is { key: string; label: string } => x != null);
  const without = (key: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== key && v) as [string, string][]);
    return q.size ? `/${categoria}?${q}` : `/${categoria}`;
  };

  return (
    <>
      <Breadcrumbs items={[{ name: "Tecnologia", path: "/" }, { name: cfg.name, path: `/${categoria}` }]} />
      <header className="page-head">
        <h1>{cfg.name}</h1>
        <p className="lead">
          {list.length} modelos avaliados pela <Link href={`/metodologia/${categoria}`}>nossa metodologia</Link>. Preço = menor valor à vista entre lojas confiáveis.
        </p>
      </header>
      <section className="filters" aria-labelledby="h-filtros">
        <h2 id="h-filtros" className="sr-only">Filtros</h2>
        <form className="filters-form" method="get">
          <label>Preço até
            <select name="preco_max" defaultValue={sp.preco_max ?? ""}>
              <option value="">Qualquer</option>
              {cfg.priceBands.map((b) => <option key={b} value={b}>R$ {b.toLocaleString("pt-BR")}</option>)}
            </select>
          </label>
          <label>Marca
            <select name="marca" defaultValue={sp.marca ?? ""}>
              <option value="">Todas</option>
              {brands.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
            </select>
          </label>
          <label>RAM mínima
            <select name="ram" defaultValue={sp.ram ?? ""}>
              <option value="">Qualquer</option>
              {[6, 8, 12].map((r) => <option key={r} value={r}>{r} GB</option>)}
            </select>
          </label>
          <label>Ordenar
            <select name="ordem" defaultValue={sp.ordem ?? ""}>
              <option value="">Melhor nota</option>
              <option value="preco">Menor preço</option>
            </select>
          </label>
          <div className="toggles" role="group" aria-label="Conectividade">
            <label className="chip"><input type="checkbox" name="5g" value="1" defaultChecked={sp["5g"] === "1"} /> 5G</label>
            <label className="chip"><input type="checkbox" name="nfc" value="1" defaultChecked={sp.nfc === "1"} /> NFC</label>
          </div>
          <button className="btn btn-primary" type="submit"><Icon name="sliders" /> Aplicar</button>
        </form>
        {active.length > 0 && (
          <div className="active-filters">
            <span className="muted">Filtrando por:</span>
            {active.map((f) => (
              <Link key={f.key} className="chip" href={without(f.key)} aria-label={`Remover filtro ${f.label}`}>{f.label} <Icon name="x" /></Link>
            ))}
            <Link href={`/${categoria}`} className="small">Limpar tudo</Link>
          </div>
        )}
      </section>
      <h2 className="sr-only">Modelos</h2>
      <div className="results-bar"><span>{list.length === 1 ? "1 modelo" : `${list.length} modelos`} · ordenados por {sort === "price" ? "menor preço" : "melhor nota"}</span></div>
      <div className="grid">
        {list.map((p, i) => <ProductCard key={p.id} p={p} rank={sort === "score" && !active.length ? i + 1 : undefined} />)}
      </div>
      {list.length === 0 && <div className="empty"><strong>Nenhum modelo com esses filtros.</strong><Link href={`/${categoria}`}>Limpar filtros</Link></div>}
      <JsonLd data={itemListJsonLd(cfg.name, list)} />
    </>
  );
}
