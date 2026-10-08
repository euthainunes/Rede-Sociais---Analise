import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { brand } from "@veredito/brand";
import { ConsentBanner } from "@/components/ConsentBanner";
import { JsonLd } from "@/components/JsonLd";
import { isDemo } from "@/lib/data";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(brand.url),
    title: { default: `${brand.name} — ${brand.tagline}`, template: `%s | ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { siteName: brand.name, locale: "pt_BR", type: "website" },
    twitter: { card: "summary_large_image" },
    // Dados de demonstração nunca são indexados.
    robots: isDemo() ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {isDemo() && (
          <div className="demo" role="note">
            Modo demonstração: marcas, produtos, lojas e preços são fictícios.
          </div>
        )}
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo">{brand.name}</Link>
            <form action="/buscar" className="search" role="search">
              <label htmlFor="q" className="sr-only">Buscar</label>
              <input id="q" name="q" type="search" placeholder="Ex.: celular bom para fotos até 3 mil" autoComplete="off" />
              <button type="submit">Buscar</button>
            </form>
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
      </body>
    </html>
  );
}
