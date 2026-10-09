-- 0012 — Correções críticas do painel (etapa 1).
-- Só acrescenta colunas e um índice; pode rodar antes do deploy do código novo sem afetar o site atual.

-- Conteúdo: a versão no ar fica separada da versão em edição. Editar um texto publicado, ou o ciclo de revisão
-- de 90 dias, não tira mais a página do ar; só arquivar tira.
ALTER TABLE editorial.content ADD COLUMN IF NOT EXISTS live jsonb;      -- {"title", "body"} da última publicação
ALTER TABLE editorial.content ADD COLUMN IF NOT EXISTS live_at timestamptz;
UPDATE editorial.content SET live = jsonb_build_object('title', title, 'body', body), live_at = coalesce(updated_at, published_at, now())
WHERE live IS NULL AND status IN ('published', 'needs_update');

-- 2FA: cada código vale uma vez (guarda o último passo de 30 s aceito).
ALTER TABLE ops.staff_user ADD COLUMN IF NOT EXISTS totp_last_step bigint;

-- Limite de tentativas de login por rede (consulta por ip_hash recente).
CREATE INDEX IF NOT EXISTS audit_log_login_ip ON ops.audit_log (ip_hash, ts) WHERE action IN ('staff.login_failed', 'staff.locked');
