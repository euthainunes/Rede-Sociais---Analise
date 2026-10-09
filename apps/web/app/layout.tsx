import type { Metadata, Viewport } from "next";
import { brand } from "@veredito/brand";
import { isDemo } from "@/lib/data";
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
        {children}
      </body>
    </html>
  );
}
