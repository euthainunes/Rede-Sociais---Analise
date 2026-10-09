import type { Metadata } from "next";
import { newsletterAction } from "../actions";

export const metadata: Metadata = { title: "Newsletter", alternates: { canonical: "/newsletter" } };

const MSG: Record<string, [string, string]> = {
  pendente: ["ok", "Enviamos um e-mail de confirmação. A inscrição só vale depois que você clicar no link."],
  consentimento: ["erro", "Marque a autorização para receber a newsletter."],
  invalid_email: ["erro", "Confira o e-mail digitado."],
  rate_limited: ["erro", "Muitas tentativas. Tente de novo em uma hora."],
  indisponivel: ["erro", "Newsletter indisponível no modo demonstração."],
  erro: ["erro", "Não foi possível concluir agora."],
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const m = status ? MSG[status] : null;
  return (
    <section className="form-page">
      <h1>Newsletter</h1>
      <p>Uma vez por semana: ofertas com <strong>desconto real</strong> (contra o nosso histórico de preços, não contra o “preço de” da loja) e os guias novos. Sem spam, cancelamento em um clique.</p>
      {m && <p className={`flash ${m[0]}`} role="status">{m[1]}</p>}
      <form action={newsletterAction} className="stack">
        <input type="hidden" name="origin" value="newsletter_page" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        <label>E-mail<input type="email" name="email" required autoComplete="email" /></label>
        <label className="check small"><input type="checkbox" name="consent" required /> Quero receber a newsletter por e-mail. Posso cancelar quando quiser.</label>
        <button className="btn btn-primary" type="submit">Assinar</button>
      </form>
    </section>
  );
}
