import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { Env } from './env.js';
import type { PasskeyCeremonies, StoredPasskey } from './passkeys.js';
import { createAccountWithIdentity, createSession } from './store.js';
import { createTestDatabase } from './testing/sqlite-d1.js';

const SITE = 'https://cspnews.example';
const T0 = new Date('2026-11-12T08:00:00Z');
let now = T0;

let db: ReturnType<typeof createTestDatabase>;
let env: Env;
/** The passkey the fake device answers with; set to an Error to make the check fail. */
let device: { passkey: StoredPasskey; counter: number } | Error;
let challengeCount = 0;

const fakeCeremonies: PasskeyCeremonies = {
  registrationOptions: (account) =>
    Promise.resolve({
      challenge: `register-challenge-${String(++challengeCount)}`,
      rp: { name: 'CSPNews', id: 'cspnews.example' },
      user: { id: account.id, name: account.name, displayName: account.name },
      pubKeyCredParams: [],
      excludeCredentials: account.existing.map((p) => ({ id: p.id, type: 'public-key' as const })),
    }),
  verifyRegistration: (_response, challenge) =>
    device instanceof Error || !challenge.startsWith('register-')
      ? Promise.reject(new Error('bad'))
      : Promise.resolve(device.passkey),
  authenticationOptions: () =>
    Promise.resolve({ challenge: `login-challenge-${String(++challengeCount)}` }),
  verifyAuthentication: (_response, challenge) =>
    device instanceof Error || !challenge.startsWith('login-')
      ? Promise.reject(new Error('bad'))
      : Promise.resolve(device.counter),
};

const app = createApp({ clock: () => now, passkeys: () => fakeCeremonies });

const passkey = (id: string): StoredPasskey => ({
  id,
  publicKey: 'pk',
  counter: 0,
  transports: ['internal'],
  backedUp: true,
});

beforeEach(() => {
  now = T0;
  db = createTestDatabase();
  device = { passkey: passkey('key-1'), counter: 5 };
  env = {
    DB: db,
    ALLOWED_ORIGINS: SITE,
    COOKIE_DOMAIN: 'cspnews.example',
    SITE_URL: SITE,
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    PASSKEY_RP_ID: 'cspnews.example',
  };
});

const count = (table: string) =>
  (db.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

/** Cookie request header from a response's Set-Cookie headers, merged over earlier cookies. */
function withCookies(res: Response, earlier = ''): string {
  const jar = new Map(
    earlier
      .split('; ')
      .filter(Boolean)
      .map((c) => c.split('=') as [string, string]),
  );
  for (const header of res.headers.getSetCookie()) {
    const [pair = ''] = header.split(';');
    const [name = '', value = ''] = pair.split('=');
    if (value === '') jar.delete(name);
    else jar.set(name, value);
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

function post(path: string, cookie = '', body?: unknown, origin = SITE) {
  return app.request(
    path,
    {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
}

const registration = (id: string) => ({
  id,
  rawId: id,
  type: 'public-key',
  response: { clientDataJSON: 'x', attestationObject: 'y' },
  clientExtensionResults: {},
});
const assertion = (id: string) => ({
  id,
  rawId: id,
  type: 'public-key',
  response: { clientDataJSON: 'x', authenticatorData: 'y', signature: 'z' },
  clientExtensionResults: {},
});

/** Runs the whole "create account with a passkey" ceremony; returns the final response and cookies. */
async function register(cookie = '') {
  const options = await post('/auth/passkey/register/options', cookie);
  const jar = withCookies(options, cookie);
  const res = await post('/auth/passkey/register/verify', jar, registration('key-1'));
  return { options, res, cookie: withCookies(res, jar) };
}

async function login(cookie = '', id = 'key-1') {
  const options = await post('/auth/passkey/login/options', cookie);
  const jar = withCookies(options, cookie);
  const res = await post('/auth/passkey/login/verify', jar, assertion(id));
  return { res, cookie: withCookies(res, jar) };
}

describe('making an account with a passkey', () => {
  it('creates the account, stores the public key, and signs in', async () => {
    const { options, res, cookie } = await register();
    expect(options.status).toBe(200);
    expect(((await options.json()) as { user: { name: string } }).user.name).toBe('CSPNews reader');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: 'welcome' });
    expect(count('accounts')).toBe(1);
    expect(count('passkeys')).toBe(1);

    const me = await app.request('/me', { headers: { Cookie: cookie } }, env);
    expect(await me.json()).toMatchObject({ signInMethods: ['passkey'] });
  });

  it('keeps the challenge in a short-lived HttpOnly cookie', async () => {
    const options = await post('/auth/passkey/register/options');
    const cookie = options.headers.getSetCookie().join('\n');
    expect(cookie).toMatch(/__Host-cspn_passkey=.*Max-Age=300.*HttpOnly.*Secure.*SameSite=Strict/);
  });

  it('refuses an answer without a challenge, and answers to a used challenge', async () => {
    expect((await post('/auth/passkey/register/verify', '', registration('key-1'))).status).toBe(
      400,
    );

    const options = await post('/auth/passkey/register/options');
    const jar = withCookies(options);
    expect((await post('/auth/passkey/register/verify', jar, registration('key-1'))).status).toBe(
      200,
    );
    // The same challenge cookie again: it was used up.
    expect(
      (
        await post(
          '/auth/passkey/register/verify',
          jar.replace(/; __Host-cspn_session=[^;]+/, ''),
          registration('key-1'),
        )
      ).status,
    ).toBe(400);
    expect(count('accounts')).toBe(1);
  });

  it('refuses an answer after five minutes', async () => {
    const options = await post('/auth/passkey/register/options');
    now = new Date(T0.getTime() + 301_000);
    const res = await post(
      '/auth/passkey/register/verify',
      withCookies(options),
      registration('key-1'),
    );
    expect(res.status).toBe(400);
    expect(count('accounts')).toBe(0);
  });

  it('changes nothing when the device answer does not check out', async () => {
    device = new Error('bad signature');
    const { res } = await register();
    expect(res.status).toBe(400);
    expect(count('accounts')).toBe(0);
  });

  it('refuses requests from other sites', async () => {
    expect(
      (await post('/auth/passkey/register/options', '', undefined, 'https://evil.example')).status,
    ).toBe(403);
  });
});

describe('adding a passkey to a signed-in account', () => {
  it('adds it to the account, without a new account', async () => {
    const accountId = await createAccountWithIdentity(db, 'google', 'g-1', now);
    const { token } = await createSession(db, accountId, now);
    const { res } = await register(`__Host-cspn_session=${token}`);
    expect(await res.json()).toEqual({ result: 'added' });
    expect(count('accounts')).toBe(1);
    const row = db.sqlite.prepare('SELECT account_id FROM passkeys').get() as {
      account_id: string;
    };
    expect(row.account_id).toBe(accountId);
  });

  it('lists the passkeys already on the account so the device skips them', async () => {
    const accountId = await createAccountWithIdentity(db, 'google', 'g-1', now);
    const { token } = await createSession(db, accountId, now);
    const signedIn = `__Host-cspn_session=${token}`;
    await register(signedIn);
    const options = await post('/auth/passkey/register/options', signedIn);
    const body = (await options.json()) as { excludeCredentials: { id: string }[] };
    expect(body.excludeCredentials.map((c) => c.id)).toEqual(['key-1']);
  });

  it('refuses a passkey that already belongs to someone', async () => {
    await register();
    const accountId = await createAccountWithIdentity(db, 'google', 'g-2', now);
    const { token } = await createSession(db, accountId, now);
    const { res } = await register(`__Host-cspn_session=${token}`);
    expect(res.status).toBe(409);
    expect(count('passkeys')).toBe(1);
  });
});

describe('signing in with a passkey', () => {
  it('signs in and records the new counter', async () => {
    await register();
    const { res, cookie } = await login();
    expect(await res.json()).toEqual({ result: 'signed-in' });
    expect(cookie).toContain('__Host-cspn_session=');
    const row = db.sqlite.prepare('SELECT counter, last_used_at FROM passkeys').get() as {
      counter: number;
      last_used_at: string;
    };
    expect(row).toEqual({ counter: 5, last_used_at: now.toISOString() });
    expect(count('sessions')).toBe(2);
  });

  it('explains an unknown passkey', async () => {
    const { res } = await login('', 'never-registered');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toContain('not linked');
  });

  it('does not sign in when the device answer does not check out', async () => {
    await register();
    device = new Error('bad');
    const { res } = await login();
    expect(res.status).toBe(400);
    expect(count('sessions')).toBe(1);
  });

  it('will not use a registration challenge to sign in', async () => {
    await register();
    const options = await post('/auth/passkey/register/options');
    const res = await post('/auth/passkey/login/verify', withCookies(options), assertion('key-1'));
    expect(res.status).toBe(400);
  });
});

describe('managing passkeys', () => {
  async function signedInWithTwoKeys() {
    const { cookie } = await register();
    device = { passkey: passkey('key-2'), counter: 0 };
    const options = await post('/auth/passkey/register/options', cookie);
    const jar = withCookies(options, cookie);
    await post('/auth/passkey/register/verify', jar, registration('key-2'));
    return cookie;
  }

  it('lists the passkeys without their keys', async () => {
    const cookie = await signedInWithTwoKeys();
    const res = await app.request('/me/passkeys', { headers: { Cookie: cookie } }, env);
    const list = (await res.json()) as Record<string, unknown>[];
    expect(list.map((p) => p.id)).toEqual(['key-1', 'key-2']);
    expect(JSON.stringify(list)).not.toContain('publicKey');
  });

  it('removes a passkey when another way to sign in is left', async () => {
    const cookie = await signedInWithTwoKeys();
    const res = await app.request(
      '/me/passkeys/key-2',
      { method: 'DELETE', headers: { Cookie: cookie, Origin: SITE } },
      env,
    );
    expect(res.status).toBe(204);
    expect(count('passkeys')).toBe(1);
  });

  it('never removes the last way to sign in', async () => {
    const { cookie } = await register();
    const res = await app.request(
      '/me/passkeys/key-1',
      { method: 'DELETE', headers: { Cookie: cookie, Origin: SITE } },
      env,
    );
    expect(res.status).toBe(409);
    expect(count('passkeys')).toBe(1);
  });

  it("cannot remove someone else's passkey", async () => {
    await register();
    const accountId = await createAccountWithIdentity(db, 'google', 'g-3', now);
    const { token } = await createSession(db, accountId, now);
    const res = await app.request(
      '/me/passkeys/key-1',
      { method: 'DELETE', headers: { Cookie: `__Host-cspn_session=${token}`, Origin: SITE } },
      env,
    );
    expect(res.status).toBe(404);
    expect(count('passkeys')).toBe(1);
  });

  it('deleting the account removes its passkeys', async () => {
    const cookie = await signedInWithTwoKeys();
    await app.request('/me', { method: 'DELETE', headers: { Cookie: cookie, Origin: SITE } }, env);
    expect(count('passkeys')).toBe(0);
  });
});
