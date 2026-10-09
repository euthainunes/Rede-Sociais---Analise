import { listWebhookDeliveries, listWebhookEndpoints, WEBHOOK_EVENT_LABELS, WEBHOOK_EVENTS } from "@veredito/db/people";
import { createWebhookAction, retryWebhookAction, testWebhookAction, toggleWebhookAction } from "../../actions";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";
import { ActionForm } from "../../ActionForm";
import { dateTimeBR, timeBR } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: "na fila", tone: "normal" }, sending: { label: "enviando", tone: "normal" }, delivered: { label: "entregue", tone: "good" },
  failed: { label: "falhou", tone: "high" }, cancelled: { label: "cancelada", tone: "normal" },
};

type Props = { searchParams: Promise<{ ok?: string; erro?: string }> };

/** Webhooks para CRM: eventos de pessoas saem assinados, com retentativas. Só administrador. */
export default async function WebhooksAdmin({ searchParams }: Props) {
  const sp = await searchParams;
  const { staff, sql } = await requireStaff("staff:manage");
  const [endpoints, deliveries] = await Promise.all([listWebhookEndpoints(sql, staff), listWebhookDeliveries(sql, staff)]);
  return (
    <>
      <h1>Webhooks (CRM)</h1>
      <Flash sp={sp} />
      <p className="small muted">
        Cada evento vai por <code>POST</code> em JSON, assinado: <code>X-Veredito-Signature: sha256=HMAC(segredo, timestamp + &quot;.&quot; + corpo)</code>,
        com <code>X-Veredito-Timestamp</code> e <code>X-Veredito-Delivery</code> (use para não processar duas vezes). Sem resposta 2xx, tentamos de novo
        em 1 min, 5 min, 30 min, 2 h e 12 h. Enviamos só o identificador e o e-mail da pessoa.
      </p>

      {endpoints.length > 0 && (
        <div className="table-scroll"><table style={{ marginTop: 12 }}>
          <thead><tr><th>Endpoint</th><th>Eventos</th><th>Entregas</th><th>Segredo</th><th /></tr></thead>
          <tbody>{endpoints.map((e) => (
            <tr key={e.id}>
              <td><strong>{e.name}</strong> {!e.active && <span className="badge">pausado</span>}<br /><span className="small muted">{e.url}</span></td>
              <td className="small">{e.events.map((ev) => <div key={ev}>{ev}</div>)}</td>
              <td className="small">{e.delivered} entregues · {e.pending} na fila · {e.failed} com falha
                {e.last_delivered_at && <><br /><span className="muted">última: {dateTimeBR(e.last_delivered_at)}</span></>}</td>
              <td className="small"><details><summary>mostrar</summary><code style={{ wordBreak: "break-all" }}>{e.secret}</code></details></td>
              <td>
                <div className="row">
                  <form action={testWebhookAction}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm" type="submit" disabled={!e.active}>Enviar teste</button></form>
                  <form action={toggleWebhookAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="active" value={e.active ? "0" : "1"} />
                    <button className="btn btn-ghost btn-sm" type="submit">{e.active ? "Pausar" : "Reativar"}</button></form>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <section className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Novo endpoint</h2>
        <ActionForm action={createWebhookAction} className="stack">
          <div className="form-grid">
            <label>Nome<input type="text" name="name" required placeholder="RD Station, HubSpot…" /></label>
            <label>URL (https)<input type="url" name="url" required placeholder="https://crm.exemplo.com/webhooks/veredito" /></label>
          </div>
          <fieldset>
            <legend>Eventos</legend>
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev} className="row"><input type="checkbox" name="events" value={ev} defaultChecked /> <span><code>{ev}</code> — {WEBHOOK_EVENT_LABELS[ev]}</span></label>
            ))}
          </fieldset>
          <button className="btn btn-primary" type="submit">Criar endpoint</button>
        </ActionForm>
      </section>

      <h2>Entregas recentes</h2>
      {deliveries.length === 0 ? <p className="small muted">Nenhuma entrega ainda.</p> : (
        <div className="table-scroll"><table>
          <thead><tr><th>Quando</th><th>Endpoint</th><th>Evento</th><th>Status</th><th>Tentativas</th><th /></tr></thead>
          <tbody>{deliveries.map((d) => (
            <tr key={d.id}>
              <td className="small">{dateTimeBR(d.created_at)}</td>
              <td className="small">{d.endpoint}</td>
              <td className="small"><code>{d.event}</code></td>
              <td><span className={`badge ${STATUS[d.status]?.tone ?? ""}`}>{STATUS[d.status]?.label ?? d.status}</span>
                {d.last_error && <><br /><span className="small muted">{d.last_error}</span></>}
                {d.status === "queued" && d.attempts > 0 && <><br /><span className="small muted">próxima: {timeBR(d.next_attempt_at)}</span></>}</td>
              <td>{d.attempts}</td>
              <td>{(d.status === "failed" || d.status === "cancelled") && (
                <form action={retryWebhookAction}><input type="hidden" name="id" value={d.id} /><button className="btn btn-ghost btn-sm" type="submit">Reenviar</button></form>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
