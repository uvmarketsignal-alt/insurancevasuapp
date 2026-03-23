-- Run once in Neon (or any PostgreSQL) before using /api/sync
CREATE TABLE IF NOT EXISTS app_snapshots (
  tenant_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_snapshots_updated ON app_snapshots (updated_at DESC);
