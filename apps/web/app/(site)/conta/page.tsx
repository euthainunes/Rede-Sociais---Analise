import type { Metadata } from "next";
import { manageLinkAction } from "../actions";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: true } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ enviado?: string; expirado?: string; excluido?: string }> }) {
  const sp = await searchParams;
  return (
    <section style={{ maxWidth: 560, marginTop: 32 }}>
      <h1>Minha conta</h1>
      {sp.enviado && <p className="flash ok" role="status">Se houver uma conta com este e-mail, você receberá um link de acesso em instantes.</p>}
      {sp.expirado && <p className="flash erro" role="alert">O link expirou. Peça um novo abaixo.</p>}
      {sp.excluido && <p className="flash ok" role="status">Seus dados foram excluídos.</p>}
      <p>Não usamos senha. Informe seu e-mail e enviaremos um link para ver e cancelar alertas, sair da newsletter, baixar ou excluir seus dados.</p>
      <form action={manageLinkAction} className="stack">
        <label>E-mail<input type="email" name="email" required autoComplete="email" /></label>
        <button className="btn btn-primary" type="submit">Enviar link de acesso</button>
      </form>
    </section>
  );
}
