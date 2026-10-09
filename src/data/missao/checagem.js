// Tela de Checagem de cada fase: FATO (com fonte), MEME e PIADA.
// Regra: toda fake news da fase é desmentida aqui, e toda acusação aparece com o status atual.

export const CHECAGEM = {
  quartel: {
    titulo: 'CHECAGEM - FASE 1: ACAMPAMENTO DO QUARTEL',
    itens: [
      { tag: 'FAKE', texto: '"AS FORÇAS ARMADAS VÃO AGIR EM 72 HORAS." NÃO AGIRAM. NEM EM 72 DIAS.' },
      { tag: 'FATO', texto: 'APÓS A ELEIÇÃO DE 2022, APOIADORES ACAMPARAM EM FRENTE A QUARTÉIS PEDINDO "INTERVENÇÃO". OS ACAMPAMENTOS FORAM DESMONTADOS APÓS O 8 DE JANEIRO.' },
      { tag: 'FATO', texto: 'EM 30/12/2022, DOIS DIAS ANTES DA POSSE, BOLSONARO VIAJOU PARA A FLÓRIDA (EUA) E NÃO PASSOU A FAIXA.' },
      { tag: 'FATO', texto: 'ATÉ JAN/2026, O STF HAVIA CONDENADO MAIS DE 800 PESSOAS PELOS ATOS DE 8 DE JANEIRO.' },
      { tag: 'PIADA', texto: 'O PATRÍCIO, O PNEU MILAGROSO E OS PENDRIVES VAZIOS SÃO FICÇÃO DESTE JOGO.' },
    ],
    fontes: [
      { nome: 'Poder360: acampamentos desfeitos no país', url: 'https://www.poder360.com.br/brasil/acampamentos-de-extremistas-de-direita-sao-desfeitos-no-pais/' },
      { nome: 'O Povo: Bolsonaro deixa o Brasil rumo aos EUA (30/12/2022)', url: 'https://www.opovo.com.br/noticias/mundo/2022/12/30/amp/bolsonaro-deixa-o-brasil-rumo-aos-eua-as-vesperas-da-posse-de-lula.html' },
      { nome: 'Poder360: STF condenou 835 pelo 8 de Janeiro', url: 'https://www.poder360.com.br/poder-justica/depois-de-3-anos-stf-condenou-810-envolvidos-no-8-de-janeiro/' },
      { nome: 'TSE: relatório de transparência eleitoral 2022', url: 'https://www.tse.jus.br/eleicoes/eleicoes-2022/arquivos/transparencia-eleitoral-brasil' },
    ],
  },
};

CHECAGEM.urnas = {
  titulo: 'CHECAGEM - FASE 2: A URNA FRAUDADA',
  itens: [
    { tag: 'FAKE', texto: '"A URNA ELETRÔNICA É FRAUDADA." NENHUMA FRAUDE FOI COMPROVADA. O PATRÍCIO ABRIU 10 URNAS: TODAS VAZIAS DE FRAUDE.' },
    { tag: 'FATO', texto: 'O RELATÓRIO DAS FORÇAS ARMADAS (NOV/2022) COMPAROU BOLETINS DE URNA E RESULTADOS: 0% DE INCONSISTÊNCIA. A DEFESA DISSE DEPOIS QUE NÃO "EXCLUÍA" FRAUDE, SEM APONTAR NENHUMA.' },
    { tag: 'FATO', texto: 'O PL PEDIU PARA ANULAR VOTOS DE 279 MIL URNAS. O TSE REJEITOU POR FALTA DE PROVAS E MULTOU O PARTIDO EM R$ 22,9 MILHÕES (NOV-DEZ/2022).' },
    { tag: 'FATO', texto: 'EM JUN/2023 O TSE TORNOU BOLSONARO INELEGÍVEL ATÉ 2030 PELA REUNIÃO COM EMBAIXADORES (JUL/2022) EM QUE ATACOU O SISTEMA ELEITORAL.' },
    { tag: 'PIADA', texto: 'O "CÓDIGO SECRETO", AS URNAS GIGANTES E A SALA DO CÓDIGO-FONTE SÃO FICÇÃO DESTE JOGO.' },
  ],
  fontes: [
    { nome: 'Diário do Nordeste: relatório da Defesa não aponta fraude', url: 'https://diariodonordeste.verdesmares.com.br/pontopoder/relatorio-do-ministerio-da-defesa-nao-aponta-fraude-nas-eleicoes-de-2022-1.3299074' },
    { nome: 'TSE: confirma multa de R$ 22,9 milhões ao PL', url: 'https://www.tse.jus.br/comunicacao/noticias/2022/Dezembro/tse-confirma-multa-de-r-22-9-milhoes-ao-pl-por-litigancia-de-ma-fe' },
    { nome: 'Poder360: TSE forma maioria pela inelegibilidade de Bolsonaro', url: 'https://www.poder360.com.br/justica/tse-forma-maioria-pela-inelegibilidade-de-bolsonaro/' },
    { nome: 'Poder360: Moraes rejeita ação do PL contra urnas', url: 'https://www.poder360.com.br/eleicoes/moraes-rejeita-pedido-para-invalidar-votos-e-multa-pl-em-r-22-milhoes/' },
  ],
};

export const MISSAO_CARD = {
  quartel: {
    remetente: 'GRUPO DA FAMÍLIA',
    texto: 'URGENTE!!! AS FORÇAS ARMADAS AGEM EM 72 HORAS!!! Vá para o quartel, entregue 5 marmitas aos acampados e chegue ao portão. Depois disso: SOLTAR O MITO. Reze no pneu para salvar o progresso. Não leia checagens.',
    medida: 'MARMITAS 0/5 · FALTAM 72H',
    controles: '◀ ▶ ANDA · ▲/ESPAÇO PULA · X COMPARTILHA ZAP',
  },
  urnas: {
    remetente: 'GRUPO DA FAMÍLIA',
    texto: 'URGENTE!!! O 01 TEM AS PROVAS: A URNA É FRAUDADA!!! Invada o depósito, dê cabeçada em 10 urnas para achar o CÓDIGO SECRETO e leve tudo até a sala do código-fonte. Cuidado com o Fiscal: ele não muda de ideia.',
    medida: 'URNAS AUDITADAS 0/10',
    controles: '◀ ▶ ANDA · ▲/ESPAÇO PULA (CABEÇADA NA URNA) · X ZAP',
  },
};
