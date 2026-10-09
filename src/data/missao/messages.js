// Frases da Missão Patriota. Voz: o Patrício (fé cega) ou o Grupo da Família.
// Para adicionar frases, basta editar esta lista.

const any = (event, ...texts) => texts.map((text) => ({ event, character: 'any', text }));

export const MESSAGES_MISSAO = [
  ...any('start', 'Recebido: "SOLTEM O MITO!!! REPASSEM". Missão aceita.', 'O Grupo mandou: primeiro o quartel. Depois o Mito.'),
  ...any('hurt', 'Foi o Xandão.', 'Fraude no tropeço!', 'Isso aí foi a Globo.', 'Ataque comunista!', 'Perseguição!'),
  ...any('checador', 'Li uma checagem sem querer. Que dor.', 'Fonte? Que fonte? Eu tenho o Zap!', 'Não li, não vi, não acredito.'),
  ...any('zapSelf', 'Quem compartilhou isso?! ...ah, fui eu.', 'A corrente voltou! Deve ser sinal.', 'Recebi de mim mesmo. Repassando!'),
  ...any('convert', 'ENCAMINHADO!', 'MAIS UM ACORDOU!', 'CONVERTIDO!', 'ENTROU PRO GRUPO!'),
  ...any('marmita', 'Valeu, patriota! Só mais 72 horas.', 'Marmita de quartel tem gosto de vitória.', 'Comendo pelo Brasil!', 'Tem farofa? Tem fé.'),
  ...any('checkpoint', 'Senhor Pneu, iluminai o caminho.', 'Pneu abençoado. Progresso salvo.', 'Rezei pro pneu. Agora vai.'),
  ...any('death', 'Caí no buraco da obra parada. Coisa do PT.', 'Isso não foi queda. Foi fraude.', 'Levanta, patriota! O Mito precisa de você.'),
  ...any('clock', 'Faltam 72 horas. Agora vai.', 'Zerou? Então recomeça. Faltam 72 horas.', 'Meu primo do Exército disse que agora é sério.'),
  ...any('gate', 'Faltam marmitas! Patriota com fome não faz intervenção.', 'O portão só abre com o povo alimentado.'),
  ...any('pendrive', 'PROVA DA FRAUDE! Depois eu abro.', 'Achei as provas! Estão guardadas. Bem guardadas.'),
  ...any('promessa', 'Promessa de intervenção: não pise duas vezes.'),
  ...any('urna', 'Vazia? Então apagaram as provas. Isso prova tudo!', 'Nada?! Que fraude bem-feita.', 'Só tem voto aqui dentro. SUSPEITO.', '0 erros. Claramente manipulado.', 'O código secreto deve estar na próxima.', 'Vou mandar print pro Grupo.'),
  ...any('fiscal', 'O fiscal me olhou feio. Censura!', 'Fiscal comunista!', 'Ele quer ver meu título de eleitor?!'),
  ...any('deposito', 'Depositado! Aos pouquinhos, como manda o figurino.', 'Na boca do caixa. Tudo limpinho.', 'Isso é empreendedorismo, tá ok?', 'Bombom vende muito. MUITO.'),
  ...any('flagra', 'O Fiscal viu! Isso é perseguição!', 'Fui flagrado? Não, fui PERSEGUIDO.', 'Era troco do bombom, juro!'),
  ...any('bolso', 'Bolso cheio! Hora de depositar.', 'Não cabe mais notinha. Que problemão bom.'),
  ...any('objetivo', 'Ainda falta! O Grupo quer resultados.', 'Não posso voltar de mãos vazias pro Grupo.'),
];

export const HEADLINES_MISSAO = {
  complete: ['O PORTÃO NÃO ABRIU, MAS A FÉ CONTINUA INTACTA', 'PATRIOTA ENTREGA MARMITAS E AGUARDA AS 72 HORAS (PELA 14ª VEZ)'],
  chocolate: ['PATRIOTA DEPOSITA TUDO EM ESPÉCIE E JURA: É SÓ BOMBOM', 'MANSÃO ATINGIDA. O PATRÍCIO CONTINUA MORANDO DE ALUGUEL'],
  urnas: ['PATRIOTA AUDITA 10 URNAS E CONCLUI: FRAUDE PERFEITA, SEM DEIXAR NENHUMA PROVA', 'SALA DO CÓDIGO-FONTE TINHA SÓ UM CAFEZINHO FRIO'],
  gameover: ['VOCÊ ACORDOU.'],
};
