import type { VercelRequest, VercelResponse } from './lib/vercel-types';
import { assertSyncAuth } from './lib/auth';

type Msg = { role: string; content: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(200).json({
      ok: true,
      mode: 'local',
      reply: null,
      message: 'Set OPENAI_API_KEY on the server to enable enhanced AI replies.',
    });
  }

  if (process.env.SYNC_SECRET && !assertSyncAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as { messages?: Msg[]; context?: string };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === 'string' ? body.context : '';

  const system = `You are a concise policy assistant for an Indian insurance agency (IRDAI-regulated). Answer using ONLY the knowledge context below when it applies. If the context does not cover the question, say so briefly and suggest checking policy wording or the insurer. Do not invent statutes or circular numbers. Keep answers structured and under ~400 words.\n\n--- CONTEXT ---\n${context.slice(0, 12000)}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages.slice(-20).map((m) => ({ role: m.role, content: String(m.content ?? '') })),
      ],
      temperature: 0.25,
      max_tokens: 900,
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    console.error('openai chat error', openaiRes.status, detail.slice(0, 500));
    return res.status(502).json({ ok: false, error: 'OpenAI request failed' });
  }

  const data = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const reply = data.choices?.[0]?.message?.content ?? '';
  return res.status(200).json({ ok: true, mode: 'openai', reply });
}
