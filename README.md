# Rede-Sociais---Analise
## BR-WAR — Operação Liberta o Mito

Jogo de plataforma 2D satírico. Você é o **Patrício**, um patriota de grupo de Zap com uma missão: **soltar o Jair**. Cada fase começa com uma fake news em que ele acredita e termina na **Checagem**, que mostra o fato real com a fonte.

**Estado atual:** a fase 1 (**Acampamento do Quartel**) pode ser jogada do início ao fim: tela inicial, cartão de missão, a fase em si e a Checagem.

![Fase 1](docs/jogo/missao-entrega.png)

### Jogar

```bash
python3 -m http.server 8000   # na raiz do repositório
# abrir http://localhost:8000          → Operação Liberta o Mito
# abrir http://localhost:8000/?jogar   → pula direto para a fase
# abrir http://localhost:8000/classico.html → protótipo antigo (Capitão × L-Livre)
```

| Ação | Teclado | Celular |
|---|---|---|
| Andar / correr (segure 0,6 s) | ← → ou A D | ◀ ▶ |
| Pular (segure para pular mais alto) | Espaço, ↑, W ou Z | PULO |
| Compartilhar corrente de Zap | X ou J | ZAP |
| Descer da lona | ↓ + pular | — |
| Pausar | Esc ou P | II |
| Painel de depuração | ` (crase) ou `?debug` na URL | — |

### Regras da fase 1

- **Objetivo:** pegar marmitas e entregar 5 aos acampados. Depois, chegar ao portão do quartel, que só abre com todos alimentados.
- **Fé (no lugar de vida):** cai quando você encosta em Militantes e Sindicalistas, e cai mais ainda com o **Checador de Fatos**. Com a Fé zerada, o Patrício "acorda" (game over).
- **Corrente de Zap:** quando converte alguém, ela se multiplica. Depois de um tempo, **volta e acerta quem compartilhou**. O Checador não se converte: ele marca a corrente como "FAKE".
- **Pisar** converte Militantes e Sindicalistas e só atordoa o Checador.
- **Pneu sagrado** é o checkpoint: o Patrício reza e a Fé volta ao máximo.
- **Contador das 72 horas:** quando zera, recomeça.
- **Pendrives:** são as "provas da fraude". Na Checagem, descobre-se que estão vazios.
- Buracos de obra parada custam uma vida (3 no total).

### Fontes da Checagem da fase 1

- [Poder360: acampamentos desfeitos no país](https://www.poder360.com.br/brasil/acampamentos-de-extremistas-de-direita-sao-desfeitos-no-pais/)
- [O Povo: Bolsonaro deixa o Brasil rumo aos EUA (30/12/2022)](https://www.opovo.com.br/noticias/mundo/2022/12/30/amp/bolsonaro-deixa-o-brasil-rumo-aos-eua-as-vesperas-da-posse-de-lula.html)
- [Poder360: STF condenou 835 pelo 8 de Janeiro](https://www.poder360.com.br/poder-justica/depois-de-3-anos-stf-condenou-810-envolvidos-no-8-de-janeiro/)
- [TSE: relatório de transparência eleitoral 2022](https://www.tse.jus.br/eleicoes/eleicoes-2022/arquivos/transparencia-eleitoral-brasil)

Testes das regras (Node 18+): `npm test`. Inclui um robô que conclui a fase 1 entregando as 5 marmitas.

> Sátira. Feito com auxílio de IA. Personagens são caricaturas; fatos com fonte na tela de Checagem.

### Documentação

- [Conceito atual: Operação Liberta o Mito (v3)](docs/BR-WAR-v3-liberta-o-mito.md)
- [Missão Patriota (v2): arte, HUD e mecânicas](docs/BR-WAR-v2-missao-patriota.md)
- [Especificação técnica original (v1)](docs/BR-WAR-especificacao.md)
- [Pacote de arte](docs/arte/README.md)
