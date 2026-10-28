import { createSession, passwordMatches, sessionCookie } from '../server/session.ts';

const redirect = (location: string, cookie?: string) =>
  new Response(null, { status: 303, headers: { Location: location, ...(cookie && { 'Set-Cookie': cookie }) } });

export async function POST(request: Request) {
  const password = process.env.INTARU_PASSWORD;
  if (!password) return new Response('INTARU_PASSWORD belum diatur.', { status: 503 });
  const attempt = (await request.formData()).get('password');
  if (typeof attempt === 'string' && passwordMatches(attempt, password)) return redirect('/', sessionCookie(createSession(password)));
  // Slow down guessing; a memorable password is short.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return redirect('/login.html?gagal=1');
}
