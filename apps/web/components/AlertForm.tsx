import { createAlertAction } from "@/app/(site)/actions";
import { Icon } from "./Icon";

const MESSAGES: Record<string, { cls: string; text: string }> = {
  pendente: { cls: "ok", text: "Quase lá: enviamos um e-mail para você confirmar o alerta." },
  ativo: { cls: "ok", text: "Alerta criado. Avisaremos por e-mail." },
  consentimento: { cls: "erro", text: "Marque a autorização para receber o e-mail do alerta." },
  invalid_email: { cls: "erro", text: "Confira o e-mail digitado." },
  invalid_input: { cls: "erro", text: "Informe o preço desejado." },
  rate_limited: { cls: "erro", text: "Muitas tentativas. Tente de novo em uma hora." },
  too_many_alerts: { cls: "erro", text: "Você atingiu o limite de alertas ativos. Gerencie em Minha conta." },
  indisponivel: { cls: "erro", text: "Alertas indisponíveis no modo demonstração." },
  erro: { cls: "erro", text: "Não foi possível criar o alerta agora." },
};

/** Formulário sem JavaScript: preço-alvo ou qualquer queda. O e-mail do alerta leva para esta página, nunca direto à loja. */
export function AlertForm({ productSlug, variantSlug, returnTo, status, suggested }: {
  productSlug: string; variantSlug: string; returnTo: string; status?: string; suggested: number | null;
}) {
  const msg = status ? MESSAGES[status] : null;
  return (
    <details id="alerta" className="card alert-box" open={Boolean(status)}>
      <summary><Icon name="bell" /> Avise-me quando o preço baixar</summary>
      {msg && <p className={`flash ${msg.cls}`} role={msg.cls === "erro" ? "alert" : "status"}>{msg.text}</p>}
      <form action={createAlertAction} className="stack">
        <input type="hidden" name="product" value={productSlug} />
        <input type="hidden" name="variant" value={variantSlug} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        <fieldset>
          <legend>Avisar quando</legend>
          <label className="check"><input type="radio" name="kind" value="target_price" defaultChecked /> chegar a
            <input type="text" name="target" inputMode="decimal" placeholder={suggested ? String(Math.round(suggested * 0.9)) : "valor"} aria-label="Preço desejado em reais" /> reais ou menos</label>
          <label className="check"><input type="radio" name="kind" value="any_drop" /> cair pelo menos 3%</label>
          <label className="check"><input type="radio" name="kind" value="good_price_label" /> virar “bom preço” pelo nosso histórico</label>
        </fieldset>
        <label>E-mail<input type="email" name="email" required autoComplete="email" /></label>
        <label className="check small">
          <input type="checkbox" name="consent" required /> <span>Autorizo o envio de e-mails sobre este alerta. Posso cancelar a qualquer momento (<a href="/privacidade">privacidade</a>).</span>
        </label>
        <button className="btn btn-dark btn-block" type="submit"><Icon name="bell" /> Criar alerta</button>
      </form>
    </details>
  );
}
