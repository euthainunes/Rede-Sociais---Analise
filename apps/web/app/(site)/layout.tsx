import Link from "next/link";
import { brand } from "@veredito/brand";
import { ConsentBanner } from "@/components/ConsentBanner";
import { LogoMark } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { MainNav } from "@/components/MainNav";
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
        <div className="wrap top-inner">
          <Link href="/" className="logo" aria-label={`${brand.name}, página inicial`}><LogoMark />{brand.name}</Link>
          <SearchBox />
          <MainNav />
        </div>
      </header>
      <main className="wrap site-main">{children}</main>
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Link href="/" className="logo"><LogoMark />{brand.name}</Link>
              <p className="mt4">{brand.tagline} {brand.name} é independente. Podemos receber comissão quando você compra pelos nossos links — isso nunca muda nossas notas ou recomendações.</p>
            </div>
            <nav aria-label="Transparência">
              <h2>Transparência</h2>
              <ul>
                <li><Link href="/metodologia/celulares">Como avaliamos</Link></li>
                <li><Link href="/metodologia/precos">Como analisamos preços</Link></li>
                <li><Link href="/como-ganhamos-dinheiro">Como ganhamos dinheiro</Link></li>
              </ul>
            </nav>
            <nav aria-label="Institucional">
              <h2>Você</h2>
              <ul>
                <li><Link href="/newsletter">Newsletter</Link></li>
                <li><Link href="/conta">Minha conta e alertas</Link></li>
                <li><Link href="/privacidade">Privacidade</Link></li>
              </ul>
            </nav>
          </div>
          <p className="foot-note">Preços e disponibilidade são das lojas e podem mudar a qualquer momento; mostramos sempre o horário da coleta.</p>
        </div>
      </footer>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <ConsentBanner gaId={process.env.NEXT_PUBLIC_GA4_ID ?? null} />
    </>
  );
}
