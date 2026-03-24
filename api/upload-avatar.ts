import type { VercelRequest, VercelResponse } from './lib/vercel-types';
import { put } from '@vercel/blob';
import { assertSyncAuth } from './lib/auth';

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }
  if (!process.env.SYNC_SECRET || !assertSyncAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const body = req.body as { filename?: string; contentType?: string; data?: string };
  const filename = body.filename || 'avatar.jpg';
  const requestedContentType = body.contentType || 'image/jpeg';
  if (!ALLOWED_CONTENT_TYPES.includes(requestedContentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }
  const contentType = requestedContentType;
  const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

  if (!BASE64_REGEX.test(data)) {
    return res.status(400).json({ error: 'Invalid base64' });
  }

  let buffer: Buffer;
  buffer = Buffer.from(data, 'base64');
  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64' });
  }
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ error: 'File too large (max 4 MB)' });
  }

  try {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    const blob = await put(`avatars/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType,
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('avatar upload error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
