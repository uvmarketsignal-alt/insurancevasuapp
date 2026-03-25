import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!_sql) _sql = neon(url);
  return _sql;
}
export async function syncState(tenantId: string, snapshot: any) {
  const sql = getSql();
  if (!sql) throw new Error('DB URL not set');

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_state (
      tenant_id TEXT PRIMARY KEY,
      snapshot JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Upsert
  await sql`
    INSERT INTO tenant_state (tenant_id, snapshot, updated_at)
    VALUES (${tenantId}, ${snapshot}, NOW())
    ON CONFLICT (tenant_id)
    DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()
  `;
}

export async function getLatestSnapshot(tenantId: string) {
  const sql = getSql();
  if (!sql) return null;

  const results = (await sql`
    SELECT snapshot FROM tenant_state WHERE tenant_id = ${tenantId}
  `) as any[];

  if (!results || results.length === 0) return null;
  return results[0].snapshot;
}
