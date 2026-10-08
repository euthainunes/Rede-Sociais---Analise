# Etapa 8 — Modelo de banco de dados

## 8.1 Princípios

1. **Produto canônico, nunca duplicado por loja.** Produto (modelo) → Variante → Oferta (variante × loja × vendedor) → Observação de preço.
2. **Domínios separados em schemas PostgreSQL** (`catalog`, `pricing`, `commerce`, `editorial`, `people`, `analytics`, `ai`, `ops`). Permissões de banco reforçam o firewall comercial: o papel que calcula rankings **não tem `SELECT`** em `commerce.*` de comissão.
3. **IDs**: UUID v7 (ordenável no tempo, gerado na aplicação) para entidades; `bigint identity` para tabelas de alto volume (observações, eventos, cliques).
4. **Proveniência**: todo fato importante tem `source_id`, `observed_at`/`last_verified_at` e `confidence` (0–1).
5. **Nada é apagado**: `status` + `deleted_at` (soft delete) nas entidades de negócio; histórico preservado quando loja remove produto.
6. **Atributos flexíveis por categoria**: definições em tabela (`attribute_definitions`), valores tipados em `product_attribute_values` (com proveniência) e uma projeção `specs JSONB` desnormalizada no produto para leitura rápida.
7. **Particionamento por tempo** em `price_observations`, `events`, `clicks`.
8. **Idempotência** em conversões (`unique(program_id, external_id)`) e ingestões (hash de payload).

## 8.2 Diagrama (entidades centrais)

```
vertical 1─* category (árvore) 1─* attribute_definition
category 1─* product *─1 brand
product 1─* product_variant 1─* offer *─1 merchant
                           │            *─1 affiliate_program
                           │       offer 1─* price_observation (particionada)
                           └─ price_daily (rollup por variante/dia)
product 1─* product_attribute_value *─1 attribute_definition
product 1─* product_score *─1 scoring_methodology
product *─* content (via content_product)    content 1─* content_revision
click *─1 offer   click *─1 session   conversion *─0..1 click   commission 1─1 conversion
person 1─* consent  person 1─* price_alert *─1 product_variant
```

## 8.3 DDL de referência (PostgreSQL)

```sql
-- Extensões
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA catalog; CREATE SCHEMA pricing; CREATE SCHEMA commerce; CREATE SCHEMA editorial;
CREATE SCHEMA people;  CREATE SCHEMA analytics; CREATE SCHEMA ai; CREATE SCHEMA ops;

-- ───────────────────────── OPS: fontes de dados (proveniência)
CREATE TABLE ops.data_source (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('manufacturer','affiliate_feed','affiliate_api','retailer_page',
                                     'editorial_test','benchmark','manual','ai_extraction','user_report')),
  name text NOT NULL,
  base_confidence numeric(3,2) NOT NULL DEFAULT 0.5,   -- confiança padrão da fonte
  terms_notes text,                                    -- restrições de uso (ex.: retenção máxima)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────── CATALOG
CREATE TABLE catalog.vertical (
  id uuid PRIMARY KEY, slug text UNIQUE NOT NULL, name text NOT NULL,
  status text NOT NULL DEFAULT 'active', settings jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE catalog.category (
  id uuid PRIMARY KEY,
  vertical_id uuid NOT NULL REFERENCES catalog.vertical(id),
  parent_id uuid REFERENCES catalog.category(id),
  slug text UNIQUE NOT NULL,                 -- 'celulares'
  path text NOT NULL,                        -- 'tecnologia/celulares' (materializado)
  name text NOT NULL, name_singular text,
  variant_axes text[] NOT NULL DEFAULT '{}', -- {'storage','color'}
  price_bands int[] NOT NULL DEFAULT '{}',   -- {1000,1500,2000,3000,5000}
  config jsonb NOT NULL DEFAULT '{}',        -- perfis de uso, perguntas do consultor, regras de matching
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.attribute_group (
  id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES catalog.category(id),
  key text NOT NULL, label text NOT NULL, position int NOT NULL DEFAULT 0,
  UNIQUE (category_id, key)
);

CREATE TABLE catalog.attribute_definition (
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES catalog.category(id),  -- herdável por subcategorias via path
  group_id uuid REFERENCES catalog.attribute_group(id),
  key text NOT NULL,                       -- 'battery_mah'
  label text NOT NULL,                     -- 'Bateria'
  data_type text NOT NULL CHECK (data_type IN ('int','decimal','bool','text','enum','enum_multi','date','dimension')),
  unit text,                               -- 'mAh'
  enum_values jsonb,                       -- [{"key":"ip68","label":"IP68"}]
  higher_is_better boolean,                -- null = não ordinal
  is_filterable boolean NOT NULL DEFAULT false,
  is_comparable boolean NOT NULL DEFAULT true,
  is_variant_axis boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  UNIQUE (category_id, key)
);

CREATE TABLE catalog.brand (
  id uuid PRIMARY KEY, slug text UNIQUE NOT NULL, name text NOT NULL,
  website text, wikidata_id text,          -- entidade para SEO/GEO
  logo_media_id uuid, status text NOT NULL DEFAULT 'active'
);

CREATE TABLE catalog.product (                 -- MODELO canônico
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES catalog.category(id),
  brand_id uuid NOT NULL REFERENCES catalog.brand(id),
  slug text UNIQUE NOT NULL,                     -- 'samsung-galaxy-s26-ultra'
  name text NOT NULL, model text, mpn text,
  release_date date,
  lifecycle text NOT NULL DEFAULT 'active'
    CHECK (lifecycle IN ('announced','preorder','active','discontinued')),
  successor_id uuid REFERENCES catalog.product(id),
  specs jsonb NOT NULL DEFAULT '{}',             -- projeção desnormalizada dos valores verificados
  summary text,                                   -- veredito curto (editorial)
  publish_status text NOT NULL DEFAULT 'draft',
  search_vector tsvector,
  embedding vector(1024),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX ON catalog.product USING gin (search_vector);
CREATE INDEX ON catalog.product USING gin (name gin_trgm_ops);
CREATE INDEX ON catalog.product (category_id, publish_status);

CREATE TABLE catalog.product_variant (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES catalog.product(id),
  sku text UNIQUE,                              -- SKU interno
  gtin text,                                    -- EAN/GTIN quando disponível
  axes jsonb NOT NULL,                          -- {"storage":"256gb","color":"preto"}
  label text NOT NULL,                          -- '256 GB · Preto'
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  UNIQUE (product_id, axes)
);
CREATE UNIQUE INDEX ON catalog.product_variant (gtin) WHERE gtin IS NOT NULL;

CREATE TABLE catalog.product_attribute_value (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES catalog.product(id),
  variant_id uuid REFERENCES catalog.product_variant(id),  -- null = vale para o modelo
  attribute_id uuid NOT NULL REFERENCES catalog.attribute_definition(id),
  value_num numeric, value_text text, value_bool boolean, value_json jsonb,
  source_id uuid NOT NULL REFERENCES ops.data_source(id),
  source_url text,
  confidence numeric(3,2) NOT NULL,
  last_verified_at timestamptz NOT NULL,
  is_current boolean NOT NULL DEFAULT true,     -- valores antigos/conflitantes ficam como histórico
  created_by uuid
);
CREATE INDEX ON catalog.product_attribute_value (product_id, attribute_id) WHERE is_current;

CREATE TABLE catalog.product_relation (
  product_id uuid REFERENCES catalog.product(id),
  related_id uuid REFERENCES catalog.product(id),
  kind text CHECK (kind IN ('competitor','successor','predecessor','accessory','alternative_cheaper','alternative_premium')),
  source text NOT NULL DEFAULT 'editorial',     -- editorial | computed
  PRIMARY KEY (product_id, related_id, kind)
);

CREATE TABLE catalog.media (
  id uuid PRIMARY KEY, product_id uuid REFERENCES catalog.product(id),
  kind text CHECK (kind IN ('image','video_youtube','video_short')),
  url text NOT NULL, width int, height int, alt text,
  license text NOT NULL,                        -- 'press_kit' | 'affiliate_api' | 'own_photo'
  external_id text, position int DEFAULT 0
);

-- ───────────────────────── COMMERCE: lojas, programas, ofertas
CREATE TABLE commerce.merchant (
  id uuid PRIMARY KEY, slug text UNIQUE NOT NULL, name text NOT NULL,
  kind text CHECK (kind IN ('retailer','marketplace','brand_store')),
  trust_score numeric(3,2),                      -- confiabilidade (editorial, pública)
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE commerce.affiliate_program (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES commerce.merchant(id),
  network text NOT NULL,                        -- 'amazon_associates','awin','lomadee','rakuten','direct',...
  attribution_fidelity text NOT NULL CHECK (attribution_fidelity IN ('click','tag','aggregate')),
  cookie_window_hours int,
  link_template text NOT NULL,                  -- ex.: '{url}?tag={tag}' / deeplink da rede
  subid_param text,                             -- parâmetro de sub-ID quando houver
  terms jsonb NOT NULL DEFAULT '{}',            -- max_price_age_h, allow_email_links, allow_price_history...
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE commerce.commission_rate (         -- NÃO legível pelo papel de ranking/editorial
  id uuid PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES commerce.affiliate_program(id),
  category_id uuid REFERENCES catalog.category(id),
  rate numeric(6,4) NOT NULL, valid_from date NOT NULL, valid_to date
);

CREATE TABLE commerce.offer (
  id uuid PRIMARY KEY,
  variant_id uuid REFERENCES catalog.product_variant(id),  -- null enquanto aguarda matching
  merchant_id uuid NOT NULL REFERENCES commerce.merchant(id),
  program_id uuid REFERENCES commerce.affiliate_program(id),
  seller_name text, is_official_seller boolean,
  condition text NOT NULL DEFAULT 'new' CHECK (condition IN ('new','refurbished','used','imported')),
  external_id text NOT NULL,                    -- ASIN, MLB…, SKU da loja
  title_raw text NOT NULL,
  url_original text NOT NULL,
  price_cash numeric(12,2),                     -- à vista / Pix
  price_installment numeric(12,2), installments int,
  price_list numeric(12,2),                     -- "preço de" anunciado
  shipping_cost numeric(12,2),
  availability text NOT NULL DEFAULT 'unknown' CHECK (availability IN ('in_stock','out_of_stock','preorder','unknown')),
  match_status text NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending','auto','confirmed','rejected')),
  match_confidence numeric(3,2),
  source_id uuid NOT NULL REFERENCES ops.data_source(id),
  last_checked_at timestamptz NOT NULL,
  next_check_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','broken','paused')),
  UNIQUE (merchant_id, external_id, seller_name, condition)
);
CREATE INDEX ON commerce.offer (variant_id, status);

-- ───────────────────────── PRICING (série temporal)
CREATE TABLE pricing.price_observation (
  id bigint GENERATED ALWAYS AS IDENTITY,
  offer_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  observed_at timestamptz NOT NULL,
  price_cash numeric(12,2), price_installment numeric(12,2), price_list numeric(12,2),
  shipping_cost numeric(12,2),
  availability text NOT NULL,
  source_id uuid NOT NULL,
  is_anomaly boolean NOT NULL DEFAULT false,    -- erro de preço suspeito (não entra nas estatísticas)
  PRIMARY KEY (id, observed_at)
) PARTITION BY RANGE (observed_at);             -- partições mensais
CREATE INDEX ON pricing.price_observation (variant_id, observed_at DESC);

CREATE TABLE pricing.price_daily (               -- rollup por variante (todas as lojas confiáveis)
  variant_id uuid NOT NULL, day date NOT NULL,
  min_price numeric(12,2), median_price numeric(12,2), max_price numeric(12,2),
  min_merchant_id uuid, merchants_count int, in_stock_count int,
  PRIMARY KEY (variant_id, day)
);

CREATE TABLE pricing.price_stats (               -- materializado, recalculado após cada rollup
  variant_id uuid PRIMARY KEY,
  current_min numeric(12,2), current_merchant_id uuid,
  min_all_time numeric(12,2), max_all_time numeric(12,2),
  median_30d numeric(12,2), median_90d numeric(12,2), min_90d numeric(12,2),
  change_7d numeric(6,4), change_30d numeric(6,4), change_90d numeric(6,4),
  change_180d numeric(6,4), change_365d numeric(6,4),
  days_of_data int NOT NULL, price_label text,  -- excellent | good | normal | high | insufficient_data
  computed_at timestamptz NOT NULL
);

-- ───────────────────────── EDITORIAL
CREATE TABLE editorial.author (
  id uuid PRIMARY KEY, slug text UNIQUE, name text NOT NULL, bio text,
  credentials text, same_as text[]              -- perfis sociais (E-E-A-T, schema Person)
);

CREATE TABLE editorial.scoring_methodology (
  id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES catalog.category(id),
  version text NOT NULL,                        -- 'v1.0'
  criteria jsonb NOT NULL,                      -- [{key,label,weight,inputs:[attr keys],formula,editorial_adjust_max}]
  published_at timestamptz, changelog text,
  UNIQUE (category_id, version)
);

CREATE TABLE editorial.product_score (
  product_id uuid REFERENCES catalog.product(id),
  methodology_id uuid REFERENCES editorial.scoring_methodology(id),
  criterion text NOT NULL,                      -- 'overall','performance','camera',...
  objective_score numeric(4,2),                 -- calculado
  editorial_adjust numeric(4,2) NOT NULL DEFAULT 0,
  adjust_reason text,                           -- obrigatório se adjust ≠ 0
  final_score numeric(4,2) NOT NULL,
  evidence jsonb,                               -- insumos usados (valores, benchmarks, testes)
  computed_at timestamptz NOT NULL,
  PRIMARY KEY (product_id, methodology_id, criterion)
);

CREATE TABLE editorial.content (
  id uuid PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('review','comparison','best_list','guide','deal_post','video','price_index','social_asset')),
  slug text, url_path text UNIQUE,
  title text NOT NULL,
  body jsonb NOT NULL,                          -- blocos estruturados (texto + blocos de dados vivos)
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','published','needs_update','archived')),
  evidence_level text CHECK (evidence_level IN ('hands_on','data_based')),
  author_id uuid REFERENCES editorial.author(id), reviewer_id uuid,
  seo jsonb NOT NULL DEFAULT '{}',              -- title, description, canonical, robots, og
  quality_gate jsonb,                           -- resultado do portão (programáticas)
  ai_assisted boolean NOT NULL DEFAULT false,
  published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), next_review_at date
);

CREATE TABLE editorial.content_product (
  content_id uuid REFERENCES editorial.content(id), product_id uuid REFERENCES catalog.product(id),
  role text NOT NULL DEFAULT 'subject',          -- subject | pick_best | pick_budget | pick_premium | mentioned
  position int, PRIMARY KEY (content_id, product_id, role)
);

CREATE TABLE editorial.content_revision (
  id uuid PRIMARY KEY, content_id uuid REFERENCES editorial.content(id),
  body jsonb NOT NULL, changed_by uuid, change_note text, created_at timestamptz DEFAULT now()
);

CREATE TABLE editorial.redirect (
  from_path text PRIMARY KEY, to_path text NOT NULL, code int NOT NULL DEFAULT 301,
  created_at timestamptz DEFAULT now()
);

-- ───────────────────────── PEOPLE (usuários, leads, consentimento)
CREATE TABLE people.person (
  id uuid PRIMARY KEY, email citext UNIQUE, phone text,     -- telefone só se fornecido
  name text, auth_provider text, role text NOT NULL DEFAULT 'consumer',
  first_source jsonb,                           -- utm/origem da captação
  preferences jsonb NOT NULL DEFAULT '{}',      -- prioridades (Fit Score), categorias de interesse
  created_at timestamptz DEFAULT now(), deleted_at timestamptz
);

CREATE TABLE people.consent (                    -- registro imutável (append-only)
  id uuid PRIMARY KEY, person_id uuid, anon_id text,
  purpose text NOT NULL CHECK (purpose IN ('analytics','ads','personalization','email_marketing','price_alerts','whatsapp')),
  granted boolean NOT NULL, policy_version text NOT NULL,
  method text NOT NULL,                          -- banner | form | account
  ip_hash text, user_agent_hash text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE people.price_alert (
  id uuid PRIMARY KEY, person_id uuid NOT NULL REFERENCES people.person(id),
  product_id uuid NOT NULL, variant_id uuid,    -- null = qualquer variante
  kind text NOT NULL CHECK (kind IN ('target_price','any_drop','good_price_label','back_in_stock','launch')),
  target_price numeric(12,2),
  status text NOT NULL DEFAULT 'active', last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE people.alert_delivery (
  id uuid PRIMARY KEY, alert_id uuid REFERENCES people.price_alert(id),
  channel text NOT NULL, payload jsonb, sent_at timestamptz, opened_at timestamptz, clicked_at timestamptz
);

-- ───────────────────────── ANALYTICS (eventos próprios, cliques)
CREATE TABLE analytics.session (
  id uuid PRIMARY KEY, anon_id text NOT NULL, person_id uuid,
  started_at timestamptz NOT NULL, landing_path text, referrer_host text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  gclid text, channel text,                      -- organic | direct | social | paid | email | ai_referral | referral
  device text, os text, browser text, country text, region text,
  is_bot boolean NOT NULL DEFAULT false
);

CREATE TABLE analytics.event (
  id bigint GENERATED ALWAYS AS IDENTITY,
  ts timestamptz NOT NULL, name text NOT NULL,
  session_id uuid, anon_id text, person_id uuid,
  page_type text, path text,
  product_id uuid, variant_id uuid, content_id uuid, offer_id uuid,
  props jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE analytics.click (                   -- saída para varejista (fonte da verdade do clique)
  id bigint GENERATED ALWAYS AS IDENTITY,
  click_ref text NOT NULL,                       -- id curto enviado como sub-ID ao programa
  ts timestamptz NOT NULL,
  session_id uuid, anon_id text, person_id uuid,
  offer_id uuid NOT NULL, product_id uuid NOT NULL, variant_id uuid, merchant_id uuid NOT NULL, program_id uuid,
  source_path text, source_content_id uuid, page_type text,
  cta_id text, position text,                    -- 'best_offer_cta' | 'offers_table#2' | 'compare_col_3'
  campaign_id uuid, utm jsonb, device text,
  price_shown numeric(12,2), price_label_shown text,
  is_bot boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);
CREATE UNIQUE INDEX ON analytics.click (click_ref, ts);

-- ───────────────────────── COMMERCE: conversões e comissões
CREATE TABLE commerce.conversion (
  id uuid PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES commerce.affiliate_program(id),
  external_id text NOT NULL,                     -- id do pedido/transação no programa
  click_ref text,                                -- quando o programa devolve sub-ID
  tracking_tag text,                             -- quando só há tag
  ordered_at timestamptz, order_value numeric(12,2), items jsonb,
  attribution_method text NOT NULL CHECK (attribution_method IN ('click_ref','tag','allocated')),
  imported_at timestamptz NOT NULL DEFAULT now(), raw jsonb,
  UNIQUE (program_id, external_id)               -- idempotência
);

CREATE TABLE commerce.commission (
  id uuid PRIMARY KEY, conversion_id uuid UNIQUE NOT NULL REFERENCES commerce.conversion(id),
  amount numeric(12,2) NOT NULL, currency char(3) NOT NULL DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('estimated','validating','approved','invoiced','paid','reversed')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.commission_status_history (  -- trilha de auditoria financeira
  id uuid PRIMARY KEY, commission_id uuid REFERENCES commerce.commission(id),
  from_status text, to_status text NOT NULL, amount numeric(12,2),
  reason text, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.campaign (                 -- campanhas de mídia/social (UTM) e futuras de marca
  id uuid PRIMARY KEY, name text NOT NULL, channel text, utm_campaign text UNIQUE,
  starts_at date, ends_at date, budget numeric(12,2), external_ids jsonb
);

CREATE TABLE commerce.short_link (               -- /s/{code} para social/YouTube/creators
  code text PRIMARY KEY, target_path text NOT NULL, content_id uuid, campaign_id uuid,
  channel text, external_post_id text, creator_id uuid, created_at timestamptz DEFAULT now()
);

-- ───────────────────────── AI
CREATE TABLE ai.generation (
  id uuid PRIMARY KEY, purpose text NOT NULL,    -- review_draft | faq | meta | social_script | advisor_turn
  model text NOT NULL, prompt_version text NOT NULL,
  input_refs jsonb NOT NULL,                     -- ids de fatos/produtos usados
  output jsonb NOT NULL, fact_check jsonb,       -- resultado do validador de fatos
  tokens_in int, tokens_out int, cost_usd numeric(10,5),
  reviewed_by uuid, review_status text DEFAULT 'pending', created_at timestamptz DEFAULT now()
);

CREATE TABLE ai.advisor_session (
  id uuid PRIMARY KEY, session_id uuid, person_id uuid,
  category_id uuid, inferred_profile jsonb,      -- orçamento, prioridades, restrições
  recommended jsonb,                             -- produtos e papéis (best, budget, premium, value)
  feedback text, created_at timestamptz DEFAULT now()
);

-- ───────────────────────── OPS
CREATE TABLE ops.ingestion_run (
  id uuid PRIMARY KEY, source_id uuid, job text, started_at timestamptz, finished_at timestamptz,
  stats jsonb, status text, error text
);
CREATE TABLE ops.raw_offer (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, run_id uuid, source_id uuid,
  external_id text, payload jsonb, payload_hash text, fetched_at timestamptz
);
CREATE TABLE ops.link_check (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, offer_id uuid, checked_at timestamptz,
  http_status int, final_url text, redirect_chain jsonb, outcome text  -- ok | broken | redirected | unavailable | changed
);
CREATE TABLE ops.internal_alert (
  id uuid PRIMARY KEY, kind text NOT NULL,       -- stale_price | no_offer | broken_link | not_indexed | traffic_drop | ...
  severity text NOT NULL, entity_type text, entity_id uuid, details jsonb,
  status text NOT NULL DEFAULT 'open', created_at timestamptz DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE ops.page_score (
  path text, computed_at timestamptz, seo int, geo int, performance int, ux int,
  content int, conversion int, affiliate int, findings jsonb, PRIMARY KEY (path, computed_at)
);
CREATE TABLE ops.audit_log (                     -- append-only
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ts timestamptz DEFAULT now(),
  actor_id uuid, actor_role text, action text, entity_type text, entity_id text,
  before jsonb, after jsonb, ip_hash text
);
```

## 8.4 Separação dos domínios de dados (seção 29)

| Domínio | Schema | Volume | Retenção |
|---|---|---|---|
| Produto | `catalog` | baixo | permanente |
| Preço | `pricing` | alto (observações) | observações brutas: conforme termos de cada programa; rollups diários: permanente quando permitido |
| Loja / afiliados | `commerce` | baixo | permanente |
| Conversões / comissões | `commerce` | médio | 5+ anos (fiscal) |
| Usuários / leads / consentimento | `people` | médio | enquanto ativo + prazo legal; consentimento: permanente como prova |
| Conteúdo | `editorial` | baixo | permanente (com revisões) |
| Analytics | `analytics` | muito alto | eventos detalhados 13 meses; agregados permanentes |
| Social / campanhas | `commerce.campaign`, `short_link` + tabelas de métricas sincronizadas | médio | permanente (agregado) |
| IA | `ai` | médio | 12 meses (gerações), agregados permanentes |
| Operação | `ops` | médio | 6–12 meses (logs), auditoria permanente |

## 8.5 Qualidade de dados (seção 30)

| Mecanismo | Implementação |
|---|---|
| Validação | Schema por categoria (tipos, faixas plausíveis: ex. bateria 1.000–10.000 mAh); preço fora de ±60% da mediana → `is_anomaly` + alerta |
| Deduplicação | GTIN único por variante; similaridade trigram de nomes em cadastro; fila de "possíveis duplicados" |
| Matching | GTIN → MPN → regras de título por categoria (marca + modelo + armazenamento) → score; < 0,9 vai para fila humana |
| Atualização | `next_check_at` por oferta conforme popularidade e termos do programa |
| Histórico | Observações de preço append-only; `content_revision`; `product_attribute_value.is_current` |
| Logs | `ops.ingestion_run`, `ops.raw_offer` (payload bruto com hash) |
| Proveniência | `source_id`, `source_url`, `last_verified_at`, `confidence` em specs, ofertas e observações |
| Confiança | `confidence = base_confidence(fonte) × concordância entre fontes × frescor`; exibida como tooltip e usada pelo consultor (fatos < 0,7 não são afirmados) |
