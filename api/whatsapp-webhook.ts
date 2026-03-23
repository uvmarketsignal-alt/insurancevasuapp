import type { VercelRequest, VercelResponse } from './lib/vercel-types';

/**
 * Meta WhatsApp Cloud API webhook: GET verification + POST inbound events.
 * Set WHATSAPP_VERIFY_TOKEN in Vercel to match Meta dashboard.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verify = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && verify && token === verify && typeof challenge === 'string') {
      res.status(200);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (typeof res.end === 'function') {
        res.end(challenge);
        return;
      }
      return res.status(200).json({ error: 'Response end() not available' });
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as { entry?: unknown };
  if (body?.entry) {
    console.info('whatsapp webhook event received', JSON.stringify(body).slice(0, 2000));
  }

  return res.status(200).json({ ok: true });
}
