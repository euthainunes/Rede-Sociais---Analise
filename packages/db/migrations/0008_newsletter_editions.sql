-- 0008 — Edições da newsletter (montadas automaticamente, revisadas e aprovadas por pessoas).
CREATE TABLE editorial.newsletter_edition (
  id uuid PRIMARY KEY,
  slug text UNIQUE NOT NULL,                    -- '2026-W41'
  subject text NOT NULL,
  intro text NOT NULL,
  items jsonb NOT NULL,                         -- [{kind:'deal'|'content', title, subtitle, url, include}]
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','cancelled')),
  prices_as_of timestamptz NOT NULL,
  created_by uuid REFERENCES ops.staff_user(id),
  sent_by uuid REFERENCES ops.staff_user(id),
  recipients int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE ops.email_outbox ADD COLUMN IF NOT EXISTS edition_id uuid REFERENCES editorial.newsletter_edition(id);
CREATE UNIQUE INDEX IF NOT EXISTS outbox_edition_person ON ops.email_outbox (edition_id, person_id) WHERE edition_id IS NOT NULL;
