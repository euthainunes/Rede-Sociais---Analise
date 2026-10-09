// Atributos do Patrício (Missão Patriota). Ajustes de equilíbrio aqui, nunca no código.

export const PATRICIO_STATS = {
  id: 'patricio',
  name: 'PATRÍCIO',
  walkSpeed: 115,
  runSpeed: 180,
  jumpTiles: 3.75,
  hp: 1, // não usado: no lugar de vida há a Fé
  item: 'zap',
  ammo: 12,
};

export const FE = {
  max: 100,
  hitEnemy: 20, // encostar num militante/sindicalista
  hitChecador: 30, // ler uma checagem dói mais
  hitZapSelf: 10, // a corrente voltou
  invulnerable: 1.2,
  ammoPickup: 6,
  hitFlagra: 10, // o Fiscal viu o depósito
  bolsoMax: 5, // quantas notinhas cabem no bolso
};

export const SCORE = {
  vote: 10,
  convert: 100,
  stomp: 150,
  marmita: 200,
  pendrive: 300,
  urna: 150,
  deposito: 100,
  checkpoint: 250,
  complete: 2000,
};
