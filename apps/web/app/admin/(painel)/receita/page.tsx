import Link from "next/link";
import { ATTRIBUTION_MODEL_LABELS, ATTRIBUTION_MODELS } from "@veredito/core";
import {
  COMMISSION_STATUS_LABELS, recentConversions, revenueBy, revenueByJourney, revenueSummary, type RevenueDimension,
} from "@veredito/db/commerce";
import { PROGRAMS } from "@veredito/integrations";
import { importConversionsAction } from "../../actions";
import { Flash } from "../../Flash";
import { requireStaff } from "@/lib/admin";
import { ActionForm } from "../../ActionForm";
import { dateBR } from "@/lib/format";

const brl = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const DIMS: { key: RevenueDimension; label: string }[] = [
  { key: "source_path", label: "Conteúdo (página de origem)" },
  { key: "product", label: "Produto" },
  { key: "channel", label: "Canal (utm_source)" },
  { key: "page_type", label: "Tipo de página" },
  { key: "cta_id", label: "Botão (CTA)" },
  { key: "merchant", label: "Loja" },
];
const CHANNEL_LABELS: Record<string, string> = {
  organic: "Busca orgânica", direct: "Direto", social: "Redes sociais", paid: "Mídia paga", email: "E-mail / newsletter",
  ai_referral: "Assistentes de IA", referral: "Outros sites", unknown: "Sem jornada (sem consentimento)", unattributed: "Sem clique identificado",
};
const EXAMPLE = `pedido,sub_id,tag,data,valor,comissao,status
123456,Ab3dE6gH9k,,08/10/2026 14:30,"2.899,00","86,97",pendente`;

type Props = { searchParams: Promise<{ ok?: string; erro?: string; dias?: string; por?: string }> };

/** Conteúdo → tráfego → clique → venda → comissão. Visível só para administrador e comercial. */
export default async function RevenuePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { staff, sql } = await requireStaff("commission:read");
  const days = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const dim = DIMS.find((d) => d.key === sp.por) ?? DIMS[0]!;
  const [sum, rows, recent, journey] = await Promise.all([
    revenueSummary(sql, staff, days), revenueBy(sql, staff, dim.key, days), recentConversions(sql, staff), revenueByJourney(sql, staff, days),
  ]);
  const q = (o: Record<string, string>) => `/admin/receita?${new URLSearchParams({ dias: String(days), por: dim.key, ...o })}`;
  return (
    <>
      <h1>Receita</h1>
      <Flash sp={sp} />
      <nav className="row" aria-label="Período">
        {[7, 30, 90].map((d) => <Link key={d} className="chip" aria-current={d === days} href={q({ dias: String(d) })}>{d} dias</Link>)}
      </nav>
      <section className="kpis" style={{ marginTop: 16 }}>
        <div className="kpi"><span className="small muted">Comissão (sem estornos)</span><strong>{brl(sum.commission)}</strong></div>
        <div className="kpi"><span className="small muted">Pedidos</span><strong>{sum.orders}</strong></div>
        <div className="kpi"><span className="small muted">Cliques em ofertas</span><strong>{sum.clicks}</strong></div>
        <div className="kpi"><span className="small muted">EPC (comissão por clique)</span><strong>{brl(sum.epc)}</strong></div>
        <div className="kpi"><span className="small muted">Receita com atribuição exata</span><strong>{sum.exactShare == null ? "—" : `${Math.round(sum.exactShare * 100)}%`}</strong><span className="small muted">o resto é alocado por tag/janela</span></div>
      </section>
      <p className="row small" style={{ marginTop: 8 }}>
        {sum.byStatus.map((s) => <span key={s.status} className="badge">{COMMISSION_STATUS_LABELS[s.status]}: {s.n} · {brl(s.amount)}</span>)}
      </p>

      <h2>De onde vem o dinheiro</h2>
      <nav className="row" aria-label="Agrupar por">
        {DIMS.map((d) => <Link key={d.key} className="chip" aria-current={d.key === dim.key} href={q({ por: d.key })}>{d.label}</Link>)}
      </nav>
      <div className="table-scroll"><table style={{ marginTop: 8 }}>
        <thead><tr><th>{dim.label}</th><th>Comissão</th><th>Pedidos</th><th>Cliques</th><th>EPC</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.key}><td>{dim.key === "source_path" && r.key.startsWith("/") ? <a href={r.key} target="_blank">{r.key}</a> : r.key}</td>
            <td><strong>{brl(r.commission)}</strong></td><td>{r.orders.toLocaleString("pt-BR")}</td><td>{r.clicks}</td><td>{brl(r.epc)}</td></tr>
        ))}</tbody>
      </table></div>
      <p className="small muted">Modelo: último clique antes da venda. Vendas sem sub-ID são divididas igualmente entre os cliques do mesmo programa na janela do cookie (pedidos fracionados).</p>

      <h2>Canais de aquisição por modelo de atribuição</h2>
      <p className="small muted">
        Considera as visitas de quem comprou nos 30 dias antes do clique (só de quem aceitou a medição). Compare os modelos:
        um canal forte no primeiro toque traz gente nova; forte no último, fecha a decisão.
      </p>
      <div className="table-scroll"><table style={{ marginTop: 8 }}>
        <thead><tr><th>Canal</th>{ATTRIBUTION_MODELS.map((m) => <th key={m}>{ATTRIBUTION_MODEL_LABELS[m]}</th>)}</tr></thead>
        <tbody>{journey.rows.map((r) => (
          <tr key={r.channel}><td>{CHANNEL_LABELS[r.channel] ?? r.channel}</td>{ATTRIBUTION_MODELS.map((m) => <td key={m}>{brl(r[m])}</td>)}</tr>
        ))}</tbody>
      </table></div>
      <p className="small muted">
        {journey.conversions} {journey.conversions === 1 ? "venda" : "vendas"} no período; {journey.withJourney} com jornada
        {journey.conversions > 0 && ` (${Math.round((journey.withJourney / journey.conversions) * 100)}%)`}
        {journey.avgTouches != null && `, em média ${journey.avgTouches.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} visitas até a compra`}.
        As demais ficam com o canal do próprio clique.
      </p>

      <h2>Últimas conversões</h2>
      <div className="table-scroll"><table>
        <thead><tr><th>Pedido</th><th>Programa</th><th>Valor</th><th>Comissão</th><th>Status</th><th>Atribuição</th></tr></thead>
        <tbody>{recent.map((c) => (
          <tr key={c.id}>
            <td className="small">{c.external_id}<br /><span className="muted">{dateBR(c.ordered_at)}</span></td>
            <td>{c.program}</td>
            <td>{brl(Number(c.order_value))}</td>
            <td>{brl(Number(c.amount))}</td>
            <td>
              <ol className="small" style={{ margin: 0, paddingLeft: 16 }}>
                {(c.history ?? []).map((h, i) => <li key={i}>{COMMISSION_STATUS_LABELS[h.to]} <span className="muted">{dateBR(h.at)}</span></li>)}
              </ol>
            </td>
            <td className="small">{c.attribution_method === "click_ref" ? "exata" : "alocada"}{c.source_path && <><br /><span className="muted">{c.source_path}</span></>}</td>
          </tr>
        ))}</tbody>
      </table></div>

      <section className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Importar relatório de conversões</h2>
        <p className="small muted">Reimportar o mesmo relatório é seguro: cada pedido é contado uma vez e só o status/valor é atualizado. Redes com postback podem enviar direto para <code>/api/webhooks/networks/&lt;programa&gt;</code> (assinado com HMAC).</p>
        <ActionForm action={importConversionsAction} className="stack">
          <div className="form-grid">
            <label>Programa
              <select name="programKey" required defaultValue="">
                <option value="" disabled>Escolha…</option>
                {PROGRAMS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                <option value="demo">Lojas de demonstração</option>
              </select>
            </label>
            <label>Formato
              <select name="format" defaultValue="planilha"><option value="planilha">Planilha CSV (colunas em português)</option><option value="awin">Relatório Awin (CSV)</option></select>
            </label>
            <label>Arquivo CSV<input type="file" name="file" accept=".csv,text/csv" /></label>
          </div>
          <label>…ou cole o conteúdo<textarea name="content" rows={4} placeholder={EXAMPLE} /></label>
          <button className="btn btn-primary" type="submit">Importar</button>
        </ActionForm>
      </section>
    </>
  );
}
