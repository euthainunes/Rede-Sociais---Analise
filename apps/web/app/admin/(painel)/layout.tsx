import Link from "next/link";
import { brand } from "@veredito/brand";
import { can, ROLE_LABELS } from "@veredito/db/admin";
import { logoutAction } from "../actions";
import { requireStaff } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Painel">
        <strong>{brand.name} · Painel</strong>
        <span className="small muted">{staff.name} — {ROLE_LABELS[staff.role]}</span>
        <Link href="/admin">Visão geral</Link>
        <Link href="/admin/produtos">Produtos</Link>
        {can(staff.role, "offers:write") && <Link href="/admin/ofertas">Ofertas e matching</Link>}
        <Link href="/admin/conteudo">Conteúdo</Link>
        {can(staff.role, "content:write") && <Link href="/admin/newsletter">Newsletter</Link>}
        {can(staff.role, "commission:read") && <Link href="/admin/receita">Receita</Link>}
        {can(staff.role, "staff:manage") && <Link href="/admin/emails">E-mails</Link>}
        {can(staff.role, "audit:read") && <Link href="/admin/auditoria">Auditoria</Link>}
        <Link href="/" target="_blank">Ver site ↗</Link>
        <form action={logoutAction} style={{ marginTop: "auto" }}><button className="btn btn-ghost btn-sm" type="submit">Sair</button></form>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
