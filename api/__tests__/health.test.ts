import { describe, expect, it, vi, beforeEach } from 'vitest';

const sqlHolder: { current: any } = { current: vi.fn() };

vi.mock('@neondatabase/serverless', () => {
  return {
    neon: () => {
      // Ensure returned tag delegates to latest mock.
      return (...args: any[]) => sqlHolder.current(...args);
    },
  };
});

function createRes() {
  const res: any = {
    statusCode: 0,
    jsonBody: undefined,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.jsonBody = body;
    }),
  };
  return res;
}

describe('api/health', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    sqlHolder.current = vi.fn();
  });

  it('returns db:false when DATABASE_URL is not configured', async () => {
    const handler = (await import('../health')).default;
    const req: any = { method: 'GET', query: {}, headers: {}, body: undefined };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true, db: false, message: 'DATABASE_URL not configured' });
  });

  it('returns db:true when the DB query succeeds', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    sqlHolder.current = vi.fn().mockResolvedValueOnce([]);

    const handler = (await import('../health')).default;
    const req: any = { method: 'GET', query: {}, headers: {}, body: undefined };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true, db: true });
  });

  it('returns db:false when the DB query throws', async () => {
    process.env.DATABASE_URL = 'postgres://example';
    sqlHolder.current = vi.fn().mockRejectedValueOnce(new Error('db down'));

    const handler = (await import('../health')).default;
    const req: any = { method: 'GET', query: {}, headers: {}, body: undefined };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true, db: false });
  });
});

