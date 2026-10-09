import type { Metadata } from "next";
import { getSql } from "@veredito/db";
import { confirmNewsletter } from "@veredito/db/people";

export const metadata: Metadata = { title: "Confirmar newsletter", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmNewsletter({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const sql = getSql();
  const ok = sql && t ? await confirmNewsletter(sql, t) : false;
  return (
    <section className="form-page">
      <h1>{ok ? "Inscrição confirmada ✅" : "Link inválido ou expirado"}</h1>
      <p>{ok ? "A primeira edição chega na próxima semana." : "Faça a inscrição novamente."}</p>
    </section>
  );
}
