import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from '../chat';

function createRes() {
  const res: any = {
    statusCode: 0,
    jsonBody: undefined,
    headers: {} as Record<string, any>,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.jsonBody = body;
    }),
    setHeader: vi.fn((name: string, value: unknown) => {
      res.headers[name] = value;
    }),
  };
  return res;
}

describe('api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.SYNC_SECRET;
  });

  it('returns 405 for non-POST', async () => {
    const req: any = { method: 'GET', query: {}, body: undefined, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });

  it('returns local mode when OPENAI_API_KEY is missing', async () => {
    const req: any = { method: 'POST', query: {}, body: { messages: [{ role: 'user', content: 'hi' }], context: 'ctx' }, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({
      ok: true,
      mode: 'local',
      reply: null,
      message: 'Set OPENAI_API_KEY on the server to enable enhanced AI replies.',
    });
  });

  it('returns 401 when SYNC_SECRET exists and request is unauthorized', async () => {
    process.env.OPENAI_API_KEY = 'openai_key';
    process.env.SYNC_SECRET = 'sync_secret';
    const req: any = {
      method: 'POST',
      query: {},
      body: { messages: [{ role: 'user', content: 'hi' }], context: 'ctx' },
      headers: { authorization: 'Bearer wrong' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 502 when OpenAI request fails', async () => {
    process.env.OPENAI_API_KEY = 'openai_key';
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('detail', { status: 500 }));
    (globalThis as any).fetch = fetchMock;

    const req: any = {
      method: 'POST',
      query: {},
      body: { messages: [{ role: 'user', content: 'hi' }], context: 'ctx' },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.jsonBody).toEqual({ ok: false, error: 'OpenAI request failed' });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('returns 200 openai mode with reply and uses default model when OPENAI_MODEL is unset', async () => {
    process.env.OPENAI_API_KEY = 'openai_key';
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'final reply' } }] }), { status: 200 }),
    );
    (globalThis as any).fetch = fetchMock;

    const req: any = {
      method: 'POST',
      query: {},
      body: { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: null }], context: 'ctx' },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true, mode: 'openai', reply: 'final reply' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    expect(init?.headers?.Authorization).toBe('Bearer openai_key');

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    // assistant content should become empty string
    const assistantMsg = body.messages.find((m: any) => m.role === 'assistant');
    expect(assistantMsg.content).toBe('');
  });

  it('handles invalid messages/context types and returns empty reply when OpenAI message content is missing', async () => {
    process.env.OPENAI_API_KEY = 'openai_key';
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{}] }), { status: 200 }),
    );
    (globalThis as any).fetch = fetchMock;

    const req: any = {
      method: 'POST',
      query: {},
      body: { messages: 'not-an-array', context: 123 },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true, mode: 'openai', reply: '' });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    // messages should fall back to [] => only system prompt is sent
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('system');
  });
});

