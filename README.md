# Veredito — engine de commerce intelligence e afiliados

> "Veredito" é um nome fictício provisório (`packages/brand`). Estratégia e arquitetura: [`docs/`](./docs/README.md). Decisões: [`docs/decisoes.md`](./docs/decisoes.md).

Plataforma de decisão de compra: notas com metodologia aberta, histórico real de preços ("vale comprar agora?"), comparador, consultor com IA fundamentada em dados (RAG) e links de afiliado rastreados, sem que a comissão influencie as recomendações.

## Estrutura

```
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

Variáveis de ambiente: [`.env.example`](./.env.example). Sem `ANTHROPIC_API_KEY`, o consultor funciona em modo template (a seleção de produtos é determinística; a IA só redige a explicação).

## Garantias implementadas

- **Firewall comercial:** nenhum tipo usado em notas, ranking, melhor oferta ou consultor tem campo de comissão. No banco, os papéis de ranking e editorial não leem as tabelas de comissão.
- **IA não inventa fatos:** a resposta do LLM passa por um verificador de números e citações. Se falhar duas vezes, o consultor usa a explicação por template.
- **Demonstração nunca indexa:** em modo demo o site responde `noindex`, o `robots.txt` bloqueia tudo e o sitemap fica vazio.
- **`/go` seguro:** só redireciona para ofertas armazenadas, filtra robôs, gera `click_ref` e grava o clique depois de responder.
