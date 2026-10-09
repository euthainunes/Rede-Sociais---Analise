-- 0004 — Worker: fontes de feed agendadas e registro de execuções de jobs.

CREATE TABLE ops.feed_source (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES commerce.merchant(id),
  url text NOT NULL CHECK (url ~ '^https?://'),  -- https exigido na aplicação (assertPublicUrl); http só em teste
  format text NOT NULL CHECK (format IN ('planilha','awin')),
  interval_minutes int NOT NULL DEFAULT 180 CHECK (interval_minutes >= 30),
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  created_by uuid REFERENCES ops.staff_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, url)
);

CREATE TABLE ops.job_run (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error','skipped')),
  result jsonb,
  error text
);
CREATE INDEX ON ops.job_run (job, started_at DESC);

ALTER TABLE commerce.offer ADD COLUMN IF NOT EXISTS last_link_check_at timestamptz;
CREATE INDEX IF NOT EXISTS offer_link_check ON commerce.offer (last_link_check_at NULLS FIRST) WHERE status = 'active';

-- Lease de execução por job: evita duas instâncias rodando o mesmo job e expira sozinho se o processo morrer.
CREATE TABLE ops.job_lock (
  job text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  holder text
);
