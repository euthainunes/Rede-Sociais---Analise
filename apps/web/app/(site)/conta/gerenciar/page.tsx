import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSql } from "@veredito/db";
import { getAccount, verifyToken } from "@veredito/db/people";
import { cancelAlertAction, deleteAccountAction, unsubscribeAllAction } from "../../actions";

export const metadata: Metadata = { title: "Gerenciar conta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { target_price: "Preço-alvo", any_drop: "Qualquer queda (3%+)", good_price_label: "Bom preço pelo histórico", back_in_stock: "Volta ao estoque" };
const STATUS: Record<string, string> = { pending: "aguardando confirmação", active: "ativo", fulfilled: "concluído", paused: "pausado" };

export default async function Manage({ searchParams }: { searchParams: Promise<{ t?: string; ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const token = verifyToken(sp.t, "manage");
  const sql = getSql();
  if (!token || !sql) redirect("/conta?expirado=1");
  const acc = await getAccount(sql, token.p);
  if (!acc) redirect("/conta?expirado=1");
  const t = sp.t!;
  return (
    <section className="page-head manage">
      <h1>Gerenciar conta</h1>
      <p className="muted">{acc.person.email}</p>
      {sp.ok === "alerta" && <p className="flash ok">Alerta cancelado.</p>}
      {sp.ok === "descadastro" && <p className="flash ok">Você não receberá mais e-mails nossos.</p>}
      {sp.erro === "confirmar" && <p className="flash erro">Marque a confirmação para excluir.</p>}

      <h2>Alertas</h2>
      {acc.alerts.length === 0 && <p className="muted">Nenhum alerta.</p>}
      <div className="data-table"><table><tbody>
        {acc.alerts.map((a) => (
          <tr key={a.id}>
            <td><Link href={a.path}>{a.product}</Link>{a.variant && <span className="small muted"> · {a.variant}</span>}<br />
              <span className="small">{KIND[a.kind]}{a.target_price ? `: até ${Number(a.target_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""} · {STATUS[a.status] ?? a.status}</span></td>
            <td>{a.status !== "fulfilled" && (
              <form action={cancelAlertAction}><input type="hidden" name="t" value={t} /><input type="hidden" name="alertId" value={a.id} /><button className="btn btn-ghost btn-sm" type="submit">Cancelar</button></form>
            )}</td>
          </tr>
        ))}
      </tbody></table></div>

      <h2>Newsletter</h2>
      <p>Situação: <strong>{acc.person.newsletter_status === "subscribed" ? "inscrito" : acc.person.newsletter_status === "pending" ? "aguardando confirmação" : "não inscrito"}</strong></p>
      <form action={unsubscribeAllAction}><input type="hidden" name="t" value={t} /><button className="btn btn-ghost btn-sm" type="submit">Parar todos os e-mails</button></form>

      <h2>Seus dados (LGPD)</h2>
      <p><a className="btn btn-ghost btn-sm" href={`/api/conta/exportar?t=${encodeURIComponent(t)}`}>Baixar meus dados (JSON)</a></p>
      <form action={deleteAccountAction} className="stack card">
        <input type="hidden" name="t" value={t} />
        <label className="check small"><input type="checkbox" name="confirm" /> Entendo que meus alertas e dados serão excluídos definitivamente.</label>
        <button className="btn btn-danger btn-sm" type="submit">Excluir meus dados</button>
      </form>
    </section>
  );
}
