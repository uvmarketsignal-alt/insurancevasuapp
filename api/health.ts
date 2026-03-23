import type { VercelRequest, VercelResponse } from './lib/vercel-types';
import { getSql } from './lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const sql = getSql();
  if (!sql) {
    return res.status(200).json({ ok: true, db: false, message: 'DATABASE_URL not configured' });
  }
  try {
    await sql`SELECT 1`;
    return res.status(200).json({ ok: true, db: true });
  } catch (e) {
    console.error('health db error', e);
    return res.status(200).json({ ok: true, db: false });
  }
}
