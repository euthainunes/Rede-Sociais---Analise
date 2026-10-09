# Rede-Sociais---Analise
## BR-WAR

Jogo de plataforma 2D satírico sobre a política brasileira. **Estado atual:** etapas E0 e E1 do MVP, com a fase 1 jogável (movimento, pulo, plataformas, checkpoints, votos, chegada e recorde local).

### Jogar

```bash
python3 -m http.server 8000   # na raiz do repositório
# abrir http://localhost:8000
```

| Ação | Teclado | Celular |
|---|---|---|
| Andar / correr (segure por 0,6 s) | ← → ou A D | ◀ ▶ |
| Pular (segure para pular mais alto) | Espaço, ↑, W ou Z | PULO |
| Descer do toldo | ↓ + pular | — |
| Pausar | Esc ou P | II |
| Trocar personagem (teste) | T | — |
| Reiniciar do checkpoint | R | — |
| Painel de depuração | ` ou F2 (ou `?debug` na URL) | — |

Escolher personagem pela URL: `?p=capitao` ou `?p=llivre`.

Testes das regras (Node 18+): `npm test`

### Documentação

- [Especificação funcional e técnica](docs/BR-WAR-especificacao.md)
- [Pacote de arte: personagens, inimigos, itens, cenários e telas](docs/arte/README.md)
- Prévia ao vivo: `python3 -m http.server` na raiz e abrir `/preview/`
