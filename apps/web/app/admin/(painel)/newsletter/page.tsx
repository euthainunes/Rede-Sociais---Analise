import Link from "next/link";
import { can } from "@veredito/db/admin";
import { getEdition, listEditions, previewEdition } from "@veredito/db/people";
import { buildNewsletterAction, sendNewsletterAction, updateNewsletterAction } from "../../actions";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";

const STATUS: Record<string, string> = { draft: "rascunho", sending: "enviando", sent: "enviada", cancelled: "cancelada" };

type Props = { searchParams: Promise<{ ok?: string; erro?: string; id?: string }> };

/** Edição semanal: o worker monta o rascunho às segundas; a equipe revisa e quem pode publicar dispara. */
export default async function NewsletterAdmin({ searchParams }: Props) {
  const sp = await searchParams;
  const { staff, sql } = await requireStaff("content:write");
  const [editions, [subs]] = await Promise.all([
    listEditions(sql),
    sql<{ n: number }[]>`SELECT count(*)::int AS n FROM people.person WHERE newsletter_status = 'subscribed' AND email IS NOT NULL AND deleted_at IS NULL`,
  ]);
  const current = sp.id ? await getEdition(sql, sp.id) : null;
  const preview = current ? await previewEdition(sql, current.id) : null;
  const draft = current?.status === "draft";

  return (
    <>
      <h1>Newsletter</h1>
      <Flash sp={sp} />
      <p className="small muted">
        {subs?.n ?? 0} inscritos confirmados. O rascunho é montado toda segunda com as ofertas de desconto real e o conteúdo novo; os links levam às nossas páginas (com UTM), nunca direto à loja.
      </p>
      <form action={buildNewsletterAction}><button className="btn btn-sm" type="submit">Montar rascunho desta semana</button></form>

      <div className="table-scroll"><table style={{ marginTop: 16 }}>
        <thead><tr><th>Semana</th><th>Assunto</th><th>Status</th><th>Destinatários</th></tr></thead>
        <tbody>{editions.map((e) => (
          <tr key={e.id} aria-current={e.id === current?.id}>
            <td><Link href={`/admin/newsletter?id=${e.id}`}>{e.slug}</Link></td>
            <td>{e.subject}</td>
            <td><span className={`badge ${e.status === "sent" ? "good" : "normal"}`}>{STATUS[e.status]}</span></td>
            <td>{e.recipients ?? "—"}</td>
          </tr>
        ))}</tbody>
      </table></div>

      {current && (
        <section style={{ marginTop: 24 }}>
          <h2>Edição {current.slug}</h2>
          <p className="small muted">Preços de {current.prices_as_of.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
          <form action={updateNewsletterAction} className="stack">
            <input type="hidden" name="id" value={current.id} />
            <input type="hidden" name="count" value={current.items.length} />
            <label>Assunto<input type="text" name="subject" defaultValue={current.subject} maxLength={120} required disabled={!draft} /></label>
            <label>Introdução<textarea name="intro" defaultValue={current.intro} rows={3} disabled={!draft} /></label>
            <fieldset disabled={!draft}>
              <legend>Itens</legend>
              {current.items.map((it, i) => (
                <label key={i} className="row" style={{ alignItems: "flex-start" }}>
                  <input type="checkbox" name={`include.${i}`} defaultChecked={it.include} />
                  <span><span className="badge">{it.kind === "deal" ? "oferta" : "conteúdo"}</span> {it.title}<br /><span className="small muted">{it.subtitle}</span></span>
                </label>
              ))}
            </fieldset>
            {draft && <button className="btn btn-sm" type="submit">Salvar edição</button>}
          </form>

          {draft && can(staff.role, "content:publish") && (
            <form action={sendNewsletterAction} className="stack" style={{ marginTop: 16 }}>
              <input type="hidden" name="id" value={current.id} />
              <label className="row"><input type="checkbox" name="confirm" required /> Revisei a prévia e quero enviar para {subs?.n ?? 0} inscritos.</label>
              <button className="btn btn-sm" type="submit">Enviar edição</button>
            </form>
          )}
          {draft && !can(staff.role, "content:publish") && <p className="small muted">Só editor-chefe ou administrador podem enviar.</p>}

          {preview && (
            <>
              <h3 style={{ marginTop: 24 }}>Prévia</h3>
              <iframe title="Prévia do e-mail" srcDoc={preview.html} sandbox="" style={{ width: "100%", height: 640, border: "1px solid var(--border, #ddd)", background: "#fff" }} />
            </>
          )}
        </section>
      )}
    </>
  );
}
