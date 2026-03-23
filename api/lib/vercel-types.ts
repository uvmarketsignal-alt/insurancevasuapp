import type { IncomingHttpHeaders } from 'node:http';

/** Minimal request/response shapes for Vercel Node serverless (no @vercel/node). */
export interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: IncomingHttpHeaders;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => void;
  /** Plain-text body (Meta WhatsApp webhook verification). */
  end?: (chunk?: string) => void;
}
