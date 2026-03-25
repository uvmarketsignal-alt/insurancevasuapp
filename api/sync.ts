import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncState, getLatestSnapshot } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenant_id = req.method === 'GET' ? req.query.tenant_id : req.body.tenant_id;

  if (!tenant_id || typeof tenant_id !== 'string') {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    if (req.method === 'GET') {
      const snapshot = await getLatestSnapshot(tenant_id);
      return res.status(200).json({ payload: snapshot });
    }

    if (req.method === 'POST') {
      const { payload } = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'Missing payload' });
      }
      await syncState(tenant_id, payload);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Persistence error:', error);
    return res.status(500).json({ error: 'Failed to sync state' });
  }
}
