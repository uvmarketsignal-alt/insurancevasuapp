import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ApiModule = typeof import('../api');

function setEnv(next: { VITE_API_URL?: string | undefined; VITE_SYNC_SECRET?: string | undefined }) {
  if (next.VITE_API_URL === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = next.VITE_API_URL;
  if (next.VITE_SYNC_SECRET === undefined) delete process.env.VITE_SYNC_SECRET;
  else process.env.VITE_SYNC_SECRET = next.VITE_SYNC_SECRET;
}

async function loadApiModule(): Promise<ApiModule> {
  vi.resetModules();
  const mod = await import('../api');
  return mod as ApiModule;
}

describe('client api.ts', () => {
  const originalFetch = globalThis.fetch;
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  function mockFileReaderWithResult(result: string, opts?: { onerror?: boolean }) {
    class FakeFileReader {
      public result: string | null = null;
      public onload: ((ev: unknown) => void) | null = null;
      public onerror: ((ev: unknown) => void) | null = null;
      readAsDataURL(_file: File) {
        this.result = result;
        if (opts?.onerror) {
          this.onerror?.(new Error('read failed'));
          return;
        }
        this.onload?.({});
      }
    }
    globalThis.FileReader = FakeFileReader as unknown as typeof FileReader;
  }

  it('isServerSyncEnabled should be false when VITE_SYNC_SECRET is missing', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    expect(api.isServerSyncEnabled()).toBe(false);
  });

  it('fetchSnapshot should return null when sync disabled and not call fetch', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const res = await api.fetchSnapshot('tenant_1');
    expect(res).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetchSnapshot should handle 404, bad JSON, and payload success', async () => {
    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      new Response('', { status: 404 }),
    );
    await expect(api.fetchSnapshot('t1')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      new Response('not json', { status: 200 }),
    );
    await expect(api.fetchSnapshot('t1')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ payload: { a: 1 } }), { status: 200 }),
    );
    await expect(api.fetchSnapshot('t1')).resolves.toEqual({ a: 1 });

    // Authorization header should be present when sync enabled
    const call0 = fetchMock.mock.calls[2][1];
    expect(call0.headers).toEqual({ Authorization: 'Bearer sync_secret' });
  });

  it('fetchSnapshot should return null when fetch throws (catch branch)', async () => {
    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(api.fetchSnapshot('t1')).resolves.toBeNull();
  });

  it('fetchSnapshot should use relative URL when VITE_API_URL is missing', async () => {
    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: undefined });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    await api.fetchSnapshot('t1');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/sync?tenant_id=t1');
  });

  it('pushSnapshot should return false when sync disabled and true/false on fetch outcomes', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    expect(await api.pushSnapshot('t1', { x: 1 } as any)).toBe(false);

    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api2 = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect(await api2.pushSnapshot('t1', { x: 1 } as any)).toBe(false);

    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    expect(await api2.pushSnapshot('t1', { x: 1 } as any)).toBe(true);

    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await api2.pushSnapshot('t1', { x: 1 } as any)).toBe(false);
  });

  it('reviveValue should revive dates, arrays, and objects recursively', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: undefined });
    const api = await loadApiModule();

    const d = api.reviveValue<Date>('2024-01-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);

    const out = api.reviveValue<{ arr: Array<Date> | null }>({
      arr: ['2024-02-01T00:00:00Z', '2024-03-01T00:00:00Z'],
    });
    expect(Array.isArray(out.arr)).toBe(true);
    expect(out.arr?.[0]).toBeInstanceOf(Date);

    const passThrough = api.reviveValue(123);
    expect(passThrough).toBe(123);

    expect(api.reviveValue(null)).toBeNull();
    expect(api.reviveValue(undefined)).toBeUndefined();
  });

  it('uploadDocumentFile should handle missing base64, FileReader errors, and successful upload', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    expect(await api.uploadDocumentFile(new File(['x'], 'a.txt'))).toBeNull();

    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api2 = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    // missing comma/base64 => returns null and should not call fetch
    mockFileReaderWithResult('data:application/octet-stream,');
    const f1 = await api2.uploadDocumentFile(new File(['x'], 'a.txt'));
    expect(f1).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    // FileReader error => resolve null
    mockFileReaderWithResult('data:application/octet-stream;base64,QUJD', { onerror: true });
    await expect(api2.uploadDocumentFile(new File(['x'], 'a.txt'))).resolves.toBeNull();

    // successful upload
    mockFileReaderWithResult('data:application/octet-stream;base64,QUJD');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: 'https://blob.example/doc.png' }), { status: 200 }),
    );
    const url = await api2.uploadDocumentFile(new File(['x'], 'a.txt', { type: 'text/plain' }));
    expect(url).toBe('https://blob.example/doc.png');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('uploadDocumentFile should return null when the upload fetch throws', async () => {
    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFileReaderWithResult('data:application/octet-stream;base64,QUJD');
    fetchMock.mockRejectedValueOnce(new Error('upload failed'));

    await expect(api.uploadDocumentFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).resolves.toBeNull();
  });

  it('checkApiHealth should handle ok/db flags and network errors', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();

    (globalThis.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, db: false }), { status: 200 }),
    );
    await expect(api.checkApiHealth()).resolves.toEqual({ ok: true, db: false });

    (globalThis.fetch as any).mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(api.checkApiHealth()).resolves.toEqual({ ok: false, db: false });

    (globalThis.fetch as any).mockRejectedValueOnce(new Error('network'));
    await expect(api.checkApiHealth()).resolves.toEqual({ ok: false, db: false });
  });

  it('postChat should return error for non-ok responses and network errors', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad input' }), { status: 400 }),
    );
    expect(
      await api.postChat({ messages: [{ role: 'user', content: 'hi' }], context: 'ctx' }),
    ).toEqual({ ok: false, error: 'bad input' });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    expect(
      await api.postChat({ messages: [{ role: 'user', content: 'hi' }], context: 'ctx' }),
    ).toEqual({ ok: false, error: 'HTTP 500' });

    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(
      await api.postChat({ messages: [{ role: 'user', content: 'hi' }], context: 'ctx' }),
    ).toEqual({ ok: false, error: 'Network error' });
  });

  it('postChat should include Authorization header when sync enabled and return reply on success', async () => {
    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, mode: 'openai', reply: 'hello' }), { status: 200 }),
    );
    const out = await api.postChat({
      messages: [{ role: 'user', content: 'hi' }],
      context: 'ctx',
    });
    expect(out).toEqual({ ok: true, mode: 'openai', reply: 'hello' });

    const args = fetchMock.mock.calls[0][1];
    expect(args.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer sync_secret' });
  });

  it('postWhatsAppSend should error when sync disabled and return ok/error on outcomes', async () => {
    setEnv({ VITE_SYNC_SECRET: undefined, VITE_API_URL: 'https://example.com' });
    const api = await loadApiModule();
    expect(await api.postWhatsAppSend({ to: '123', message: 'hi' })).toEqual({
      ok: false,
      error: 'Sync is not enabled',
    });

    setEnv({ VITE_SYNC_SECRET: 'sync_secret', VITE_API_URL: 'https://example.com' });
    const api2 = await loadApiModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'nope' }), { status: 400 }));
    expect(await api2.postWhatsAppSend({ to: '123', message: 'hi' })).toEqual({ ok: false, error: 'nope' });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    expect(await api2.postWhatsAppSend({ to: '123', message: 'hi' })).toEqual({ ok: false, error: 'HTTP 500' });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await api2.postWhatsAppSend({ to: '123', message: 'hi' })).toEqual({ ok: true });

    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await api2.postWhatsAppSend({ to: '123', message: 'hi' })).toEqual({
      ok: false,
      error: 'Network error',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.FileReader = originalFileReader;
  });
});

