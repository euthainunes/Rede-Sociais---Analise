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

export const MISSAO_CARD = {
  quartel: {
    remetente: 'GRUPO DA FAMÍLIA',
    texto: 'URGENTE!!! AS FORÇAS ARMADAS AGEM EM 72 HORAS!!! Vá para o quartel, entregue 5 marmitas aos acampados e chegue ao portão. Depois disso: SOLTAR O MITO. Reze no pneu para salvar o progresso. Não leia checagens.',
    medida: 'MARMITAS 0/5 · FALTAM 72H',
    controles: '◀ ▶ ANDA · ▲/ESPAÇO PULA · X COMPARTILHA ZAP',
  },
};
