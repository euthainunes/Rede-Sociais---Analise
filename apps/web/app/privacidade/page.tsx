import type { Metadata } from "next";
import { brand } from "@veredito/brand";

export const metadata: Metadata = { title: "Privacidade", alternates: { canonical: "/privacidade" } };

export default function Privacy() {
  return (
    <article>
      <h1>Privacidade</h1>
      <p className="notice">Versão preliminar — o texto final será revisado pelo jurídico antes do lançamento (docs/anexo-a).</p>
      <h2>O que coletamos</h2>
      <ul>
        <li><strong>Sem consentimento:</strong> apenas dados técnicos agregados e anônimos (páginas vistas e cliques em ofertas), sem identificador persistente.</li>
        <li><strong>Com consentimento de medição:</strong> Google Analytics e um identificador próprio para entender jornadas.</li>
        <li><strong>Se você criar alertas ou assinar a newsletter:</strong> e-mail e preferências, com confirmação em duas etapas.</li>
      </ul>
      <p>Não coletamos CPF nem dados sensíveis. Telefone é opcional.</p>
      <h2>Seus direitos (LGPD)</h2>
      <p>Você pode acessar, corrigir, exportar ou excluir seus dados e revogar consentimentos a qualquer momento. Encarregado: {brand.dpoEmail}.</p>
    </article>
  );
}
