-- 0009 — Jornada por sessão e atribuição multi-toque (docs/12 §12.6, docs/13 §13.6).
-- Sessões só existem para visitantes que aceitaram a medição (cookie "aid").

ALTER TABLE analytics.session ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
UPDATE analytics.session SET last_seen_at = started_at WHERE last_seen_at IS NULL;
ALTER TABLE analytics.session ALTER COLUMN last_seen_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS session_anon_started ON analytics.session (anon_id, started_at);
CREATE INDEX IF NOT EXISTS click_ref_lookup ON analytics.click (click_ref);

-- Pontos de contato da jornada de cada clique atribuído a uma venda, em ordem cronológica.
-- O peso do modelo (primeiro/último/linear/posição) é calculado na consulta a partir de (idx, n).
CREATE TABLE IF NOT EXISTS commerce.conversion_touchpoint (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversion_id uuid NOT NULL REFERENCES commerce.conversion(id) ON DELETE CASCADE,
  click_ref text,                        -- null = venda sem clique identificável
  click_weight numeric(8,6) NOT NULL CHECK (click_weight > 0 AND click_weight <= 1),
  idx int NOT NULL CHECK (idx >= 1),
  n int NOT NULL CHECK (n >= idx),
  session_id uuid,                       -- null = sem jornada (sem consentimento); canal vem do clique
  channel text NOT NULL,
  utm_source text,
  utm_campaign text,
  landing_path text,
  started_at timestamptz
);
CREATE INDEX IF NOT EXISTS touchpoint_conversion ON commerce.conversion_touchpoint (conversion_id);

REVOKE ALL ON commerce.conversion_touchpoint FROM veredito_ranking, veredito_editorial;

-- Vendas importadas antes desta migração: ponto único, canal desconhecido (não havia sessões).
INSERT INTO commerce.conversion_touchpoint (conversion_id, click_ref, click_weight, idx, n, channel)
SELECT a.conversion_id, a.click_ref, a.weight, 1, 1, CASE WHEN a.click_ref IS NULL THEN 'unattributed' ELSE 'unknown' END
FROM commerce.conversion_attribution a
WHERE NOT EXISTS (SELECT 1 FROM commerce.conversion_touchpoint t WHERE t.conversion_id = a.conversion_id);
