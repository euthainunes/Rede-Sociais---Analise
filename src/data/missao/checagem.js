// Tela de Checagem de cada fase: FATO (com fonte), MEME e PIADA.
// Regra: toda fake news da fase é desmentida aqui, e toda acusação aparece com o status atual.

export const CHECAGEM = {
  quartel: {
    titulo: 'Checagem · Fase 1: Acampamento do Quartel',
    itens: [
      { tag: 'FAKE', texto: '"As Forças Armadas vão agir em 72 horas." Não agiram. Nem em 72 dias.' },
      { tag: 'FATO', texto: 'Após a eleição de 2022, apoiadores acamparam em frente a quartéis pedindo "intervenção". Os acampamentos foram desmontados depois do 8 de janeiro.' },
      { tag: 'FATO', texto: 'Em 30/12/2022, dois dias antes da posse, Bolsonaro viajou para a Flórida (EUA) e não passou a faixa.' },
      { tag: 'FATO', texto: 'Até jan/2026, o STF havia condenado mais de 800 pessoas pelos atos de 8 de janeiro.' },
      { tag: 'PIADA', texto: 'O Patrício, o pneu milagroso e os pendrives vazios são ficção deste jogo.' },
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
  titulo: 'Checagem · Fase 2: A Urna Fraudada',
  itens: [
    { tag: 'FAKE', texto: '"A urna eletrônica é fraudada." Nenhuma fraude foi comprovada. O Patrício abriu 10 urnas: todas vazias de fraude.' },
    { tag: 'FATO', texto: 'O relatório das Forças Armadas (nov/2022) comparou boletins de urna e resultados: 0% de inconsistência. A Defesa disse depois que não "excluía" fraude, sem apontar nenhuma.' },
    { tag: 'FATO', texto: 'O PL pediu para anular votos de 279 mil urnas. O TSE rejeitou por falta de provas e multou o partido em R$ 22,9 milhões (nov–dez/2022).' },
    { tag: 'FATO', texto: 'Em jun/2023, o TSE tornou Bolsonaro inelegível até 2030 pela reunião com embaixadores (jul/2022) em que atacou o sistema eleitoral.' },
    { tag: 'PIADA', texto: 'O "código secreto", as urnas gigantes e a sala do código-fonte são ficção deste jogo.' },
  ],
  fontes: [
    { nome: 'Diário do Nordeste: relatório da Defesa não aponta fraude', url: 'https://diariodonordeste.verdesmares.com.br/pontopoder/relatorio-do-ministerio-da-defesa-nao-aponta-fraude-nas-eleicoes-de-2022-1.3299074' },
    { nome: 'TSE: confirma multa de R$ 22,9 milhões ao PL', url: 'https://www.tse.jus.br/comunicacao/noticias/2022/Dezembro/tse-confirma-multa-de-r-22-9-milhoes-ao-pl-por-litigancia-de-ma-fe' },
    { nome: 'Poder360: TSE forma maioria pela inelegibilidade de Bolsonaro', url: 'https://www.poder360.com.br/justica/tse-forma-maioria-pela-inelegibilidade-de-bolsonaro/' },
    { nome: 'Poder360: Moraes rejeita ação do PL contra urnas', url: 'https://www.poder360.com.br/eleicoes/moraes-rejeita-pedido-para-invalidar-votos-e-multa-pl-em-r-22-milhoes/' },
  ],
};

CHECAGEM.chocolate = {
  titulo: 'Checagem · Fase 3: A Fábrica de Chocolate',
  itens: [
    { tag: 'FAKE', texto: '"Nunca houve investigação, é invenção da mídia." Houve investigação e denúncia formal.' },
    { tag: 'ACUSAÇÃO', texto: 'O MP-RJ denunciou Flávio (nov/2020) por "rachadinha" na Alerj. Para o MP, uma loja de chocolates da qual era sócio teria sido usada para lavar dinheiro em espécie.' },
    { tag: 'STATUS', texto: 'STJ e STF anularam provas (nov/2021) e o TJ-RJ arquivou a denúncia (mai/2022). Não há condenação. Flávio nega qualquer irregularidade.' },
    { tag: 'FATO', texto: 'Mansão de cerca de R$ 6 milhões em Brasília, com financiamento de R$ 3,1 milhões do BRB (2021). A PF apura as condições do empréstimo; ele nega irregularidade.' },
    { tag: 'PIADA', texto: 'As notinhas, o Fiscal que enxerga longe e os depósitos aos pouquinhos deste jogo são ficção.' },
  ],
  fontes: [
    { nome: 'ConJur: MP denuncia Flávio Bolsonaro por esquema na Alerj (2020)', url: 'https://conjur.com.br/2020-nov-04/mp-denuncia-flavio-bolsonaro-esquema-rachadinha-alerj/' },
    { nome: 'CNN Brasil: STJ anula decisões contra Flávio', url: 'https://www.cnnbrasil.com.br/politica/stj-anula-decisoes-contra-flavio-bolsonaro-no-caso-das-rachadinhas/' },
    { nome: 'Agência Brasil: Justiça do Rio arquiva processo (2022)', url: 'https://agenciabrasil.ebc.com.br/politica/noticia/2022-05/justica-do-rio-arquiva-processo-de-caso-de-supostas-rachadinhas' },
    { nome: 'Diário de Pernambuco: PF apura financiamento da mansão', url: 'https://www.diariodepernambuco.com.br/politica/2026/10/11725606-pf-apura-condicoes-de-financiamento-do-brb-a-flavio-bolsonaro-para-mansao-de-rs-6-milhoes.html' },
  ],
};

export const MISSAO_CARD = {
  quartel: {
    remetente: 'Grupo da Família',
    texto: 'URGENTE!!! As Forças Armadas agem em 72 horas!!! Vá para o quartel, entregue 5 marmitas aos acampados e chegue ao portão. Depois disso: soltar o Mito. Reze no pneu para salvar o progresso. Não leia checagens.',
    medida: 'Marmitas 0/5 · faltam 72 horas',
    controles: '← → anda · Espaço pula · X compartilha Zap',
  },
  urnas: {
    remetente: 'Grupo da Família',
    texto: 'URGENTE!!! O 01 tem as provas: a urna é fraudada!!! Invada o depósito, dê cabeçada em 10 urnas para achar o código secreto e leve tudo até a sala do código-fonte. Cuidado com o Fiscal: ele não muda de ideia.',
    medida: 'Urnas auditadas 0/10',
    controles: '← → anda · Espaço pula (cabeçada na urna) · X compartilha Zap',
  },
  chocolate: {
    remetente: 'Grupo da Família',
    texto: 'O 01 é um gênio dos negócios e a mídia inventou tudo!!! Prove: recolha as notinhas na fábrica e faça 12 depósitos em espécie, aos pouquinhos, na boca do caixa. Só não deposite na frente do Fiscal. Depois, vá até a mansão. Você não está entendendo nada, mas confia.',
    medida: 'Depósitos 0/12 · cabem 5 notinhas no bolso',
    controles: '← → anda · Espaço pula (pisar no Fiscal o distrai) · X compartilha Zap',
  },
};
