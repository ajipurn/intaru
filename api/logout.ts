import { sessionCookie } from '../server/session.js';

export function POST() {
  return new Response(null, { status: 303, headers: { Location: '/login.html', 'Set-Cookie': sessionCookie('', 0) } });
}
