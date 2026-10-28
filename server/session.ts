import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// A signed, expiring cookie proves the visitor entered INTARU_PASSWORD. The password
// is the signing key, so changing it signs every existing session out.
export const SESSION_COOKIE = 'intaru_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

const sign = (password: string, expires: number) =>
  createHmac('sha256', password).update(`intaru-session:${expires}`).digest('base64url');

// Hashing first gives equal-length buffers, so the comparison does not leak length.
function equal(a: string, b: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export const passwordMatches = (attempt: string, password: string) => equal(attempt, password);

export function createSession(password: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_MAX_AGE;
  return `${expires}.${sign(password, expires)}`;
}

export function sessionValid(token: string | undefined, password: string, now = Date.now()) {
  const [expires, signature, ...rest] = token?.split('.') ?? [];
  const seconds = Number(expires);
  return rest.length === 0 && signature !== undefined && Number.isInteger(seconds) && seconds > now / 1000
    && equal(signature, sign(password, seconds));
}

export function readCookie(header: string | null, name: string) {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

export const sessionCookie = (token: string, maxAge = SESSION_MAX_AGE) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
