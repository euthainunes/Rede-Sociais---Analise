import { requireStaff } from "@/lib/admin";

function mask(email: string) {
  return email.replace(/^(.)(.*)(@.*)$/, (_, a: string, b: string, c: string) => `${a}${"•".repeat(Math.min(b.length, 6))}${c}`);
}

/**
 * Fila de e-mails (outbox). Endereços mascarados. Só em ambiente local mostra o link do e-mail para testar o fluxo:
 * esses links dão acesso à conta da pessoa (/conta), então nunca aparecem em produção.
 */
export default async function EmailsAdmin() {
  const { sql } = await requireStaff("staff:manage");
  const dev = process.env.EMAIL_PROVIDER !== "resend";
  const showLinks = dev && process.env.NODE_ENV !== "production";
  const [counts, rows] = await Promise.all([
    sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM ops.email_outbox GROUP BY status`,
    sql<{ id: string; to_email: string; kind: string; subject: string; status: string; attempts: number; last_error: string | null; created_at: Date; text_body: string }[]>`
      SELECT id, to_email, kind, subject, status, attempts, last_error, created_at, text_body FROM ops.email_outbox ORDER BY created_at DESC LIMIT 100`,
  ]);
  return (
    <>
      <h1>E-mails</h1>
      {dev && !showLinks && (
        <p className="flash erro" role="alert">Nenhum e-mail está sendo enviado: configure <code>EMAIL_PROVIDER=resend</code> e a chave do Resend nas variáveis da hospedagem. Confirmações de alerta e de newsletter ficam paradas na fila.</p>
      )}
      <p className="small muted">
        Provedor: <strong>{dev ? "console (desenvolvimento — nada é enviado)" : "Resend"}</strong>. O worker envia a fila a cada minuto, com até 5 tentativas.
      </p>
      <div className="row">{counts.map((c) => <span key={c.status} className="badge">{c.status}: {c.n}</span>)}</div>
      <div className="table-scroll"><table style={{ marginTop: 12 }}>
        <thead><tr><th>Quando</th><th>Para</th><th>Tipo</th><th>Assunto</th><th>Status</th>{showLinks && <th>Link (dev)</th>}</tr></thead>
        <tbody>{rows.map((r) => {
          const link = showLinks ? r.text_body.match(/https?:\/\/\S+/)?.[0] : null;
          return (
            <tr key={r.id}>
              <td className="small">{r.created_at.toLocaleString("pt-BR")}</td>
              <td className="small">{mask(r.to_email)}</td>
              <td className="small">{r.kind}</td>
              <td>{r.subject}</td>
              <td><span className={`badge ${r.status === "sent" ? "good" : r.status === "failed" ? "high" : "normal"}`}>{r.status}</span>{r.last_error && <><br /><span className="small muted">{r.last_error}</span></>}</td>
              {showLinks && <td className="small">{link && <a href={link.replace(/^https?:\/\/[^/]+/, "")}>abrir</a>}</td>}
            </tr>
          );
        })}</tbody>
      </table></div>
    </>
  );
}
