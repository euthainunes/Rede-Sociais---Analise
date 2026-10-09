import Link from "next/link";
import { auditFacets, listAudit } from "@veredito/db/admin";
import { requireStaff } from "@/lib/admin";
import { fullDateTimeBR } from "@/lib/format";

const PAGE = 100;

/** Nomes legíveis das ações registradas; ação nova sem nome aparece com o código. */
const ACTIONS: Record<string, string> = {
  "staff.login": "Entrou no painel", "staff.login_failed": "Tentativa de login recusada", "staff.locked": "Conta bloqueada por tentativas",
  "staff.totp_reused": "Código 2FA reutilizado (recusado)", "staff.create": "Pessoa da equipe criada",
  "product.create": "Produto criado", "product.update": "Produto editado", "product.archive": "Produto arquivado", "product.restore": "Produto restaurado",
  "product.delete": "Produto excluído", "product.mark_real": "Produto marcado como real", "product.mark_demo": "Produto marcado como demonstração",
  "product.archive_demo": "Demonstração arquivada em lote",
  "variant.create": "Versão criada", "variant.update": "Versão editada", "variant.activate": "Versão reativada", "variant.deactivate": "Versão desativada",
  "content.create": "Conteúdo criado", "content.update": "Conteúdo editado", "content.transition": "Conteúdo mudou de status",
  "content.auto_needs_update": "Conteúdo marcado para atualização (90 dias)",
  "offers.import": "Feed de ofertas importado", "match.accept": "Oferta associada", "match.reject": "Anúncio rejeitado", "merchant.create": "Loja criada",
  "feed_source.save": "Feed agendado", "feed_source.enable": "Feed ligado/desligado", "conversions.import": "Conversões importadas",
  "newsletter.draft": "Rascunho de newsletter", "newsletter.update": "Newsletter editada", "newsletter.send": "Newsletter enviada",
  "newsletter.subscribed": "Inscrição na newsletter", "person.unsubscribed": "Pessoa saiu da lista", "person.deleted": "Dados pessoais excluídos (LGPD)",
  "webhook.create": "Webhook criado", "webhook.enable": "Webhook reativado", "webhook.disable": "Webhook pausado", "webhook.ping": "Teste de webhook",
  "webhook.retry": "Entrega de webhook reenviada",
};
const GROUPS: Record<string, string> = {
  staff: "Acesso e equipe", product: "Produtos", variant: "Versões", content: "Conteúdo", offers: "Ofertas", match: "Matching", merchant: "Lojas",
  feed_source: "Feeds", conversions: "Receita", newsletter: "Newsletter", person: "Pessoas", webhook: "Webhooks",
};

function itemLink(type: string, id: string | null) {
  if (!id) return null;
  if (type === "product") return `/admin/produtos/${id}`;
  if (type === "content") return `/admin/conteudo/${id}`;
  return null;
}

type Props = { searchParams: Promise<{ grupo?: string; quem?: string; item?: string; de?: string; ate?: string; antes?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { sql } = await requireStaff("audit:read");
  const filter = { action: sp.grupo ? `${sp.grupo}.` : null, actor: sp.quem || null, entity: sp.item || null, from: sp.de || null, to: sp.ate || null };
  const [rows, facets] = await Promise.all([
    listAudit(sql, PAGE + 1, { ...filter, before: Number(sp.antes) || null }),
    auditFacets(sql),
  ]);
  const more = rows.length > PAGE;
  const shown = rows.slice(0, PAGE);
  const qs = new URLSearchParams(Object.entries({ grupo: sp.grupo, quem: sp.quem, item: sp.item, de: sp.de, ate: sp.ate }).filter(([, v]) => v) as [string, string][]);
  const older = more ? `/admin/auditoria?${new URLSearchParams([...qs, ["antes", String(shown.at(-1)!.id)]])}` : null;
  const filtered = qs.size > 0;
  return (
    <>
      <h1>Auditoria</h1>
      <p className="small muted">Toda escrita feita pelo painel fica registrada aqui. O banco recusa alterar ou apagar registros. Horários de Brasília.</p>
      <form method="get" className="inline" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <label>Área
          <select name="grupo" defaultValue={sp.grupo ?? ""}>
            <option value="">Todas</option>
            {facets.groups.map((g) => <option key={g} value={g}>{GROUPS[g] ?? g}</option>)}
          </select>
        </label>
        <label>Quem
          <select name="quem" defaultValue={sp.quem ?? ""}>
            <option value="">Todos</option>
            {facets.actors.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
          </select>
        </label>
        <label>Item (id)<input type="text" name="item" defaultValue={sp.item} placeholder="início do id" size={12} /></label>
        <label>De<input type="date" name="de" defaultValue={sp.de} /></label>
        <label>Até<input type="date" name="ate" defaultValue={sp.ate} /></label>
        <button className="btn btn-ghost btn-sm" type="submit">Filtrar</button>
        {filtered && <Link className="btn btn-ghost btn-sm" href="/admin/auditoria">Limpar</Link>}
      </form>
      {shown.length === 0 ? <p className="muted">Nenhum registro{filtered ? " com esses filtros" : ""}.</p> : (
        <div className="table-scroll"><table>
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Item</th></tr></thead>
          <tbody>{shown.map((r) => {
            const link = itemLink(r.entity_type, r.entity_id);
            const hasDetail = r.before != null || r.after != null;
            return (
              <tr key={r.id}>
                <td className="small">{fullDateTimeBR(r.ts)}</td>
                <td className="small">{r.name ?? r.email ?? (r.actor_role === "system" ? "sistema" : r.actor_role)}</td>
                <td>
                  {ACTIONS[r.action] ?? r.action}
                  {hasDetail && (
                    <details>
                      <summary className="small">Antes e depois</summary>
                      <div className="form-grid small">
                        <div><strong>Antes</strong><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.before == null ? "—" : JSON.stringify(r.before, null, 2)}</pre></div>
                        <div><strong>Depois</strong><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.after == null ? "—" : JSON.stringify(r.after, null, 2)}</pre></div>
                      </div>
                    </details>
                  )}
                </td>
                <td className="small">
                  {r.entity_type}{" "}
                  {r.entity_id && (link ? <Link href={link}>{r.entity_id.slice(0, 8)}</Link> : <Link href={`/admin/auditoria?item=${encodeURIComponent(r.entity_id)}`}>{r.entity_id.slice(0, 8)}</Link>)}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        {sp.antes && <Link className="btn btn-ghost btn-sm" href={`/admin/auditoria${qs.size ? `?${qs}` : ""}`}>Mais recentes</Link>}
        {older && <Link className="btn btn-ghost btn-sm" href={older}>Mais antigos</Link>}
      </div>
    </>
  );
}
