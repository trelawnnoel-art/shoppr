import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE_NAME = 'shoppr_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set — add it to .env (see lib/session.ts)');
  }
  return secret;
}

/** userId + an HMAC signature, so the cookie is tamper-evident without
 * needing a server-side session table — fine for this demo's scope; a real
 * deployment would likely want revocable sessions instead. */
export function signSession(userId: string): string {
  const signature = createHmac('sha256', getSecret()).update(userId).digest('hex');
  return `${userId}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [userId, signature] = token.split('.');
  if (!userId || !signature) return null;

  const expected = createHmac('sha256', getSecret()).update(userId).digest('hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  return userId;
}
