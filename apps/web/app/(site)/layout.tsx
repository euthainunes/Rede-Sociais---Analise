import Link from "next/link";
import { brand } from "@veredito/brand";
import { ConsentBanner } from "@/components/ConsentBanner";
import { JsonLd } from "@/components/JsonLd";
import { SearchBox } from "@/components/SearchBox";
import { isDemo } from "@/lib/data";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {isDemo() && (
        <div className="demo" role="note">
          Modo demonstração: marcas, produtos, lojas e preços são fictícios.
        </div>
      )}
      <header className="top">
        <div className="wrap">
          <Link href="/" className="logo">{brand.name}</Link>
          <SearchBox />
          <nav className="nav" aria-label="Principal">
            <Link href="/celulares">Celulares</Link>
            <Link href="/ofertas">Ofertas</Link>
            <Link href="/consultor">Consultor</Link>
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="foot">
        <div className="wrap">
          <nav aria-label="Institucional">
            <Link href="/metodologia/celulares">Como avaliamos</Link>
            <Link href="/metodologia/precos">Como analisamos preços</Link>
            <Link href="/como-ganhamos-dinheiro">Como ganhamos dinheiro</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/newsletter">Newsletter</Link>
            <Link href="/conta">Minha conta</Link>
          </nav>
          <p>
            {brand.name} é independente. Podemos receber comissão quando você compra pelos nossos links — isso nunca
            muda nossas notas ou recomendações.
          </p>
          <p>Preços e disponibilidade são das lojas e podem mudar a qualquer momento; mostramos sempre o horário da coleta.</p>
        </div>
      </footer>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <ConsentBanner gaId={process.env.NEXT_PUBLIC_GA4_ID ?? null} />
    </>
  );
}
