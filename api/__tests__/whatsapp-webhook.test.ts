import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from '../whatsapp-webhook';

function createRes({ withEnd = false }: { withEnd?: boolean } = {}) {
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

describe('api/whatsapp-webhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_VERIFY_TOKEN;
  });

  it('verifies webhook on GET and returns challenge via res.end when available', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify_me';
    const req: any = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify_me',
        'hub.challenge': 'CHALLENGE_123',
      },
      headers: {},
    };
    const res = createRes({ withEnd: true });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8');
    expect(res.end).toHaveBeenCalledWith('CHALLENGE_123');
    expect(res.jsonBody).toBeUndefined();
  });

  it('returns 200 json error when verification succeeds but res.end is missing', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify_me';
    const req: any = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify_me',
        'hub.challenge': 'CHALLENGE_123',
      },
      headers: {},
    };
    const res = createRes({ withEnd: false });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ error: 'Response end() not available' });
  });

  it('returns 403 when verification fails', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify_me';
    const req: any = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong',
        'hub.challenge': 'CHALLENGE_123',
      },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual({ error: 'Verification failed' });
  });

  it('returns 405 for unsupported methods and sets Allow header', async () => {
    const req: any = { method: 'PUT', query: {}, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });

  it('acknowledges POST webhook events and logs when entry exists', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const req: any = {
      method: 'POST',
      query: {},
      body: { entry: [{ id: 'e1' }] },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true });
    expect(infoSpy).toHaveBeenCalled();
  });

  it('acknowledges POST webhook events without entry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const req: any = { method: 'POST', query: {}, body: {}, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true });
    expect(infoSpy).not.toHaveBeenCalled();
  });
});

