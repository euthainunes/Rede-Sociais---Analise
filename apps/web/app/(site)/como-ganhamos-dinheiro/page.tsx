import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@veredito/brand";

export const metadata: Metadata = { title: "Como ganhamos dinheiro", alternates: { canonical: "/como-ganhamos-dinheiro" } };

export default function HowWeEarn() {
  return (
    <article>
      <h1>Como ganhamos dinheiro</h1>
      <p>O {brand.name} é gratuito para você. Quando você clica em “Ver oferta” e compra numa loja parceira, a loja pode nos pagar uma comissão. O preço para você é o mesmo.</p>
      <h2>A comissão não decide a recomendação</h2>
      <ul>
        <li>As notas são calculadas pela <Link href="/metodologia/celulares">metodologia pública</Link>, a partir de especificações e testes.</li>
        <li>O sistema que calcula notas, rankings, a “melhor oferta” e as recomendações do consultor <strong>não tem acesso</strong> aos valores de comissão — a separação é feita no próprio banco de dados.</li>
        <li>A “melhor oferta” é escolhida por preço total, disponibilidade e confiabilidade da loja.</li>
        <li>Às vezes nossa escolha nº 1 é o produto que menos rende comissão. Está tudo bem.</li>
      </ul>
      <h2>Patrocínio</h2>
      <p>Hoje não publicamos conteúdo patrocinado. Se um dia publicarmos, ele terá o rótulo “Patrocinado”, ficará separado das recomendações e nunca ocupará a posição de “nossa escolha”.</p>
      <h2>Produtos para teste</h2>
      <p>Quando uma marca nos empresta ou envia um produto, dizemos isso na review.</p>
    </article>
  );
}
