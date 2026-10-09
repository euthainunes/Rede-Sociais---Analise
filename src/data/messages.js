// Frases satíricas por evento (§6). Para adicionar frases, basta editar esta lista.
// character: 'capitao' | 'llivre' | 'any'

export const MESSAGES = [
  { event: 'checkpoint', character: 'any', text: 'Checkpoint! Seu progresso foi salvo, ao contrário do orçamento.' },
  { event: 'checkpoint', character: 'any', text: 'Urna apurada: você continua no páreo.' },
  { event: 'checkpoint', character: 'capitao', text: 'Missão dada é missão cumprida.' },
  { event: 'checkpoint', character: 'capitao', text: 'Ponto de apoio conquistado, talkey?' },
  { event: 'checkpoint', character: 'llivre', text: 'Vamos fazer uma pausa para o cafezinho.' },
  { event: 'checkpoint', character: 'llivre', text: 'Checkpoint! Agora é só esperar a picanha chegar.' },

  { event: 'death', character: 'any', text: 'Caiu na obra parada. Previsão de entrega: 2038.' },
  { event: 'death', character: 'any', text: 'Isso foi um ataque da imprensa!' },
  { event: 'death', character: 'any', text: 'Sua aprovação despencou. Culpe a gestão anterior.' },
  { event: 'death', character: 'capitao', text: 'Foi fake news, tá ok?' },
  { event: 'death', character: 'llivre', text: 'Nunca antes na história deste país alguém caiu tanto.' },

  { event: 'promessa', character: 'any', text: 'Promessa de campanha: não pise duas vezes.' },
  { event: 'promessa', character: 'any', text: 'Essa promessa não durou nem o primeiro mandato.' },

  { event: 'start', character: 'capitao', text: 'Rumo ao Planalto! Brasil acima de tudo... inclusive dos buracos.' },
  { event: 'start', character: 'llivre', text: 'Companheiros, rumo ao Planalto! Alguém viu a picanha?' },

  { event: 'complete', character: 'any', text: 'CANDIDATO AVANÇA E PROMETE CONCLUIR A FASE ANTERIOR' },
  { event: 'complete', character: 'any', text: 'PESQUISA: 98% DOS ELEITORES NÃO LEMBRAM EM QUEM VOTARAM' },
  { event: 'complete', character: 'any', text: 'VITÓRIA APERTADA: ADVERSÁRIOS PEDEM RECONTAGEM' },

  { event: 'gameover', character: 'any', text: 'Seu marqueteiro pediu demissão.' },
  { event: 'gameover', character: 'any', text: 'Talvez seja hora de mudar de estratégia. Ou de partido.' },
];
