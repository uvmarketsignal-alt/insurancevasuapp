import { describe, expect, it, vi, beforeEach } from 'vitest';

const sqlHolder: { current: any } = { current: vi.fn() };

vi.mock('@neondatabase/serverless', () => {
  return {
    neon: () => {
      // `api/lib/db.ts` caches the returned tag function, so we return a stable wrapper
      // that delegates to the current mock for each call.
      return (...args: any[]) => sqlHolder.current(...args);
    },
  };
});

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

describe('api/sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.SYNC_SECRET;
    sqlHolder.current = vi.fn();
  });

  it('returns 503 when database is not configured', async () => {
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: {}, body: undefined, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual({ error: 'Database not configured' });
  });

  it('returns 503 when SYNC_SECRET is missing', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: { tenant_id: 't1' }, body: undefined, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual({ error: 'SYNC_SECRET not configured on server' });
  });

  it('returns 400 when tenant_id is missing for GET', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: {}, body: undefined, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'tenant_id required' });
  });

  it('returns 401 when GET is unauthorized', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: { tenant_id: 't1' }, body: undefined, headers: { authorization: 'Bearer wrong' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when there is no snapshot for GET tenant', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    sqlHolder.current = vi.fn().mockResolvedValueOnce([]);
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: { tenant_id: 't1' }, body: undefined, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.jsonBody).toEqual({ error: 'No snapshot' });
  });

  it('returns 500 when the database errors during GET', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    sqlHolder.current = vi.fn().mockRejectedValueOnce(new Error('db error'));
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: { tenant_id: 't1' }, body: undefined, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody).toEqual({ error: 'Database error' });
  });

  it('returns 200 payload on successful GET', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    sqlHolder.current = vi.fn().mockResolvedValueOnce([{ payload: { ok: true }, updated_at: '2024-01-01T00:00:00Z' }]);
    const handler = (await import('../sync')).default;
    const req: any = { method: 'GET', query: { tenant_id: 't1' }, body: undefined, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ payload: { ok: true }, updated_at: '2024-01-01T00:00:00Z' });
  });

  it('returns 401 when POST is unauthorized', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'POST', query: {}, body: { tenant_id: 't1', payload: { x: 1 } }, headers: { authorization: 'Bearer wrong' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when POST payload is invalid', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'POST', query: {}, body: { tenant_id: '', payload: null }, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'tenant_id and payload required' });
  });

  it('returns 400 when POST payload type is not an object', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = {
      method: 'POST',
      query: {},
      body: { tenant_id: 't1', payload: 'not-an-object' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'tenant_id and payload required' });
  });

  it('returns 500 when database errors during POST and returns 200 ok on success', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;

    sqlHolder.current = vi.fn().mockRejectedValueOnce(new Error('insert failed'));
    const reqBad: any = { method: 'POST', query: {}, body: { tenant_id: 't1', payload: { x: 1 } }, headers: { authorization: 'Bearer sync' } };
    const resBad = createRes();
    await handler(reqBad, resBad);
    expect(resBad.statusCode).toBe(500);
    expect(resBad.jsonBody).toEqual({ error: 'Database error' });

    sqlHolder.current = vi.fn().mockResolvedValueOnce(undefined);
    const reqOk: any = { method: 'POST', query: {}, body: { tenant_id: 't1', payload: { x: 1 } }, headers: { authorization: 'Bearer sync' } };
    const resOk = createRes();
    await handler(reqOk, resOk);
    expect(resOk.statusCode).toBe(200);
    expect(resOk.jsonBody).toEqual({ ok: true });
  });

  it('returns 405 for other methods', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    process.env.SYNC_SECRET = 'sync';
    const handler = (await import('../sync')).default;
    const req: any = { method: 'PATCH', query: {}, body: undefined, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });
});

