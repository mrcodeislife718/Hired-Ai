import type { IncomingMessage, ServerResponse } from 'node:http';

export const SESSION_COOKIE = 'hired_session';

export const baseSecurityHeaders: Record<string, string> = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'microphone=(self), camera=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-frame-options': 'DENY'
};

export function parseCookies(header: string | undefined) {
  const result: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try { result[key] = decodeURIComponent(value); } catch { result[key] = value; }
  }
  return result;
}

export function sessionToken(req: IncomingMessage) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

function cookieSecurity() {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function sessionCookie(token: string, expiresAt: string) {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${cookieSecurity()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecurity()}`;
}

export function requestOriginAllowed(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const configured = process.env.APP_URL?.replace(/\/$/, '');
  if (configured && origin === configured) return true;
  const host = req.headers.host;
  if (!host) return false;
  return origin === `http://${host}` || origin === `https://${host}`;
}

export function enforceOrigin(req: IncomingMessage, res: ServerResponse) {
  if (requestOriginAllowed(req)) return true;
  res.writeHead(403, { 'content-type': 'application/json; charset=utf-8', ...baseSecurityHeaders });
  res.end(JSON.stringify({ error: 'cross-origin request rejected' }));
  return false;
}
