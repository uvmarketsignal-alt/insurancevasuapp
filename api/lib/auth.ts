import type { VercelRequest } from './vercel-types';

export function assertSyncAuth(req: VercelRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === secret;
}
