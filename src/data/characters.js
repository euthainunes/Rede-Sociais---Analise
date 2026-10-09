// Atributos dos personagens jogáveis (§4.1). Ajustes de equilíbrio são feitos aqui, nunca no código.

export const CHARACTERS = {
  capitao: {
    id: 'capitao',
    name: 'CAPITÃO',
    walkSpeed: 120,
    runSpeed: 190,
    jumpTiles: 3.5,
    hp: 3,
    item: 'carteira',
    ammo: 10,
  },
  llivre: {
    id: 'llivre',
    name: 'L-LIVRE',
    walkSpeed: 105,
    runSpeed: 165,
    jumpTiles: 4.25,
    hp: 4,
    item: 'picanha',
    ammo: 6,
  },
};

// Caixa de colisão (menor que o sprite 16x24, para o jogo parecer justo).
export const HITBOX = { w: 10, h: 22, offsetX: 3, offsetY: 2 };
