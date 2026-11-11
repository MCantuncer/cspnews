/**
 * Passkeys: make an account, sign in, and manage the passkeys on an account.
 *
 *   POST   /auth/passkey/register/options   a challenge for a new passkey
 *   POST   /auth/passkey/register/verify    the new passkey: makes an account, or adds it to yours
 *   POST   /auth/passkey/login/options      a challenge to sign in
 *   POST   /auth/passkey/login/verify       signs in
 *   GET    /me/passkeys                     your passkeys
 *   DELETE /me/passkeys/:id                 removes one, never your last way to sign in
 *
 * Each challenge is stored when handed out and deleted when answered, so it can be used once and
 * only within five minutes. The browser holds it in an HttpOnly cookie.
 */
import { newAccountId } from '@cspnews/accounts';
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { App } from './app.js';
import {
  readSessionCookie,
  setCeremonyCookie,
  setSignInCookies,
  takeCeremonyCookie,
} from './cookies.js';
import { parseAuthenticationResponse, parseRegistrationResponse } from './passkeys.js';
import type { PasskeyCeremonies } from './passkeys.js';
import {
  CHALLENGE_SECONDS,
  addPasskey,
  countSignInWays,
  createAccountWithPasskey,
  createSession,
  deletePasskey,
  findPasskey,
  findSession,
  getProfile,
  listPasskeys,
  saveChallenge,
  takeChallenge,
  touchPasskey,
} from './store.js';
import type { PendingCeremony } from './store.js';

/** What a passkey manager shows next to the passkey. We have no email, so it is a plain label. */
const DEFAULT_PASSKEY_NAME = 'CSPNews reader';

type Ceremonies = (c: Context<App>) => PasskeyCeremonies;

export function passkeyRoutes(ceremonies: Ceremonies, clock: () => Date) {
  const routes = new Hono<App>();

  routes.post('/auth/passkey/register/options', async (c) => {
    const db = c.env.DB;
    const session = await currentSession(c, clock());
    const accountId = session?.accountId ?? newAccountId();
    const profile = session ? await getProfile(db, accountId) : null;
    const existing = session ? await listPasskeys(db, accountId) : [];

    const options = await ceremonies(c).registrationOptions({
      id: accountId,
      name: profile?.name ?? DEFAULT_PASSKEY_NAME,
      existing,
    });
    await begin(c, clock(), {
      purpose: 'register',
      challenge: options.challenge,
      accountId,
      existing: session !== null,
    });
    return c.json(options);
  });

  routes.post('/auth/passkey/register/verify', async (c) => {
    const now = clock();
    const pending = await finish(c, now, 'register');
    const response = parseRegistrationResponse(await readJson(c.req.raw));
    if (!pending?.accountId || !response) return failed(c);

    const db = c.env.DB;
    if (pending.existing) {
      // Adding to an account: the reader must still be signed in to that same account.
      const session = await currentSession(c, now);
      if (session?.accountId !== pending.accountId) return c.json({ error: 'Not signed in.' }, 401);
    }

    let passkey;
    try {
      passkey = await ceremonies(c).verifyRegistration(response, pending.challenge);
    } catch (error) {
      console.warn('Passkey registration failed:', error instanceof Error ? error.message : error);
      return failed(c);
    }
    if (await findPasskey(db, passkey.id))
      return c.json({ error: 'This passkey is already in use.' }, 409);

    if (pending.existing) {
      await addPasskey(db, pending.accountId, passkey, now);
      return c.json({ result: 'added' });
    }
    await createAccountWithPasskey(db, pending.accountId, passkey, now);
    const session = await createSession(db, pending.accountId, now);
    setSignInCookies(c, session.token, session.expiresAt);
    return c.json({ result: 'welcome' });
  });

  routes.post('/auth/passkey/login/options', async (c) => {
    const options = await ceremonies(c).authenticationOptions();
    await begin(c, clock(), {
      purpose: 'login',
      challenge: options.challenge,
      accountId: null,
      existing: false,
    });
    return c.json(options);
  });

  routes.post('/auth/passkey/login/verify', async (c) => {
    const now = clock();
    const pending = await finish(c, now, 'login');
    const response = parseAuthenticationResponse(await readJson(c.req.raw));
    if (!pending || !response) return failed(c);

    const db = c.env.DB;
    const found = await findPasskey(db, response.id);
    if (!found) {
      return c.json(
        { error: 'This passkey is not linked to a CSPNews account. It may have been removed.' },
        401,
      );
    }

    let counter: number;
    try {
      counter = await ceremonies(c).verifyAuthentication(
        response,
        pending.challenge,
        found.passkey,
      );
    } catch (error) {
      console.warn('Passkey sign-in failed:', error instanceof Error ? error.message : error);
      return failed(c);
    }

    await touchPasskey(db, found.passkey.id, counter, now);
    const session = await createSession(db, found.accountId, now);
    setSignInCookies(c, session.token, session.expiresAt);
    return c.json({ result: 'signed-in' });
  });

  return routes;
}

/** Routes under /me; the caller puts them behind the sign-in check. */
export function passkeyAccountRoutes() {
  const routes = new Hono<App>();

  routes.get('/me/passkeys', async (c) => {
    const passkeys = await listPasskeys(c.env.DB, c.get('session').accountId);
    return c.json(
      passkeys.map((p) => ({
        id: p.id,
        backedUp: p.backedUp,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      })),
    );
  });

  routes.delete('/me/passkeys/:id', async (c) => {
    const db = c.env.DB;
    const { accountId } = c.get('session');
    const id = c.req.param('id');
    const found = await findPasskey(db, id);
    if (found?.accountId !== accountId)
      return c.json({ error: 'No such passkey on your account.' }, 404);
    if ((await countSignInWays(db, accountId)) <= 1) {
      return c.json(
        {
          error:
            'This is your only way to sign in. Add another passkey or Google first, or delete the account.',
        },
        409,
      );
    }
    await deletePasskey(db, accountId, id);
    return c.body(null, 204);
  });

  return routes;
}

async function begin(c: Context<App>, now: Date, ceremony: PendingCeremony) {
  await saveChallenge(c.env.DB, ceremony, now);
  setCeremonyCookie(c, ceremony.challenge, CHALLENGE_SECONDS);
}

async function finish(c: Context<App>, now: Date, purpose: PendingCeremony['purpose']) {
  const challenge = takeCeremonyCookie(c);
  return challenge ? takeChallenge(c.env.DB, challenge, purpose, now) : null;
}

async function currentSession(c: Context<App>, now: Date) {
  const token = readSessionCookie(c);
  return token ? findSession(c.env.DB, token, now) : null;
}

function failed(c: Context<App>) {
  return c.json({ error: 'The passkey could not be checked. Please try again.' }, 400);
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
