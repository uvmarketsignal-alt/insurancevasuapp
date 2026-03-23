import type { VercelRequest, VercelResponse } from './lib/vercel-types';
import { getSql } from './lib/db';
import { assertSyncAuth } from './lib/auth';

type SnapshotPayload = Record<string, unknown>;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();
  if (!sql) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  if (!process.env.SYNC_SECRET) {
    return res.status(503).json({ error: 'SYNC_SECRET not configured on server' });
  }

  if (req.method === 'GET') {
    const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : '';
    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id required' });
    }
    if (!assertSyncAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const rows = (await sql`
        SELECT payload, updated_at
        FROM app_snapshots
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `) as Array<{ payload: SnapshotPayload; updated_at: string }>;
      const row = rows[0];
      if (!row) {
        return res.status(404).json({ error: 'No snapshot' });
      }
      return res.status(200).json({
        payload: row.payload,
        updated_at: row.updated_at,
      });
    } catch (e) {
      console.error('sync GET', e);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    if (!assertSyncAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const body = req.body as { tenant_id?: string; payload?: SnapshotPayload };
    const tenantId = body.tenant_id;
    const payload = body.payload;
    if (!tenantId || !payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'tenant_id and payload required' });
    }
    try {
      const jsonStr = JSON.stringify(payload);
      await sql`
        INSERT INTO app_snapshots (tenant_id, payload, updated_at)
        VALUES (${tenantId}, ${jsonStr}::jsonb, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('sync POST', e);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
