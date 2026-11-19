-- Unified Media Hub schema (v1)

CREATE TABLE connections (
  id               TEXT PRIMARY KEY,
  session_hash     TEXT NOT NULL,              -- SHA-256 of the browser session cookie
  provider         TEXT NOT NULL CHECK (provider IN ('meta','tiktok')),
  external_user_id TEXT,
  display_name     TEXT,
  token_enc        TEXT NOT NULL,              -- AES-GCM encrypted access token
  refresh_enc      TEXT,                       -- AES-GCM encrypted refresh token (TikTok)
  expires_at       TEXT,                       -- ISO timestamp, nullable
  scopes           TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_connections_session ON connections(session_hash);

CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,              -- '<provider>:<kind>:<external_id>'
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('ad_account','page','advertiser')),
  external_id   TEXT NOT NULL,
  name          TEXT,
  currency      TEXT,
  selected      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_accounts_conn ON accounts(connection_id);

CREATE TABLE metrics_daily (
  date         TEXT NOT NULL,                  -- YYYY-MM-DD (account time zone)
  source       TEXT NOT NULL,                  -- meta | tiktok | google (demo only)
  account_id   TEXT NOT NULL,
  campaign     TEXT NOT NULL,
  spend        REAL NOT NULL DEFAULT 0,
  impressions  INTEGER NOT NULL DEFAULT 0,
  clicks       INTEGER NOT NULL DEFAULT 0,
  conversions  REAL NOT NULL DEFAULT 0,
  currency     TEXT,
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  pulled_at    TEXT NOT NULL,
  PRIMARY KEY (date, source, account_id, campaign)
);
CREATE INDEX idx_metrics_source_date ON metrics_daily(source, date);

CREATE TABLE learnings (
  id           TEXT PRIMARY KEY,
  status       TEXT NOT NULL CHECK (status IN ('trial','confirmed','retired')),
  source       TEXT NOT NULL,
  date         TEXT NOT NULL,
  approver     TEXT NOT NULL,
  topic        TEXT,
  lesson       TEXT NOT NULL,
  outcome      TEXT,                           -- required before status = confirmed
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  CHECK (status <> 'confirmed' OR (outcome IS NOT NULL AND length(outcome) > 0))
);

CREATE TABLE refresh_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source       TEXT NOT NULL,
  started      TEXT NOT NULL,
  finished     TEXT,
  rows         INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error','seed')),
  latency_note TEXT,
  error        TEXT
);
CREATE INDEX idx_refresh_source ON refresh_log(source, started);

CREATE TABLE oauth_state (
  state        TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  verifier_enc TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE oauth_clients (
  provider     TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  client_id    TEXT NOT NULL,
  PRIMARY KEY (provider, redirect_uri)
);
