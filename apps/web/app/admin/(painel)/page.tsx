import Link from "next/link";
import { ALERT_LABELS, dashboardMetrics, listOpenAlerts } from "@veredito/db/admin";
import { lastRuns } from "@veredito/db/jobs";
import { refreshAlertsAction, resolveAlertAction } from "../actions";
import { Flash } from "../Flash";
import { requireStaff } from "@/lib/admin";

type Props = { searchParams: Promise<{ ok?: string; erro?: string; dias?: string }> };

export default async function Dashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const { sql } = await requireStaff("dashboard:read");
  const days = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 7;
  const [m, alerts, runs] = await Promise.all([dashboardMetrics(sql, days), listOpenAlerts(sql), lastRuns(sql)]);
  const maxDay = Math.max(1, ...m.daily.map((d) => d.clicks));
  return (
    <>
      <h1>Visão geral</h1>
      <Flash sp={sp} />
      <nav className="row" aria-label="Período">
        {[7, 30, 90].map((d) => <Link key={d} className="chip" aria-current={d === days} href={`/admin?dias=${d}`}>{d} dias</Link>)}
      </nav>
      <section className="kpis" style={{ marginTop: 16 }}>
        <div className="kpi"><span className="small muted">Cliques em ofertas</span><strong>{m.clicks.total}</strong><span className="small muted">{m.clicks.bots} de robôs descartados</span></div>
        <div className="kpi"><span className="small muted">Produtos publicados</span><strong>{m.counts.published}</strong><span className="small muted">de {m.counts.products}</span></div>
        <div className="kpi"><span className="small muted">Ofertas ativas</span><strong>{m.counts.offers}</strong><span className="small muted">{m.counts.stale} com preço &gt; 24 h</span></div>
        <div className="kpi"><span className="small muted">Fila de matching</span><strong>{m.counts.pending}</strong><Link className="small" href="/admin/ofertas">revisar</Link></div>
        <div className="kpi"><span className="small muted">Alertas de preço ativos</span><strong>{m.counts.alerts_active}</strong><span className="small muted">{m.counts.subscribers} na newsletter</span></div>
        <div className="kpi"><span className="small muted">Conteúdo em andamento</span><strong>{m.counts.drafts}</strong><span className="small muted">{m.counts.needs_update} precisam de atualização</span></div>
      </section>

      <h2>Cliques por dia</h2>
      {m.daily.length ? (
        <svg className="chart" viewBox={`0 0 ${Math.max(m.daily.length * 24, 240)} 120`} role="img" aria-label="Cliques por dia">
          {m.daily.map((d, i) => {
            const h = (d.clicks / maxDay) * 100;
            return <rect key={d.day} x={i * 24 + 4} y={110 - h} width={16} height={h} rx={3} fill="var(--brand)"><title>{`${d.day}: ${d.clicks}`}</title></rect>;
          })}
        </svg>
      ) : <p className="muted">Sem cliques no período.</p>}

      <div className="pc" style={{ marginTop: 16 }}>
        <section>
          <h2>Produtos mais clicados</h2>
          <table><tbody>{m.topProducts.map((p) => <tr key={p.slug}><td>{p.name}</td><td>{p.clicks}</td></tr>)}</tbody></table>
        </section>
        <section>
          <h2>Por tipo de página · CTA · loja</h2>
          <table><tbody>
            {m.byPage.map((p) => <tr key={`p${p.page_type}`}><td>página: {p.page_type ?? "—"}</td><td>{p.clicks}</td></tr>)}
            {m.byCta.map((p) => <tr key={`c${p.cta_id}`}><td>CTA: {p.cta_id ?? "—"}</td><td>{p.clicks}</td></tr>)}
            {m.byMerchant.map((p) => <tr key={`m${p.merchant}`}><td>loja: {p.merchant}</td><td>{p.clicks}</td></tr>)}
          </tbody></table>
        </section>
      </div>

      <h2>Alertas internos</h2>
      <form action={refreshAlertsAction}><button className="btn btn-ghost btn-sm" type="submit">Recalcular alertas</button></form>
      {alerts.length ? (
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Gravidade</th><th>Tipo</th><th>Item</th><th>Desde</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.severity === "high" ? "high" : "normal"}`}>{a.severity === "high" ? "alta" : "média"}</span></td>
                <td>{ALERT_LABELS[a.kind] ?? a.kind}</td>
                <td>
                  {a.entity_type === "product" ? <Link href={`/admin/produtos/${a.entity_id}`}>{String(a.details.name ?? a.entity_id)}</Link>
                    : a.entity_type === "content" ? <Link href={`/admin/conteudo/${a.entity_id}`}>{String(a.details.title ?? a.entity_id)}</Link>
                    : String(a.details.title ?? a.details.pending ?? "")}
                </td>
                <td className="small">{a.created_at.toLocaleDateString("pt-BR")}</td>
                <td>{(a.kind === "price_anomaly" || a.kind === "feed_error") && (
                  <form action={resolveAlertAction}><input type="hidden" name="id" value={a.id} /><button className="btn btn-ghost btn-sm" type="submit">Resolvido</button></form>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">Nenhum alerta aberto.</p>}
      <h2>Rotinas automáticas (worker)</h2>
      {runs.length ? (
        <table>
          <thead><tr><th>Job</th><th>Última execução</th><th>Status</th><th>Resultado</th></tr></thead>
          <tbody>{runs.map((r) => (
            <tr key={r.job}>
              <td>{r.job}</td>
              <td className="small">{r.started_at.toLocaleString("pt-BR")}</td>
              <td><span className={`badge ${r.status === "ok" ? "good" : r.status === "running" ? "normal" : "high"}`}>{r.status}</span></td>
              <td className="small muted">{r.error ?? JSON.stringify(r.result ?? {})}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="muted">O worker ainda não rodou. Inicie com <code>pnpm --filter @veredito/worker start</code>.</p>}
      <p className="small muted">Receita e comissões entram aqui quando a importação de conversões estiver ligada (visível só para administrador e comercial).</p>
    </>
  );
}
