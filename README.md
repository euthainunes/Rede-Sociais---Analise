# Veredito — engine de commerce intelligence e afiliados

> "Veredito" é um nome fictício provisório (`packages/brand`). Estratégia e arquitetura: [`docs/`](./docs/README.md). Decisões: [`docs/decisoes.md`](./docs/decisoes.md).

Plataforma de decisão de compra: notas com metodologia aberta, histórico real de preços ("vale comprar agora?"), comparador, consultor com IA fundamentada em dados (RAG) e links de afiliado rastreados, sem que a comissão influencie as recomendações.

## Estrutura

```
apps/worker            rotinas automáticas: coleta de feeds, histórico diário, links, alertas
apps/web               Next.js 16 — site público (SSR, sem JS obrigatório), /go (afiliados), /api/e (eventos)
packages/core          domínio puro: preço, notas, Fit Score, melhor oferta, matching, comparador, categorias
packages/integrations  adaptadores de afiliados (Amazon, Awin, template p/ Mercado Livre, Magalu, Shopee)
packages/ai            RAG (chunking, embeddings, busca híbrida, verificador) + consultor + cliente Claude
packages/db            migrações SQL, fontes de dados (demo | Postgres), serviços de página, store pgvector
packages/brand         marca (nome, domínio, cores) — trocar aqui
docs/                  Etapas 1–20
```

## Rodando

```bash
pnpm install
pnpm dev                       # http://localhost:3000 — modo demonstração (sem banco, dados fictícios)
pnpm test                      # testes unitários
```

Com Postgres 16 + pgvector:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/veredito
pnpm db:migrate && pnpm db:seed
pnpm --filter @veredito/db index-knowledge     # indexa o conteúdo publicado no RAG
TEST_DATABASE_URL=$DATABASE_URL pnpm test      # inclui os testes de integração com o banco
pnpm dev
```

### Painel administrativo (`/admin`)

Exige Postgres. Crie o primeiro usuário (o segredo do 2FA aparece uma única vez; cadastre-o num app autenticador):

```bash
ADMIN_PASSWORD='uma-senha-com-12+-caracteres' pnpm --filter @veredito/db create-admin voce@empresa.com "Seu Nome" admin
```

| Área | O que faz | Quem pode |
|---|---|---|
| Visão geral | Cliques por dia, página, CTA e loja; produtos mais clicados; contadores; alertas internos | todos |
| Produtos | Cadastro e edição com ficha técnica validada pela categoria e proveniência (fonte, URL e confiança por atributo); versões com GTIN; redirect 301 automático quando o endereço muda | admin, editor-chefe, editor, analista |
| Ofertas e matching | Importação de CSV (planilha ou Awin) → associação automática por GTIN/MPN/título → fila humana para os casos duvidosos; atualiza o histórico de preço do dia | admin, editor-chefe, analista |
| Conteúdo | Reviews, guias e explicadores com revisões; fluxo Rascunho → Revisão → Aprovado → Publicado → Atualização necessária; publicar indexa no RAG | edita: editores; publica: editor-chefe e admin |
| Auditoria | Registro somente de inclusão de toda escrita | admin, editor-chefe |

Segurança: senha (scrypt) + TOTP obrigatório; bloqueio de 15 minutos após 5 falhas; sessão de 8 h com cookie `HttpOnly`/`SameSite=Strict`, cujo hash fica no banco; permissões checadas em toda página e toda ação no servidor; comercial não edita notas e editor não vê comissão.

### Worker (rotinas automáticas)

```bash
pnpm --filter @veredito/worker start            # processo contínuo (agendador interno)
pnpm --filter @veredito/worker once all         # roda tudo uma vez e sai (para cron externo)
pnpm --filter @veredito/worker once check-links # um job específico
```

| Job | Frequência | O que faz |
|---|---|---|
| `fetch-feeds` | 5 min (respeita o intervalo de cada feed) | Baixa os feeds agendados no painel, importa e associa ofertas; falha vira alerta |
| `rollup-daily` | 30 min | Fecha o histórico do dia (e de ontem) a partir das observações de preço, sem anomalias |
| `check-links` | 15 min (40 ofertas por vez) | 404 ou redirecionamento para a home → oferta quebrada; "produto indisponível" → sem estoque |
| `expire-stale-offers` | 1 h | Oferta que nenhuma fonte confirma há 7 dias sai do site (o histórico fica) |
| `flag-content-review` | 1 h | Conteúdo publicado com revisão vencida vai para "Atualização necessária" |
| `refresh-alerts` | 30 min | Recalcula os alertas internos |
| `maintain-partitions` | diário | Cria as partições mensais de preços, eventos e cliques |

Várias instâncias podem rodar juntas: cada job tem um *lease* no banco, que expira sozinho se o processo cair. Toda execução fica em `ops.job_run` e aparece na visão geral do painel. Preço fora de ±60% da mediana de 90 dias pausa a oferta e abre alerta. O acesso de rede tem proteção contra SSRF: só https e só IPs públicos. Sem servidor dedicado, o workflow `.github/workflows/worker.yml` roda tudo a cada 15 minutos (basta configurar o segredo `WORKER_DATABASE_URL`).

Variáveis de ambiente: [`.env.example`](./.env.example). Sem `ANTHROPIC_API_KEY`, o consultor funciona em modo template (a seleção de produtos é determinística; a IA só redige a explicação).

## Garantias implementadas

- **Firewall comercial:** nenhum tipo usado em notas, ranking, melhor oferta ou consultor tem campo de comissão. No banco, os papéis de ranking e editorial não leem as tabelas de comissão.
- **IA não inventa fatos:** a resposta do LLM passa por um verificador de números e citações. Se falhar duas vezes, o consultor usa a explicação por template.
- **Demonstração nunca indexa:** em modo demo o site responde `noindex`, o `robots.txt` bloqueia tudo e o sitemap fica vazio.
- **`/go` seguro:** só redireciona para ofertas armazenadas, filtra robôs, gera `click_ref` e grava o clique depois de responder.
