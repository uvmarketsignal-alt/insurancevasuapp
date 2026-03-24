const SYNC_HEADER = 'Authorization';

function apiOrigin(): string {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (base) return base.replace(/\/$/, '');
  return '';
}

export function isServerSyncEnabled(): boolean {
  const secret = import.meta.env.VITE_SYNC_SECRET as string | undefined;
  return Boolean(secret && String(secret).length > 0);
}

function authHeaders(): HeadersInit {
  const secret = import.meta.env.VITE_SYNC_SECRET as string | undefined;
  if (!secret) return {};
  return { [SYNC_HEADER]: `Bearer ${secret}` };
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export type ServerSnapshot = {
  appSettings?: unknown;
  customers?: unknown;
  policies?: unknown;
  documents?: unknown;
  claims?: unknown;
  leads?: unknown;
  notifications?: unknown;
  knowledgeArticles?: unknown;
  commissions?: unknown;
  renewals?: unknown;
  auditLogs?: unknown;
  familyMembers?: unknown;
  endorsements?: unknown;
  complianceReports?: unknown;
  employees?: unknown;
};

export async function fetchSnapshot(tenantId: string): Promise<ServerSnapshot | null> {
  if (!isServerSyncEnabled()) return null;
  const q = new URLSearchParams({ tenant_id: tenantId });
  const url = `${apiOrigin()}/api/sync?${q.toString()}`;
  try {
    const res = await fetch(url, { headers: { ...authHeaders() } });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await parseJson(res)) as { payload?: ServerSnapshot } | null;
    return body?.payload ?? null;
  } catch (e) {
    console.warn('fetchSnapshot failed', e);
    return null;
  }
}

export async function pushSnapshot(tenantId: string, payload: ServerSnapshot): Promise<boolean> {
  if (!isServerSyncEnabled()) return false;
  const url = `${apiOrigin()}/api/sync`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ tenant_id: tenantId, payload }),
    });
    return res.ok;
  } catch (e) {
    console.warn('pushSnapshot failed', e);
    return false;
  }
}

// Debounced snapshot pusher — batches rapid mutations into one DB write per 1.5s
const _pendingPush: Record<string, ReturnType<typeof setTimeout>> = {};
export function debouncedPushSnapshot(tenantId: string, payload: ServerSnapshot, delayMs = 1500): void {
  if (!isServerSyncEnabled() || !tenantId) return;
  if (_pendingPush[tenantId]) clearTimeout(_pendingPush[tenantId]);
  _pendingPush[tenantId] = setTimeout(() => {
    delete _pendingPush[tenantId];
    pushSnapshot(tenantId, payload).catch((e) => console.warn('debouncedPushSnapshot failed', e));
  }, delayMs);
}

export async function uploadDocumentFile(file: File): Promise<string | null> {
  if (!isServerSyncEnabled()) return null;
  const url = `${apiOrigin()}/api/upload`;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        resolve(null);
        return;
      }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            data: base64,
          }),
        });
        const j = (await parseJson(res)) as { url?: string } | null;
        resolve(res.ok && j?.url ? j.url : null);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatarFile(file: File): Promise<string | null> {
  if (!isServerSyncEnabled()) return null;
  const url = `${apiOrigin()}/api/upload-avatar`;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (!base64) { resolve(null); return; }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'image/jpeg',
            data: base64,
          }),
        });
        const j = (await parseJson(res)) as { url?: string } | null;
        resolve(res.ok && j?.url ? j.url : null);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function reviveValue<T>(input: unknown): T {
  if (input === null || input === undefined) return input as T;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
    return new Date(input) as T;
  }
  if (Array.isArray(input)) {
    return input.map((x) => reviveValue(x)) as T;
  }
  if (typeof input === 'object') {
    const o = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = reviveValue(v);
    }
    return out as T;
  }
  return input as T;
}

export async function checkApiHealth(): Promise<{ ok: boolean; db: boolean }> {
  const url = `${apiOrigin()}/api/health`;
  try {
    const res = await fetch(url);
    const j = (await parseJson(res)) as { ok?: boolean; db?: boolean } | null;
    return { ok: Boolean(j?.ok), db: Boolean(j?.db) };
  } catch {
    return { ok: false, db: false };
  }
}

export async function postChat(body: {
  messages: Array<{ role: string; content: string }>;
  context: string;
}): Promise<{ ok: boolean; mode?: string; reply?: string | null; error?: string }> {
  const url = `${apiOrigin()}/api/chat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    const j = (await parseJson(res)) as {
      ok?: boolean;
      mode?: string;
      reply?: string | null;
      error?: string;
    } | null;
    if (!res.ok) return { ok: false, error: j?.error || `HTTP ${res.status}` };
    return { ok: Boolean(j?.ok), mode: j?.mode, reply: j?.reply ?? null };
  } catch (e) {
    console.warn('postChat failed', e);
    return { ok: false, error: 'Network error' };
  }
}

export async function postWhatsAppSend(body: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isServerSyncEnabled()) return { ok: false, error: 'Sync is not enabled' };
  const url = `${apiOrigin()}/api/whatsapp-send`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ to: body.to, message: body.message }),
    });
    const j = (await parseJson(res)) as { ok?: boolean; error?: string } | null;
    if (!res.ok) return { ok: false, error: j?.error || `HTTP ${res.status}` };
    return { ok: Boolean(j?.ok) };
  } catch (e) {
    console.warn('postWhatsAppSend failed', e);
    return { ok: false, error: 'Network error' };
  }
}
