import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@veredito/db";
import { confirmAlert } from "@veredito/db/people";

export const metadata: Metadata = { title: "Confirmar alerta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmAlert({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const sql = getSql();
  const r = sql && t ? await confirmAlert(sql, t) : null;
  return (
    <section className="form-page">
      {r ? (
        <>
          <h1>Alerta ativado ✅</h1>
          <p>Vamos avisar por e-mail quando o preço do <strong>{r.productName}</strong> mudar como você pediu.</p>
          <p><Link href={r.productPath}>Voltar ao produto</Link> · <Link href="/conta">Gerenciar alertas</Link></p>
        </>
      ) : (
        <>
          <h1>Link inválido ou expirado</h1>
          <p>Crie o alerta novamente na página do produto.</p>
        </>
      )}
    </section>
  );
}
