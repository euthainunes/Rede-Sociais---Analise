import type { Metadata } from "next";
import { unsubscribeTokenAction } from "../actions";

export const metadata: Metadata = { title: "Cancelar e-mails", robots: { index: false, follow: false } };

/** GET só mostra o botão: leitores de e-mail que abrem links automaticamente não descadastram ninguém. */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string; feito?: string }> }) {
  const sp = await searchParams;
  return (
    <section style={{ maxWidth: 560, marginTop: 32 }}>
      <h1>Cancelar e-mails</h1>
      {sp.feito === "1" ? <p className="flash ok">Pronto. Você não receberá mais alertas nem a newsletter.</p>
        : sp.feito === "0" ? <p className="flash erro">Link inválido. Use “Minha conta” para gerenciar.</p>
        : (
          <form action={unsubscribeTokenAction}>
            <input type="hidden" name="t" value={sp.t ?? ""} />
            <p>Confirme para parar de receber todos os e-mails (alertas e newsletter).</p>
            <button className="btn btn-primary" type="submit">Cancelar todos os e-mails</button>
          </form>
        )}
    </section>
  );
}
