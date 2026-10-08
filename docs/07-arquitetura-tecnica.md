# Etapa 7 — Arquitetura técnica

Critérios de escolha: **simples, barato, rápido para o usuário, portável**. Um único banco relacional, uma aplicação web SSR e um worker de tarefas aguentam a operação até dezenas de milhões de pageviews/mês com CDN. Componentes novos só entram quando uma métrica justificar.

## 7.1 Visão geral

```
                    ┌──────────────── CDN / WAF (cache, bot mgmt, rate limit) ────────────────┐
Usuário ──HTTPS──▶  │  HTML ISR/SSG cacheado · imagens AVIF/WebP · /go/* nunca cacheado       │
                    └───────────────┬───────────────────────────────────────────┬─────────────┘
                                    │                                           │
                         ┌──────────▼───────────┐                    ┌──────────▼──────────┐
                         │  apps/web (Next.js)  │                    │  /api/e (beacon)    │
                         │  público + admin +   │                    │  /go/:p/:m (redir.) │
                         │  APIs + server actions│                   └──────────┬──────────┘
                         └──────────┬───────────┘                               │
                                    │                                           │
              ┌─────────────────────┼─────────────────────┬─────────────────────┘
              ▼                     ▼                     ▼
      ┌──────────────┐     ┌────────────────┐     ┌───────────────┐
      │ PostgreSQL   │◀───▶│ apps/worker    │────▶│ Integrações   │
      │ (catálogo,   │     │ fila pg-boss:  │     │ redes afil.,  │
      │ preços,      │     │ ingestão,      │     │ LLM, e-mail,  │
      │ eventos part.│     │ preço, links,  │     │ GA4 MP, GSC,  │
      │ pgvector)    │     │ alertas, notas │     │ YouTube, CRM  │
      └──────────────┘     └────────────────┘     └───────────────┘
              │
              ▼ (fase 3)
      Banco colunar (ClickHouse ou BigQuery) para eventos e atribuição em escala
```

## 7.2 Stack recomendada

| Camada | Escolha | Por quê | Alternativa |
|---|---|---|---|
| Linguagem | **TypeScript** ponta a ponta | Um idioma, tipos compartilhados entre DB/API/UI | — |
| Web | **Next.js (App Router, React Server Components)** | SSR/ISR/SSG por rota, revalidação por tag, streaming, JS mínimo no cliente com RSC, ecossistema de SEO | Astro (ainda mais leve, porém mais trabalho para admin/áreas dinâmicas) |
| Estilo | CSS Modules + tokens CSS (ou Tailwind) | Zero runtime | — |
| Banco | **PostgreSQL 16+** (Neon ou Supabase gerenciado) | Relacional + JSONB + FTS + `pg_trgm` + `unaccent` + `pgvector` + particionamento: um banco faz tudo no MVP | — |
| ORM / migrações | **Drizzle ORM** | Leve, SQL explícito, bom com edge e tipos | Prisma |
| Fila / jobs / cron | **pg-boss** no `apps/worker` (container pequeno) | Usa o próprio Postgres, sem infra nova | Trigger.dev / Inngest |
| Cache / rate limit | CDN + **Redis gerenciado** (Upstash) só para rate limit e sessões do consultor | Barato, serverless | — |
| Busca | **Postgres FTS + trigram** (MVP) → **Typesense ou Meilisearch** (fase 2, tolerância a erro e facetas rápidas) + `pgvector` (semântica) | Começar sem infra extra | Algolia (caro em escala) |
| Imagens | Object storage (Cloudflare R2/S3) + otimização (Next Image ou Cloudflare Images) | AVIF/WebP, tamanhos responsivos | — |
| Auth | **Better Auth** (ou Auth.js): e-mail mágico + Google para consumidores; senha forte + **2FA/passkey obrigatório** para admin | Self-hosted, dados no nosso banco | Supabase Auth |
| E-mail | Amazon SES ou Resend (+ domínio com SPF/DKIM/DMARC) | Custo baixo | — |
| LLM | **Claude API** via adaptador `packages/ai` (modelo forte para consultor e redação; modelo rápido para parsing de intenção e classificação) | Qualidade + tool use; adaptador permite trocar | Outros provedores via mesmo adaptador |
| Hospedagem web | Vercel (início) | Zero ops, ISR e revalidação por tag nativos | Cloudflare/AWS via OpenNext ou container próprio quando custo justificar |
| Hospedagem worker | Fly.io / Railway / Render (1 instância) | Barato | — |
| Observabilidade | Sentry (erros) + RUM próprio (biblioteca `web-vitals` → `/api/e`) + logs do provedor | Dados de Core Web Vitals reais por template | — |
| BI exploratório | Metabase (OSS) ou Looker Studio lendo réplica | Dashboards ad hoc sem código | — |

## 7.3 Estrutura de pastas (monorepo enxuto)

```
/
├── apps/
│   ├── web/                      Next.js
│   │   ├── app/
│   │   │   ├── (public)/         home, [categoria], [categoria]/[produto], comparar, melhores, ofertas, buscar, guias…
│   │   │   ├── (account)/conta/
│   │   │   ├── admin/            painel (layout próprio, noindex, middleware RBAC)
│   │   │   ├── go/[product]/[merchant]/route.ts
│   │   │   ├── api/              e (eventos), v1/*, webhooks/*
│   │   │   ├── sitemap/…  robots.ts  llms.txt/route.ts
│   │   ├── components/           ui/ + domain/
│   │   └── lib/                  seo/, schema-org/, analytics/, consent/
│   └── worker/
│       ├── jobs/                 ingest-feed, match-offers, snapshot-prices, rollup-prices,
│       │                         check-links, send-alerts, recompute-scores, import-conversions,
│       │                         sync-gsc, sync-youtube, page-scores, data-quality
│       └── schedules.ts
├── packages/
│   ├── db/                       schema Drizzle, migrações SQL, seeds
│   ├── core/                     domínio puro (sem I/O): pricing/, scoring/, matching/,
│   │                             attribution/, fit-score/, quality-gates/, verticals/
│   ├── integrations/             affiliate/{amazon,awin,lomadee,rakuten,mercadolivre,shopee,magalu,…}
│   │                             (interface comum: fetchOffers, buildAffiliateUrl, importConversions)
│   ├── ai/                       cliente LLM, ferramentas (tools), prompts versionados, validadores de fatos
│   ├── analytics/                schema de eventos (tipado), cliente beacon, GA4 Measurement Protocol
│   ├── ui/                       design tokens + componentes base
│   └── config/                   eslint, tsconfig
└── docs/
```

Regra: `packages/core` não importa nada de I/O — facilita testes e permite reutilizar a lógica no worker e no web.

## 7.4 Renderização e cache

| Conteúdo | Estratégia | Invalidação |
|---|---|---|
| Páginas institucionais, metodologia, explicadores | SSG | Deploy ou publicação |
| Produto, categoria, guias, vs, marca | **ISR** com `revalidate` de segurança (ex.: 1 h) + **revalidação por tag** (`product:{id}`, `category:{id}`) disparada quando oferta/preço/conteúdo muda | Worker chama `revalidateTag` após ingestão |
| Bloco de preço no produto | No HTML (SEO precisa do preço) — página revalidada quando o preço muda > limiar ou a cada ciclo de coleta | Tag `offers:{variantId}` |
| Ofertas | ISR 5–15 min | Tag `deals` |
| Busca, comparador livre, conta | SSR dinâmico; CDN `s-maxage` curto para buscas populares anônimas | — |
| Consultor | Streaming (SSE) | — |
| `/go/*` | **Nunca** cacheado (`Cache-Control: no-store`) | — |
| API pública v1 | `s-maxage` + `stale-while-revalidate` | Tags |
| Imagens | Imutáveis com hash, cache 1 ano | Novo hash |

Horário de coleta é exibido de forma relativa no cliente a partir do timestamp absoluto no HTML (sem desalinhamento por cache).

## 7.5 Orçamento de performance (bloqueia merge se violado)

| Métrica (p75, mobile, 4G) | Meta |
|---|---|
| LCP | < 2,0 s |
| INP | < 200 ms |
| CLS | < 0,05 |
| TTFB (cache hit) | < 200 ms |
| JS inicial na página de produto | < 70 KB gzip (inclui framework) |
| JS de terceiros antes do consentimento | 0 KB |
| Peso total da página de produto (primeira visita) | < 500 KB |
| Fontes | 1 família, ≤ 2 arquivos WOFF2 |

Técnicas: RSC por padrão (componentes cliente só onde há interação: seletor de variante, filtros, comparador, consultor, gráfico interativo); gráfico de preço SVG gerado no servidor; `<details>` nativo para acordeões; vídeo com fachada; imagens com `width/height`, `fetchpriority=high` só na LCP, `loading=lazy` no resto; preconnect só para o CDN de imagem; scripts de terceiros após consentimento e `requestIdleCallback`; Lighthouse CI + bundle size check no CI.

## 7.6 Ingestão de ofertas e preços

```
Fonte (feed de rede de afiliados / API de produto / cadastro manual / scraping permitido)
  → fetch (respeitando limites e termos)  → raw_offer (payload bruto, hash, source, fetched_at)
  → normalize (preço à vista/parcelado, moeda, disponibilidade, vendedor, condição)
  → match (GTIN → MPN → regras de título por categoria → fila humana)  → offer (por variante)
  → price_observation (só se mudou ou a cada 24 h como "heartbeat")
  → rollup diário por variante (mín., mediana, máx., nº lojas)
  → triggers: revalidateTag, avaliar alertas de usuário, anomalias de preço (alerta interno)
```

Frequência inicial: ofertas de produtos "quentes" (top 20% em tráfego) a cada 1–3 h; restante a cada 12–24 h; respeitar o limite exigido por cada programa (ex.: atualização em até 24 h com horário exibido).

## 7.7 Autenticação e autorização

| Público | Método | Sessão |
|---|---|---|
| Visitante | Anônimo (`anon_id` first-party, só após consentimento para analytics não essencial) | — |
| Consumidor | Link mágico por e-mail, Google | Cookie `HttpOnly`, `Secure`, `SameSite=Lax` |
| Equipe (admin) | E-mail + senha forte + **2FA/passkey obrigatório**; opcional SSO | Sessão curta (8 h), reautenticação para ações sensíveis |
| Integrações (webhooks entrantes) | Assinatura HMAC + allowlist de IP quando o provedor oferecer | — |
| API pública (futuro) | Chave por cliente + escopos + rate limit | — |

Papéis (RBAC): `admin`, `editor_chefe`, `editor`, `analista_dados`, `comercial`, `leitor`. Matriz de permissões por recurso/ação; **comercial não edita notas nem rankings; editor não vê comissões** (firewall comercial aplicado em permissões e em views do banco).

## 7.8 Infraestrutura e ambientes

- Ambientes: `local` (Docker Compose com Postgres), `preview` (por PR, banco branch), `production`.
- CI: typecheck, lint, testes unitários (`packages/core`), testes de integração (DB), Lighthouse CI nas rotas principais, verificação de schema.org, checagem de bundle.
- Backups: PITR do provedor + dump diário criptografado em outro provedor; teste de restauração mensal.
- Segredos: gerenciador do provedor (Vercel/Fly env); nunca no repositório; rotação semestral.
- Custo estimado inicial: R$ 300–1.500/mês (web, banco, worker, e-mail, Redis, Sentry) até ~1 M de sessões/mês; LLM à parte (Etapa 14).

## 7.9 Escala — quando mudar o quê

| Sinal | Mudança |
|---|---|
| Tabela de eventos > ~200 M linhas ou dashboards lentos | Eventos para ClickHouse/BigQuery (stream via worker), Postgres mantém só 90 dias |
| Catálogo > ~20 k produtos ou necessidade de busca tolerante a erro | Typesense/Meilisearch |
| Custo do host web > custo de 1 servidor dedicado + ops | Container próprio atrás de Cloudflare |
| Muitos verticais/equipes | Separar `apps/admin` |

Segurança e LGPD: ver [Anexo A](./anexo-a-seguranca-lgpd-juridico.md).
