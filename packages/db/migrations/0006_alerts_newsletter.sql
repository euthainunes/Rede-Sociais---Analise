-- 0006 — Alertas de preço, newsletter, fila de e-mails (outbox) e limites de requisição.

ALTER TABLE people.person ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;
ALTER TABLE people.person ADD COLUMN IF NOT EXISTS newsletter_status text NOT NULL DEFAULT 'none'
  CHECK (newsletter_status IN ('none','pending','subscribed','unsubscribed'));

ALTER TABLE people.price_alert ADD COLUMN IF NOT EXISTS baseline_price numeric(12,2);   -- preço quando o alerta foi criado/disparado
ALTER TABLE people.price_alert ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE people.price_alert ADD COLUMN IF NOT EXISTS last_notified_price numeric(12,2);
ALTER TABLE people.price_alert ADD CONSTRAINT price_alert_status_check
  CHECK (status IN ('pending','active','paused','cancelled','fulfilled'));
CREATE INDEX IF NOT EXISTS price_alert_active ON people.price_alert (status) WHERE status = 'active';

-- Transactional outbox: o site enfileira; o worker envia com retentativas.
CREATE TABLE ops.email_outbox (
  id uuid PRIMARY KEY,
  person_id uuid REFERENCES people.person(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  kind text NOT NULL,                       -- confirm_alert | confirm_newsletter | manage_link | price_alert | newsletter
  subject text NOT NULL,
  html text NOT NULL,
  text_body text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX ON ops.email_outbox (status, next_attempt_at) WHERE status = 'queued';

-- Limites simples por chave (e-mail, IP com hash) e janela.
CREATE TABLE ops.rate_limit (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
