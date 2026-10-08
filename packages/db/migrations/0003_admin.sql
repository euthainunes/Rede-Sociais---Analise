-- 0003 — Equipe (admin), sessões, fila de matching e alertas internos.

CREATE TABLE ops.staff_user (
  id uuid PRIMARY KEY,
  email citext UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','editor_chefe','editor','analista_dados','comercial','leitor')),
  password_hash text NOT NULL,                 -- scrypt$N$r$p$salt$hash
  totp_secret text NOT NULL,                   -- base32; 2FA obrigatório
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE ops.staff_session (
  token_hash text PRIMARY KEY,                 -- sha256 do token do cookie (o token em si nunca é guardado)
  user_id uuid NOT NULL REFERENCES ops.staff_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent_hash text
);
CREATE INDEX ON ops.staff_session (user_id);

-- Ofertas importadas que não casaram automaticamente com uma variante.
CREATE TABLE ops.match_candidate (
  id uuid PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES commerce.merchant(id),
  source_id uuid REFERENCES ops.data_source(id),
  external_id text NOT NULL,
  title_raw text NOT NULL,
  url text NOT NULL,
  payload jsonb NOT NULL,                      -- RawOffer normalizado
  suggestions jsonb NOT NULL DEFAULT '[]',     -- [{variantId, score, method}]
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  decided_by uuid REFERENCES ops.staff_user(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, external_id)
);

-- Uma ocorrência aberta por (tipo, entidade): recalcular não duplica.
CREATE UNIQUE INDEX internal_alert_open_unique ON ops.internal_alert (kind, entity_type, entity_id) WHERE status = 'open';

-- Firewall: editores não leem comissão nem dados da equipe.
GRANT SELECT ON ops.match_candidate TO veredito_editorial;
