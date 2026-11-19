-- Batch 2: brand-memory matching fields, per-session learnings, synthetic plan / agency / last-year tables, kv

ALTER TABLE learnings ADD COLUMN patterns TEXT;        -- regex (seeded) or escaped keyword alternation (user-created)
ALTER TABLE learnings ADD COLUMN decision_taken TEXT;
ALTER TABLE learnings ADD COLUMN channel TEXT;
ALTER TABLE learnings ADD COLUMN source_ref TEXT;
ALTER TABLE learnings ADD COLUMN session_hash TEXT;    -- NULL = global synthetic demo row

CREATE TABLE plan_weekly (
  week_index INTEGER NOT NULL, week_start TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL,
  campaign_type TEXT, budget REAL, target_impressions INTEGER, target_clicks INTEGER, target_conversions INTEGER,
  kpi_definition TEXT, line_no INTEGER, is_synthetic INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (week_start, source, campaign)
);

CREATE TABLE agency_weekly (
  line_no INTEGER NOT NULL, week_start TEXT NOT NULL, period_start TEXT NOT NULL, period_end TEXT NOT NULL,
  source TEXT NOT NULL, campaign TEXT NOT NULL, spend REAL, impressions INTEGER, clicks INTEGER, conversions REAL,
  kpi_definition TEXT, is_synthetic INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (line_no)
);

CREATE TABLE lastyear_weekly (
  week_index INTEGER NOT NULL, source TEXT NOT NULL, campaign_type TEXT NOT NULL,
  spend REAL, impressions INTEGER, clicks INTEGER, conversions REAL, is_synthetic INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (week_index, source, campaign_type)
);

CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
