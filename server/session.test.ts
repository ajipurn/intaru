import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, passwordMatches, readCookie, SESSION_MAX_AGE, sessionCookie, sessionValid } from './session.ts';

const now = Date.UTC(2026, 9, 28);

test('only the exact password matches', () => {
  assert.equal(passwordMatches('kebumen', 'kebumen'), true);
  assert.equal(passwordMatches('Kebumen', 'kebumen'), false);
  assert.equal(passwordMatches('kebumen ', 'kebumen'), false);
  assert.equal(passwordMatches('', 'kebumen'), false);
});

test('a session is valid until it expires', () => {
  const token = createSession('kebumen', now);
  assert.equal(sessionValid(token, 'kebumen', now), true);
  assert.equal(sessionValid(token, 'kebumen', now + (SESSION_MAX_AGE - 1) * 1000), true);
  assert.equal(sessionValid(token, 'kebumen', now + SESSION_MAX_AGE * 1000), false);
});

test('changing the password signs existing sessions out', () => {
  assert.equal(sessionValid(createSession('kebumen', now), 'karanganyar', now), false);
});

test('tampered or malformed sessions are rejected', () => {
  const [expires, signature] = createSession('kebumen', now).split('.');
  assert.equal(sessionValid(`${Number(expires) + 86400}.${signature}`, 'kebumen', now), false);
  assert.equal(sessionValid(`${expires}.${signature}x`, 'kebumen', now), false);
  assert.equal(sessionValid(`${expires}.${signature}.extra`, 'kebumen', now), false);
  for (const token of [undefined, '', 'abc', `${expires}`, `x.${signature}`]) assert.equal(sessionValid(token, 'kebumen', now), false);
});

test('cookies are read by exact name', () => {
  assert.equal(readCookie('a=1; intaru_session=2.x=y; b=3', 'intaru_session'), '2.x=y');
  assert.equal(readCookie('xintaru_session=1', 'intaru_session'), undefined);
  assert.equal(readCookie(null, 'intaru_session'), undefined);
});

test('the session cookie is HttpOnly, Secure and site-wide', () => {
  assert.equal(sessionCookie('t'), `intaru_session=t; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`);
  assert.match(sessionCookie('', 0), /Max-Age=0$/);
});
