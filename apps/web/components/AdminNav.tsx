"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Links do painel com a seção atual marcada. A lista (já filtrada por permissão) vem do layout no servidor. */
export function AdminNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="admin-links">
      {links.map((l) => {
        const current = l.href === "/admin" ? path === "/admin" : path === l.href || path.startsWith(`${l.href}/`);
        return <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>{l.label}</Link>;
      })}
    </div>
  );
}
