import { sessionCookie } from '../server/session.ts';

export function POST() {
  return new Response(null, { status: 303, headers: { Location: '/login.html', 'Set-Cookie': sessionCookie('', 0) } });
}
