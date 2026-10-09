import Link from "next/link";
import { brand } from "@veredito/brand";
import { can, ROLE_LABELS } from "@veredito/db/admin";
import { logoutAction } from "../actions";
import { AdminNav } from "@/components/AdminNav";
import { LogoMark } from "@/components/Icon";
import { requireStaff } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();
  const links = [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/produtos", label: "Produtos" },
    can(staff.role, "offers:write") && { href: "/admin/ofertas", label: "Ofertas e matching" },
    { href: "/admin/conteudo", label: "Conteúdo" },
    can(staff.role, "content:write") && { href: "/admin/newsletter", label: "Newsletter" },
    can(staff.role, "commission:read") && { href: "/admin/receita", label: "Receita" },
    can(staff.role, "staff:manage") && { href: "/admin/emails", label: "E-mails" },
    can(staff.role, "staff:manage") && { href: "/admin/webhooks", label: "Webhooks (CRM)" },
    can(staff.role, "audit:read") && { href: "/admin/auditoria", label: "Auditoria" },
  ].filter((l): l is { href: string; label: string } => Boolean(l));
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Painel">
        <div className="admin-brand">
          <Link href="/admin" className="logo"><LogoMark />{brand.name}</Link>
          <span className="small">{staff.name} — {ROLE_LABELS[staff.role]}</span>
        </div>
        <AdminNav links={links} />
        <div className="admin-foot">
          <Link href="/" target="_blank">Ver site ↗</Link>
          <form action={logoutAction}><button className="btn btn-ghost btn-sm" type="submit">Sair</button></form>
        </div>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
