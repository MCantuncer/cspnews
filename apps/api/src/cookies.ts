/**
 * The cookies.
 *
 * - The sign-in cookie holds the session token. It is HttpOnly and host-only (`__Host-`), so only
 *   this API ever sees it.
 * - The hint cookie only says "signed in" and holds no secret. The site reads it to decide whether
 *   to call the API at all, so readers who never signed in cause no API calls.
 * - The pending sign-in cookie lives for ten minutes while the reader is at Google. It holds the
 *   state, PKCE verifier and nonce for that one attempt, and only this API sees it.
 * - The passkey ceremony cookie lives for five minutes and names one open WebAuthn challenge.
 */
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { Env } from './env.js';
import { PendingSignInSchema } from './google.js';
import type { PendingSignIn } from './google.js';

const SESSION_COOKIE = 'cspn_session';
export const HINT_COOKIE = 'cspn_signed_in';
const PENDING_COOKIE = 'cspn_pending';
const PENDING_SECONDS = 600;

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

export function setPendingSignIn<E extends { Bindings: Env }>(
  c: Context<E>,
  pending: PendingSignIn,
): void {
  // Hono encodes cookie values, so JSON is safe here.
  setCookie(c, PENDING_COOKIE, JSON.stringify(pending), {
    prefix: 'host',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax', // sent when Google sends the reader back with a top-level GET
    maxAge: PENDING_SECONDS,
  });
}

/** The pending sign-in, removed as it is read: each attempt can be finished once. */
export function takePendingSignIn<E extends { Bindings: Env }>(
  c: Context<E>,
): PendingSignIn | undefined {
  const raw = getCookie(c, PENDING_COOKIE, 'host');
  deleteCookie(c, PENDING_COOKIE, { prefix: 'host', path: '/', secure: true });
  if (!raw) return undefined;
  try {
    const parsed = PendingSignInSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

const CEREMONY_COOKIE = 'cspn_passkey';

/** The open passkey challenge's key; the challenge itself is checked and used up in the database. */
export function setCeremonyCookie<E extends { Bindings: Env }>(
  c: Context<E>,
  challenge: string,
  maxAge: number,
): void {
  setCookie(c, CEREMONY_COOKIE, challenge, {
    prefix: 'host',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Strict', // only our own pages start and finish a ceremony
    maxAge,
  });
}

/** The open challenge, if any. The cookie is removed as it is read. */
export function takeCeremonyCookie<E extends { Bindings: Env }>(c: Context<E>): string | undefined {
  const challenge = getCookie(c, CEREMONY_COOKIE, 'host');
  deleteCookie(c, CEREMONY_COOKIE, { prefix: 'host', path: '/', secure: true });
  return challenge;
}
