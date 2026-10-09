-- 0007 — Conversões, comissões e atribuição (docs/12 §12.6, docs/13 §13.6).

-- Programas identificados pela chave do registro em código (packages/integrations); rede pode cobrir várias lojas.
ALTER TABLE commerce.affiliate_program ADD COLUMN IF NOT EXISTS key text UNIQUE;
ALTER TABLE commerce.affiliate_program ALTER COLUMN merchant_id DROP NOT NULL;
ALTER TABLE commerce.affiliate_program ALTER COLUMN link_template DROP NOT NULL;

ALTER TABLE analytics.click ADD COLUMN IF NOT EXISTS program_key text;
CREATE INDEX IF NOT EXISTS click_program_ts ON analytics.click (program_key, ts);

ALTER TABLE commerce.conversion ADD COLUMN IF NOT EXISTS merchant_slug text;

-- Peso de cada clique numa conversão: 1 (sub-ID exato) ou fração (alocação por tag/agregado).
CREATE TABLE commerce.conversion_attribution (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversion_id uuid NOT NULL REFERENCES commerce.conversion(id) ON DELETE CASCADE,
  click_ref text,                       -- null = venda sem clique identificável na janela
  product_id uuid,
  source_path text,
  page_type text,
  cta_id text,
  channel text,
  weight numeric(8,6) NOT NULL CHECK (weight > 0 AND weight <= 1),
  method text NOT NULL CHECK (method IN ('click_ref','tag','allocated','unattributed'))
);
CREATE INDEX ON commerce.conversion_attribution (conversion_id);
CREATE INDEX ON commerce.conversion_attribution (source_path);

REVOKE ALL ON commerce.conversion_attribution FROM veredito_ranking, veredito_editorial;
