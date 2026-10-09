import type { Metadata, Viewport } from "next";
import { brand } from "@veredito/brand";
import { isDemo } from "@/lib/data";
import localFont from "next/font/local";
import "./globals.css";

// Manrope variável, auto-hospedada (subconjunto latino): uma família só, sem requisição externa e com fallback ajustado.
const sans = localFont({ src: "./fonts/manrope-latin-wght.woff2", weight: "200 800", display: "swap", variable: "--font-sans" });

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
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
