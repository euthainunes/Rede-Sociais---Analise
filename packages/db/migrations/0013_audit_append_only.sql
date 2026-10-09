-- 0013 — Auditoria somente de inclusão (etapa 2 do painel).
-- Até aqui o "append-only" era só uma convenção: qualquer UPDATE/DELETE/TRUNCATE com o usuário da aplicação
-- apagava o rastro. Agora o banco recusa. Só acrescenta funções, gatilhos e índices; não mexe em dados.
CREATE OR REPLACE FUNCTION ops.audit_log_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'ops.audit_log é somente de inclusão: % não é permitido', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS audit_log_append_only ON ops.audit_log;
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON ops.audit_log
  FOR EACH ROW EXECUTE FUNCTION ops.audit_log_append_only();
DROP TRIGGER IF EXISTS audit_log_no_truncate ON ops.audit_log;
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON ops.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION ops.audit_log_append_only();

-- Filtros da tela de auditoria.
CREATE INDEX IF NOT EXISTS audit_log_action_id ON ops.audit_log (action, id DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_id ON ops.audit_log (actor_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity ON ops.audit_log (entity_type, entity_id);
