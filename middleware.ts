import { next } from '@vercel/functions';
import { readCookie, SESSION_COOKIE, sessionValid } from './server/session.ts';

// Every page and asset needs a session, except the login page, its form handler and the icon.
export const config = { matcher: '/((?!login|api/login|favicon\\.svg).*)' };

export default function middleware(request: Request) {
  const password = process.env.INTARU_PASSWORD;
  // Fail closed: a deployment without a password shows nothing.
  if (!password) return new Response('INTARU_PASSWORD belum diatur.', { status: 503 });
  if (sessionValid(readCookie(request.headers.get('cookie'), SESSION_COOKIE), password)) return next();
  return Response.redirect(new URL('/login.html', request.url), 302);
}
