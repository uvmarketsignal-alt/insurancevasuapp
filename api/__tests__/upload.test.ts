import { beforeEach, describe, expect, it, vi } from 'vitest';

const putMock = vi.fn();

vi.mock('@vercel/blob', () => {
  return {
    put: (...args: any[]) => putMock(...args),
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

describe('api/upload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    putMock.mockReset();
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.SYNC_SECRET;
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('../upload')).default;
    const req: any = { method: 'GET', query: {}, body: undefined, headers: {} };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });

  it('returns 503 when BLOB_READ_WRITE_TOKEN is missing', async () => {
    const handler = (await import('../upload')).default;
    process.env.SYNC_SECRET = 'sync';
    const req: any = {
      method: 'POST',
      query: {},
      body: { data: 'QUJD' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  });

  it('returns 401 when SYNC_SECRET is missing (unauthorized)', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    const req: any = {
      method: 'POST',
      query: {},
      body: { data: 'QUJD' },
      headers: {},
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when token is invalid', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';
    const req: any = {
      method: 'POST',
      query: {},
      body: { data: 'QUJD' },
      headers: { authorization: 'Bearer wrong' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when data (base64) is missing', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';
    const req: any = { method: 'POST', query: {}, body: { filename: 'a.txt' }, headers: { authorization: 'Bearer sync' } };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'data (base64) required' });
  });

  it('returns 400 when base64 is invalid (Buffer.from throws)', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';

    const fromSpy = vi.spyOn(Buffer, 'from').mockImplementationOnce(() => {
      throw new Error('bad base64');
    });

    const req: any = {
      method: 'POST',
      query: {},
      body: { data: 'not-base64', filename: 'a.txt' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);
    expect(fromSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Invalid base64' });
  });

  it('returns 413 when file size exceeds 4MB', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';

    const tooBig = Buffer.alloc(4 * 1024 * 1024 + 1);
    const base64 = tooBig.toString('base64');
    const req: any = {
      method: 'POST',
      query: {},
      body: { data: base64, filename: 'big.bin' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(413);
    expect(res.jsonBody).toEqual({ error: 'File too large (max 4MB)' });
  });

  it('uploads successfully with default filename when filename is missing', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    putMock.mockResolvedValueOnce({ url: 'https://blob.example/default.bin' });

    const req: any = {
      method: 'POST',
      query: {},
      body: { data: Buffer.from('hello').toString('base64') },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ url: 'https://blob.example/default.bin' });
    const [key] = putMock.mock.calls[0];
    expect(String(key)).toContain('upload.bin');

    vi.useRealTimers();
  });

  it('returns 500 when blob upload fails', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';

    putMock.mockRejectedValueOnce(new Error('upload failed'));
    const req: any = {
      method: 'POST',
      query: {},
      body: { data: Buffer.from('hello').toString('base64'), filename: 'a/b\\c.txt', contentType: 'text/plain' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody).toEqual({ error: 'Upload failed' });
  });

  it('uploads successfully and returns blob URL', async () => {
    const handler = (await import('../upload')).default;
    process.env.BLOB_READ_WRITE_TOKEN = 'blobtoken';
    process.env.SYNC_SECRET = 'sync';

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    putMock.mockResolvedValueOnce({ url: 'https://blob.example/docs/1.png' });

    const req: any = {
      method: 'POST',
      query: {},
      body: { data: Buffer.from('hello').toString('base64'), filename: 'a/b\\c.txt', contentType: 'text/plain' },
      headers: { authorization: 'Bearer sync' },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ url: 'https://blob.example/docs/1.png' });
    expect(putMock).toHaveBeenCalled();

    const [key] = putMock.mock.calls[0];
    const expectedSafeName = 'a/b\\c.txt'.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    expect(String(key)).toContain('docs/1704067200000-');
    expect(String(key)).toContain(expectedSafeName);

    vi.useRealTimers();
  });
});

