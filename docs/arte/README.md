# BR-WAR — Pacote de arte

Toda a arte do jogo é **código**: sprites são grades de letras + paleta, e cenários/tiles são desenhados proceduralmente no canvas. Nenhum arquivo de imagem é necessário para rodar o jogo. As PNGs desta pasta são só prévias exportadas.

Resolução lógica: **384×216** (16:9), ampliada em escala inteira. Prévias exportadas em ×3.

## Ver ao vivo

```bash
python3 -m http.server 8000   # na raiz do repositório
# abrir http://localhost:8000/preview/
```

## Arquivos (`src/art/`)

| Arquivo | Conteúdo |
|---|---|
| `pixel.js` | `sprite()`, `patch()`, `draw()` (com espelhamento, escala e troca de paleta), `rng()` determinístico |
| `font.js` | Fonte pixel 3×5 com acentos do português (Á Ã Â Ç É Ê Í Ó Õ Ô Ú) e símbolos ❤ ★ ✓ ▶ ◀ |
| `characters.js` | Capitão e L-Livre: frente, parado (3/4), 2 quadros de caminhada, pulo, arremesso, vitória, especial |
| `enemies.js` | 8 inimigos (parado/andando/convertido) a partir de um corpo-base + acessórios; Centrão 24×24 neutro e "aliado" de cada lado |
| `items.js` | Projéteis (carteira, picanha, coração), coletáveis, projéteis inimigos (textão, curso grátis), HUD e efeitos |
| `tiles.js` | Chão, blocos e plataformas one-way para 6 temas; urna-checkpoint, caixote, cone, bloco FAKE, PROMESSA, carimbo, trio elétrico, balão de chat, palanque |
| `backgrounds.js` | 6 cenários com parallax (bairro, avenida, repartição, grupo da família, plenário, Praça dos Três Poderes) |
| `hud.js` | HUD, balão de fala, texto flutuante, faixa de plantão, controles de toque |
| `scenes.js` / `sheet.js` | Composições de demonstração e folha de referência (usadas só na prévia) |

## Prévias

| | |
|---|---|
| ![Tela inicial](cenas/title.png) | ![Seleção](cenas/selecao.png) |
| ![Fase 1](cenas/fase1.png) | ![Fase 2](cenas/fase2.png) |
| ![Fase 3](cenas/fase3.png) | ![Fase 4](cenas/fase4.png) |
| ![Fase 5](cenas/fase5.png) | ![Fase 6](cenas/fase6.png) |
| ![Fase concluída](cenas/conclusao.png) | ![Game over](cenas/gameOver.png) |
| ![Celular](cenas/celular.png) | |

![Folha de sprites](cenas/sheet.png)

## Decisões de arte

- **Inimigos são arquétipos de discurso**, com metade associada a cada lado e alguns neutros (Atendente, Repórter, Centrão). A cor da roupa sinaliza a afinidade: amarelo/verde converte com picanha e vermelho converte com carteira.
- **Inimigo convertido** ganha sorriso e corações em vez de "morrer".
- **O Centrão aliado** veste a cor de quem "investiu" nele.
- **A Bíblia nunca é projétil.** Ela só aparece erguida no especial do Capitão.
- **Os cenários usam paletas distintas por fase**, para o jogador perceber a progressão: dia → avenida acinzentada → interior bege → interface verde → plenário escuro → pôr do sol em Brasília.
- **A legibilidade vem primeiro:** os fundos são mais claros/dessaturados que a camada de jogo, o texto tem contorno e o HUD fica sobre painéis escuros.

## Como adicionar um inimigo

```js
export const NOVO = make('novo', { H: '#cabelo', C: '#camisa', A: '#gola', P: '#calca', L: '#perna', B: '#sapato' }, [
  [x, y, ['fileira', 'de', 'pixels']], // acessórios (remendos sobre o corpo-base)
]);
```

## Missão Patriota (v2)

Arquivos em `src/art/missao/`: `characters.js` (Patrício, 01, Capitão na domiciliar, Tio Sam, Checador, Fiscal, Careca do Mal, Cachorro), `items.js`, `backgrounds.js` (quartel, rodovia, fábrica de chocolate, porto, domiciliar, esplanada), `hud.js` (Fé + 72h), `scenes.js` e `sheet.js`. Prévia ao vivo: `/preview/missao.html`.

| | |
|---|---|
| ![Título](missao/title.png) | ![Mapa](missao/mapa.png) |
| ![Missão](missao/missao.png) | ![Fase 1](missao/fase1.png) |
| ![Fase 2](missao/fase2.png) | ![Fase 3](missao/fase3.png) |
| ![Fase 4](missao/fase4.png) | ![Fase 5](missao/fase5.png) |
| ![Fase 6](missao/fase6.png) | ![Fase 7](missao/fase7.png) |
| ![Checagem](missao/checagem.png) | ![Final](missao/final.png) |
| ![Game over](missao/gameOver.png) | ![Folha](missao/sheet.png) |
