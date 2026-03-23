import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from '../whatsapp-send';

function createRes(withEnd = false) {
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
  if (withEnd) res.end = vi.fn();
  return res;
}

describe('api/whatsapp-send', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.SYNC_SECRET;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  it('returns 405 for non-POST', async () => {
    const req: any = { method: 'GET', headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });

  it('returns 401 when SYNC_SECRET is missing/unauthorized', async () => {
    process.env.SYNC_SECRET = undefined as any;
    const req: any = { method: 'POST', headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 503 when WhatsApp credentials are missing', async () => {
    process.env.SYNC_SECRET = 'secret';
    const req: any = { method: 'POST', headers: { authorization: 'Bearer secret' }, body: { to: '+919876543210', message: 'Hi' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual({ error: 'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set' });
  });

  it('returns 400 when to/message are invalid', async () => {
    process.env.SYNC_SECRET = 'secret';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';

    const req: any = { method: 'POST', headers: { authorization: 'Bearer secret' }, body: { to: '+91 12', message: '   ' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'to (E.164 digits) and message required' });
  });

  it('returns 400 when to/message are non-strings', async () => {
    process.env.SYNC_SECRET = 'secret';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';

    const req: any = { method: 'POST', headers: { authorization: 'Bearer secret' }, body: { to: 12345, message: null } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'to (E.164 digits) and message required' });
  });

  it('returns 502 when Meta Graph API responds non-ok', async () => {
    process.env.SYNC_SECRET = 'secret';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'bad request' } }), { status: 400 }),
    );
    globalThis.fetch = fetchMock as any;

    const longMsg = 'x'.repeat(10);
    const req: any = {
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
      body: { to: '+91 9876543210', message: longMsg },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.jsonBody).toEqual({ ok: false, error: 'bad request' });
  });

  it('returns 502 with fallback "Send failed" when Meta Graph API error has no message', async () => {
    process.env.SYNC_SECRET = 'secret';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: {} }), { status: 400 }),
    );
    (globalThis as any).fetch = fetchMock;

    const req: any = {
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
      body: { to: '+91 9876543210', message: 'hello' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.jsonBody).toEqual({ ok: false, error: 'Send failed' });
  });

  it('returns 200 ok and truncates message to 4096 chars on success', async () => {
    process.env.SYNC_SECRET = 'secret';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'PHONEID';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as any;

    const longMsg = 'y'.repeat(5000);
    const req: any = {
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
      body: { to: '+91 98765-43210', message: longMsg },
    };

    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('PHONEID/messages');
    expect(init?.headers?.Authorization).toBe('Bearer token');

    const sent = JSON.parse(init.body);
    expect(sent.to).toBe('919876543210');
    expect(sent.type).toBe('text');
    expect(sent.text.body.length).toBe(4096);
  });
});

