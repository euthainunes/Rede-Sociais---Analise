"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/celulares", label: "Celulares" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/consultor", label: "Consultor" },
];

/** Navegação principal com a seção atual marcada (aria-current). */
export function MainNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
