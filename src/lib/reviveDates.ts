/** Restore Date objects from JSON (ISO strings) after loading from server/localStorage. */
export function reviveDeep<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (Array.isArray(value)) return value.map(reviveDeep) as T;
  if (typeof value !== 'object') return value as T;
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      const d = new Date(v);
      out[k] = Number.isNaN(d.getTime()) ? v : d;
    } else {
      out[k] = reviveDeep(v);
    }
  }
  return out as T;
}
