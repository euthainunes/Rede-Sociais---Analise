-- 0011 — Funções com search_path fixo (recomendação de segurança do Supabase/Postgres):
-- impede que um objeto homônimo em outro esquema seja usado no lugar do esperado.
ALTER FUNCTION ops.ensure_partitions(int) SET search_path = pg_catalog, public;
ALTER FUNCTION catalog.product_search_vector() SET search_path = pg_catalog, public;
