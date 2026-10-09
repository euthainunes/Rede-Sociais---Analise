-- 0010 — Webhooks para CRM (backlog 6.5). Eventos de pessoas saem por uma fila com retentativas.

CREATE TABLE IF NOT EXISTS ops.webhook_endpoint (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://'),          -- https exigido na aplicação (http só em testes)
  secret text NOT NULL,                                   -- assina o corpo (HMAC-SHA256); precisa ser legível para assinar
  events text[] NOT NULL CHECK (cardinality(events) > 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES ops.staff_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.webhook_delivery (
  id uuid PRIMARY KEY,
  endpoint_id uuid NOT NULL REFERENCES ops.webhook_endpoint(id) ON DELETE CASCADE,
  event text NOT NULL,
  person_id uuid,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','delivered','failed','cancelled')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_status int,
  last_error text,
  redact_after boolean NOT NULL DEFAULT false,            -- eliminação LGPD: some o e-mail depois de entregue
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),   -- ordem de entrega, mesmo dentro de uma transação
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS webhook_delivery_due ON ops.webhook_delivery (next_attempt_at) WHERE status IN ('queued','sending');
CREATE INDEX IF NOT EXISTS webhook_delivery_endpoint ON ops.webhook_delivery (endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_delivery_person ON ops.webhook_delivery (person_id);
