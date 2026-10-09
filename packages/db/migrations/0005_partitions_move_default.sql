-- 0005 — ensure_partitions passa a mover para a nova partição as linhas que caíram na partição DEFAULT
-- (sem isso, criar a partição do mês falha quando já há dados daquele mês na DEFAULT).
CREATE OR REPLACE FUNCTION ops.ensure_partitions(months_ahead int DEFAULT 2) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  t text;
  m date;
  i int;
  pname text;
  dname text;
  col text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pricing.price_observation', 'analytics.event', 'analytics.click'] LOOP
    dname := t || '_default';
    col := CASE t WHEN 'pricing.price_observation' THEN 'observed_at' ELSE 'ts' END;
    FOR i IN 0..months_ahead LOOP
      m := (date_trunc('month', now()) + make_interval(months => i))::date;
      pname := t || '_' || to_char(m, 'YYYYMM');
      IF to_regclass(pname) IS NULL THEN
        EXECUTE format('CREATE TABLE %s (LIKE %s INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', pname, t);
        EXECUTE format('WITH moved AS (DELETE FROM %s WHERE %I >= %L AND %I < %L RETURNING *) INSERT INTO %s SELECT * FROM moved',
          dname, col, m, col, (m + interval '1 month')::date, pname);
        EXECUTE format('ALTER TABLE %s ATTACH PARTITION %s FOR VALUES FROM (%L) TO (%L)',
          t, pname, m, (m + interval '1 month')::date);
      END IF;
    END LOOP;
  END LOOP;
END $$;
