import Link from "next/link";
import { brand } from "@veredito/brand";
import { celulares } from "@veredito/core";
import { ProductCard } from "@/components/ProductCard";
import { catalog } from "@/lib/data";
import { money, pct } from "@/lib/format";

export const revalidate = 900;

export default async function Home() {
  const [top, deals, guides] = await Promise.all([
    catalog().listCategory("celulares"),
    catalog().deals("celulares"),
    catalog().listContent("best_list"),
  ]);
  return (
    <div className="stack">
      <section style={{ marginTop: 32 }}>
        <h1>O que você quer comprar?</h1>
        <p className="muted">{brand.tagline} Notas com metodologia aberta, histórico real de preços e uma recomendação para o seu perfil.</p>
        <form action="/buscar" className="search" role="search" style={{ maxWidth: 640 }}>
          <label htmlFor="q-home" className="sr-only">Buscar</label>
          <input id="q-home" name="q" type="search" placeholder="Ex.: melhor celular para jogos até R$ 3.000" />
          <button type="submit">Buscar</button>
        </form>
        <div className="row" style={{ marginTop: 12 }}>
          {celulares.profiles.map((p) => (
            <Link key={p.key} className="chip" href={`/consultor?uso=${p.key}`}>{p.label}</Link>
          ))}
        </div>
      </section>

      <section className="soft">
        <h2 style={{ marginTop: 0 }}>Não sabe qual escolher?</h2>
        <p>Responda 4 perguntas e veja o celular que nós compraríamos no seu lugar — com o porquê.</p>
        <Link className="btn btn-primary" href="/consultor">Começar</Link>
      </section>

      <section>
        <h2>Preços realmente baixos hoje</h2>
        <p className="muted small">Desconto calculado contra a mediana dos últimos 90 dias — não contra o “preço de” da loja.</p>
        <div className="grid">
          {deals.slice(0, 4).map((d) => (
            <ProductCard key={d.variant.id} p={d.product}
              highlight={`${pct(d.variant.realDiscount)} abaixo da mediana · ${d.variant.label}`}
              note={`${money(d.variant.best!.total)} na ${d.variant.best!.merchantName}`} />
          ))}
        </div>
        <p><Link href="/ofertas">Ver todas as ofertas →</Link></p>
      </section>

      <section>
        <h2>Guias de compra</h2>
        <ul>
          {guides.map((g) => <li key={g.id}><Link href={g.path}>{g.title}</Link></li>)}
          <li><Link href="/comparar?p=nebula-aurora-x1,orbita-s9">Aurora X1 vs Órbita S9</Link></li>
        </ul>
      </section>

      <section>
        <h2>Celulares mais bem avaliados</h2>
        <div className="grid">{top.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="soft">
        <h2 style={{ marginTop: 0 }}>Por que confiar</h2>
        <ul>
          <li>Notas calculadas por <Link href="/metodologia/celulares">metodologia pública e versionada</Link>.</li>
          <li>Histórico de preço coletado por nós em várias lojas, com horário de cada coleta.</li>
          <li>Comissão não entra em nenhum cálculo de nota ou ranking — <Link href="/como-ganhamos-dinheiro">veja como ganhamos dinheiro</Link>.</li>
        </ul>
      </section>
    </div>
  );
}
