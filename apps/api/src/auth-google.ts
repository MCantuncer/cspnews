/**
 * Sign in with Google.
 *
 *   GET /auth/google?return=/path    sends the reader to Google
 *   GET /auth/google/callback        Google sends them back here
 *
 * The callback always ends on our site, at the page the reader started from:
 *   ?signin=welcome    a new account was made
 *   ?signin=linked     Google was added to the account they were signed in to
 *   ?signin=cancelled  they backed out at Google
 *   ?signin=in-use     this Google account already belongs to another CSPNews account
 *   ?signin=failed     anything else went wrong; nothing was changed
 */
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { App } from './app.js';
import {
  readSessionCookie,
  setPendingSignIn,
  setSignInCookies,
  takePendingSignIn,
} from './cookies.js';
import type { GoogleSignIn } from './google.js';
import { newPendingSignIn, safeReturnPath } from './google.js';
import {
  createAccountWithIdentity,
  createSession,
  findAccountByIdentity,
  findSession,
  linkIdentity,
} from './store.js';

type Outcome = 'welcome' | 'linked' | 'cancelled' | 'in-use' | 'failed';

export function googleRoutes(google: (c: Context<App>) => GoogleSignIn, clock: () => Date) {
  const routes = new Hono<App>();

  routes.get('/auth/google', async (c) => {
    const pending = newPendingSignIn(safeReturnPath(c.req.query('return')));
    setPendingSignIn(c, pending);
    return c.redirect(await google(c).authorizationUrl(pending, callbackUrl(c)), 302);
  });

  routes.get('/auth/google/callback', async (c) => {
    const pending = takePendingSignIn(c);
    const returnTo = pending?.returnTo ?? '/';
    const back = (outcome?: Outcome) => c.redirect(siteUrl(c, returnTo, outcome), 302);

    if (c.req.query('error')) return back('cancelled');
    const code = c.req.query('code');
    if (!pending || !code || c.req.query('state') !== pending.state) return back('failed');

    let subject: string;
    try {
      subject = await google(c).verify(code, pending, callbackUrl(c));
    } catch (error) {
      console.warn('Google sign-in failed:', error instanceof Error ? error.message : error);
      return back('failed');
    }

    const now = clock();
    const db = c.env.DB;
    const token = readSessionCookie(c);
    const current = token ? await findSession(db, token, now) : null;
    const owner = await findAccountByIdentity(db, 'google', subject);

    if (current) {
      // Already signed in: this adds Google to the account, or is a no-op if it is already there.
      if (owner === current.accountId) return back();
      if (owner) return back('in-use');
      await linkIdentity(db, current.accountId, 'google', subject, now);
      return back('linked');
    }

    const accountId = owner ?? (await createAccountWithIdentity(db, 'google', subject, now));
    const session = await createSession(db, accountId, now);
    setSignInCookies(c, session.token, session.expiresAt);
    return back(owner ? undefined : 'welcome');
  });

  return routes;
}

function callbackUrl(c: Context<App>): string {
  return new URL('/auth/google/callback', c.req.url).toString();
}

function siteUrl(c: Context<App>, path: string, outcome?: Outcome): string {
  const url = new URL(path, c.env.SITE_URL);
  if (outcome) url.searchParams.set('signin', outcome);
  return url.toString();
}
