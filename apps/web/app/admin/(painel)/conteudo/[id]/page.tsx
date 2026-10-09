import Link from "next/link";
import { notFound } from "next/navigation";
import { allowedTransitions, can, getContentAdmin, STATUS_LABELS, type ContentStatus } from "@veredito/db/admin";
import { transitionContentAction } from "../../../actions";
import { Flash } from "../../../Flash";
import { ContentForm } from "../ContentForm";
import { requireStaff, sectionsToText } from "@/lib/admin";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function EditContent({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { staff, sql } = await requireStaff("dashboard:read");
  const data = await getContentAdmin(sql, id);
  if (!data) notFound();
  const c = data.content;
  const status = c.status as ContentStatus;
  const body = (c.body ?? {}) as { kind?: string; intro?: string; sections?: { heading: string; text: string }[]; picks?: { role: string; productSlug: string; note: string }[] };
  const transitions = allowedTransitions(status).filter((t) =>
    can(staff.role, t === "published" || t === "archived" ? "content:publish" : "content:write"));
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{c.title}</h1>
        <span className="status">{STATUS_LABELS[status]}</span>
      </div>
      <Flash sp={await searchParams} />
      {status === "published" && <p><Link href={c.url_path} target="_blank">Ver publicado ↗</Link></p>}
      {transitions.length > 0 && (
        <form action={transitionContentAction} className="row" style={{ marginBottom: 16 }}>
          <input type="hidden" name="id" value={c.id} />
          <span className="small muted">Mover para:</span>
          {transitions.map((t) => <button key={t} className={`btn btn-sm ${t === "published" ? "btn-primary" : "btn-ghost"}`} type="submit" name="to" value={t}>{STATUS_LABELS[t]}</button>)}
        </form>
      )}
      <ContentForm canWrite={can(staff.role, "content:write")} v={{
        id: c.id, kind: body.kind ?? c.type, title: c.title, products: (c.product_slugs ?? []).join(", "), evidence: c.evidence_level ?? "",
        intro: body.intro ?? "", sections: sectionsToText(body.sections), picks: (body.picks ?? []).map((p) => `${p.role} | ${p.productSlug} | ${p.note}`).join("\n"),
      }} />
      <h2>Revisões</h2>
      <ul>{data.revisions.map((r, i) => <li key={i} className="small">{new Date(r.created_at).toLocaleString("pt-BR")} — {r.email ?? "sistema"}{r.change_note ? `: ${r.change_note}` : ""}</li>)}</ul>
    </>
  );
}
