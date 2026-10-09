-- 0002 — RAG (docs/20-rag.md), partições e papéis do firewall comercial.

-- ───────── Partições: DEFAULT evita falha de insert; mensais via função
CREATE TABLE IF NOT EXISTS pricing.price_observation_default PARTITION OF pricing.price_observation DEFAULT;
CREATE TABLE IF NOT EXISTS analytics.event_default PARTITION OF analytics.event DEFAULT;
CREATE TABLE IF NOT EXISTS analytics.click_default PARTITION OF analytics.click DEFAULT;

CREATE OR REPLACE FUNCTION ops.ensure_partitions(months_ahead int DEFAULT 2) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  t text;
  m date;
  i int;
  pname text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pricing.price_observation', 'analytics.event', 'analytics.click'] LOOP
    FOR i IN 0..months_ahead LOOP
      m := (date_trunc('month', now()) + make_interval(months => i))::date;
      pname := t || '_' || to_char(m, 'YYYYMM');
      IF to_regclass(pname) IS NULL THEN
        EXECUTE format('CREATE TABLE %s PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
          pname, t, m, (m + interval '1 month')::date);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ───────── Conteúdo publicado indexado para RAG (camada 2 — conhecimento editorial)
CREATE TABLE ai.knowledge_document (
  id text PRIMARY KEY,                           -- normalmente o id do editorial.content
  content_id uuid REFERENCES editorial.content(id),
  type text NOT NULL CHECK (type IN ('review','comparison','best_list','guide','methodology','faq','policy')),
  title text NOT NULL,
  url text NOT NULL,
  category text,
  product_ids text[] NOT NULL DEFAULT '{}',
  evidence_level text,
  published_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  embedding_model text NOT NULL
);

CREATE TABLE ai.knowledge_chunk (
  id text PRIMARY KEY,                           -- '{document_id}#{n}'
  document_id text NOT NULL REFERENCES ai.knowledge_document(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  heading_path text NOT NULL,
  category text,
  product_ids text[] NOT NULL DEFAULT '{}',
  text text NOT NULL,
  embedding_text text NOT NULL,
  token_estimate int NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL,
  embedding vector(1024) NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', embedding_text)) STORED
);
CREATE INDEX knowledge_chunk_embedding_hnsw ON ai.knowledge_chunk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX knowledge_chunk_tsv ON ai.knowledge_chunk USING gin (tsv);
CREATE INDEX knowledge_chunk_products ON ai.knowledge_chunk USING gin (product_ids);
CREATE INDEX knowledge_chunk_category ON ai.knowledge_chunk (category);

-- Registro de consultas do RAG para avaliação (o que foi buscado, o que voltou, se foi útil).
CREATE TABLE ai.retrieval_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  purpose text NOT NULL,                         -- advisor | search | content_draft
  query text NOT NULL,
  filter jsonb,
  results jsonb NOT NULL,                        -- [{chunk_id, score, ranks}]
  generation_id uuid REFERENCES ai.generation(id),
  grounding jsonb                                -- relatório do verificador
);

-- ───────── Identificadores estáveis de demonstração/seed
ALTER TABLE catalog.product ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE catalog.product ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE catalog.product ADD COLUMN IF NOT EXISTS editorial jsonb NOT NULL DEFAULT '{}';  -- forWho, notForWho, pros, cons
ALTER TABLE catalog.product_variant ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS product_variant_slug ON catalog.product_variant (product_id, slug);
ALTER TABLE commerce.merchant ADD COLUMN IF NOT EXISTS program_key text;
ALTER TABLE editorial.content ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES catalog.category(id);

-- Busca textual do produto mantida por trigger
CREATE OR REPLACE FUNCTION catalog.product_search_vector() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', unaccent(coalesce(NEW.name, '') || ' ' || coalesce(NEW.model, '') || ' ' || coalesce(NEW.summary, '')));
  RETURN NEW;
END $$;
CREATE TRIGGER product_search_vector BEFORE INSERT OR UPDATE ON catalog.product
  FOR EACH ROW EXECUTE FUNCTION catalog.product_search_vector();

-- ───────── Firewall comercial no banco (docs/13 §13.9)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veredito_ranking') THEN
    CREATE ROLE veredito_ranking NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veredito_editorial') THEN
    CREATE ROLE veredito_editorial NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA catalog, pricing, editorial, ai, commerce TO veredito_ranking, veredito_editorial;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog, pricing, editorial, ai TO veredito_ranking, veredito_editorial;
-- Do schema commerce, ranking/editorial só leem o que não revela valor comercial.
GRANT SELECT ON commerce.merchant, commerce.offer TO veredito_ranking, veredito_editorial;
GRANT SELECT (id, merchant_id, network, attribution_fidelity, cookie_window_hours, status) ON commerce.affiliate_program TO veredito_ranking, veredito_editorial;
REVOKE ALL ON commerce.commission_rate, commerce.commission, commerce.conversion, commerce.commission_status_history FROM veredito_ranking, veredito_editorial;
GRANT INSERT, UPDATE ON editorial.content, editorial.content_revision, editorial.product_score TO veredito_editorial;
