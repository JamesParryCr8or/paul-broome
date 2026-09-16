-- Apply once to a private Postgres database (Neon or another provider).
-- Use a server-only role. Never expose these tables through a public data API.
CREATE TABLE IF NOT EXISTS funnel_leads (
 id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 payload jsonb NOT NULL,
 payload_hash text NOT NULL,
 score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
 tier text NOT NULL,
 route text NOT NULL,
 sync_status text NOT NULL DEFAULT 'pending',
 sync_attempts integer NOT NULL DEFAULT 0,
 sync_started_at timestamptz,
 synced_at timestamptz,
 ghl_contact_id text,
 last_sync_error text
);
CREATE INDEX IF NOT EXISTS funnel_leads_sync_idx ON funnel_leads(sync_status,created_at);
ALTER TABLE funnel_leads ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS funnel_rate_limits (
 bucket text PRIMARY KEY,
 count integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE funnel_rate_limits ENABLE ROW LEVEL SECURITY;

-- Post-booking diagnostic. The same UUID is carried from the first assessment,
-- through the booking link and into this record so every stage remains connected.
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
 id uuid PRIMARY KEY,
 lead_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 payload jsonb NOT NULL,
 revision bigint NOT NULL DEFAULT 0,
 current_step integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'started',
 sync_status text NOT NULL DEFAULT 'pending',
 sync_attempts integer NOT NULL DEFAULT 0,
 sync_started_at timestamptz,
 synced_at timestamptz,
 ghl_contact_id text,
 ghl_note_id text,
 last_sync_error text
);
CREATE INDEX IF NOT EXISTS diagnostic_sessions_sync_idx ON diagnostic_sessions(sync_status,updated_at);
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
