import type { Metadata } from "next";
import { brand } from "@veredito/brand";
import { ConsentSettingsButton } from "@/components/ConsentBanner";

export const metadata: Metadata = { title: "Privacidade", alternates: { canonical: "/privacidade" } };

export default function Privacy() {
  return (
    <article>
      <h1>Privacidade</h1>
      <p className="notice">Versão preliminar — o texto final será revisado pelo jurídico antes do lançamento (docs/anexo-a).</p>
      <h2>O que coletamos</h2>
      <ul>
        <li><strong>Sem consentimento:</strong> apenas dados técnicos agregados e anônimos (páginas vistas e cliques em ofertas), sem identificador persistente.</li>
        <li>
          <strong>Com consentimento de medição:</strong> Google Analytics e dois cookies próprios: <code>aid</code>, um identificador
          aleatório que não contém seu nome nem e-mail (dura 180 dias), e <code>sid</code>, a visita atual. Com eles registramos de onde
          cada visita veio (busca, rede social, newsletter…) para saber quais canais ajudam as pessoas a decidir.
        </li>
        <li><strong>Se você criar alertas ou assinar a newsletter:</strong> e-mail e preferências, com confirmação em duas etapas.</li>
      </ul>
      <p>Não coletamos CPF nem dados sensíveis. Telefone é opcional.</p>
      <h2>Seus direitos (LGPD)</h2>
      <p>Você pode acessar, corrigir, exportar ou excluir seus dados e revogar consentimentos a qualquer momento. Ao recusar a medição, os cookies <code>aid</code> e <code>sid</code> são apagados. Encarregado: {brand.dpoEmail}.</p>
      <ConsentSettingsButton />
    </article>
  );
}
