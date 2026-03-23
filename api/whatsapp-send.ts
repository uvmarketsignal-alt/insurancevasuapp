import type { VercelRequest, VercelResponse } from './lib/vercel-types';
import { assertSyncAuth } from './lib/auth';

/** Send a WhatsApp text via Meta Cloud API (server-side). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SYNC_SECRET || !assertSyncAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const access = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !access) {
    return res.status(503).json({
      error: 'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set',
    });
  }

  const body = req.body as { to?: string; message?: string };
  const to = typeof body.to === 'string' ? body.to.replace(/\D/g, '') : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!to || to.length < 10 || !message) {
    return res.status(400).json({ error: 'to (E.164 digits) and message required' });
  }

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message.slice(0, 4096) },
    }),
  });

  const j = (await r.json()) as { messages?: unknown; error?: { message?: string } };
  if (!r.ok) {
    console.error('whatsapp send', r.status, j);
    return res.status(502).json({ ok: false, error: j.error?.message || 'Send failed' });
  }

  return res.status(200).json({ ok: true, data: j });
}
