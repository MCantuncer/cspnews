/**
 * The two cookies.
 *
 * - The sign-in cookie holds the session token. It is HttpOnly and host-only (`__Host-`), so only
 *   this API ever sees it.
 * - The hint cookie only says "signed in" and holds no secret. The site reads it to decide whether
 *   to call the API at all, so readers who never signed in cause no API calls.
 */
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { Env } from './env.js';

const SESSION_COOKIE = 'cspn_session';
export const HINT_COOKIE = 'cspn_signed_in';

export function readSessionCookie<E extends { Bindings: Env }>(c: Context<E>): string | undefined {
  return getCookie(c, SESSION_COOKIE, 'host');
}

export function setSignInCookies<E extends { Bindings: Env }>(
  c: Context<E>,
  token: string,
  expiresAt: Date,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    prefix: 'host',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    expires: expiresAt,
  });
  setCookie(c, HINT_COOKIE, '1', {
    path: '/',
    secure: true,
    sameSite: 'Lax',
    expires: expiresAt,
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}

export function clearSignInCookies<E extends { Bindings: Env }>(c: Context<E>): void {
  deleteCookie(c, SESSION_COOKIE, { prefix: 'host', path: '/', secure: true });
  deleteCookie(c, HINT_COOKIE, {
    path: '/',
    secure: true,
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}
