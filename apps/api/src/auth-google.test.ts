import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { Env } from './env.js';
import type { GoogleSignIn } from './google.js';
import { createAccount, createSession } from './store.js';
import { createTestDatabase } from './testing/sqlite-d1.js';

const SITE = 'https://cspnews.example';
const API = 'https://api.cspnews.example';
const now = new Date('2026-11-11T12:00:00Z');

let db: ReturnType<typeof createTestDatabase>;
let env: Env;
/** The Google account the fake Google signs in, or an error to throw. */
let googleAnswer: string | Error;

const fakeGoogle: GoogleSignIn = {
  authorizationUrl: (pending, redirectUri) =>
    Promise.resolve(
      `https://accounts.google.com/auth?state=${pending.state}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    ),
  verify: () =>
    googleAnswer instanceof Error ? Promise.reject(googleAnswer) : Promise.resolve(googleAnswer),
};

const app = createApp({ clock: () => now, google: () => fakeGoogle });

beforeEach(() => {
  db = createTestDatabase();
  googleAnswer = 'google-sub-1';
  env = {
    DB: db,
    ALLOWED_ORIGINS: SITE,
    COOKIE_DOMAIN: 'cspnews.example',
    SITE_URL: SITE,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'secret',
  };
});

const count = (table: string) =>
  (db.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

/** Cookies from Set-Cookie headers, as a Cookie request header. */
function cookiesFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0] ?? '')
    .filter((c) => !c.endsWith('='))
    .join('; ');
}

/** Starts a sign-in and comes back from Google. Returns the final response. */
async function signInWithGoogle(
  options: { returnTo?: string; cookie?: string; state?: string } = {},
) {
  const start = await app.request(
    `${API}/auth/google${options.returnTo ? `?return=${encodeURIComponent(options.returnTo)}` : ''}`,
    { headers: options.cookie ? { Cookie: options.cookie } : {} },
    env,
  );
  const google = new URL(start.headers.get('Location') ?? '');
  const state = options.state ?? google.searchParams.get('state') ?? '';
  const cookie = [cookiesFrom(start), options.cookie].filter(Boolean).join('; ');
  return app.request(
    `${API}/auth/google/callback?code=abc&state=${state}`,
    { headers: { Cookie: cookie } },
    env,
  );
}

describe('GET /auth/google', () => {
  it('sends the reader to Google with our callback, and remembers the attempt', async () => {
    const res = await app.request(`${API}/auth/google?return=/word`, {}, env);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('Location') ?? '');
    expect(location.searchParams.get('redirect_uri')).toBe(`${API}/auth/google/callback`);
    const cookie = res.headers.getSetCookie().join('\n');
    expect(cookie).toMatch(/__Host-cspn_pending=.*HttpOnly.*Secure/);
    expect(cookie).toContain('Max-Age=600');
  });
});

describe('GET /auth/google/callback', () => {
  it('makes a new account, signs it in, and says welcome', async () => {
    const res = await signInWithGoogle({ returnTo: '/2026-11-11/evening' });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`${SITE}/2026-11-11/evening?signin=welcome`);
    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toContain('__Host-cspn_session=');
    expect(cookies).toContain('cspn_signed_in=1');
    expect(count('accounts')).toBe(1);
    expect(count('identities')).toBe(1);

    const me = await app.request('/me', { headers: { Cookie: cookiesFrom(res) } }, env);
    expect(await me.json()).toMatchObject({ signInMethods: ['google'] });
  });

  it('signs a returning reader into the same account', async () => {
    await signInWithGoogle();
    const res = await signInWithGoogle();
    expect(res.headers.get('Location')).toBe(`${SITE}/`);
    expect(count('accounts')).toBe(1);
    expect(count('sessions')).toBe(2);
  });

  it('refuses a callback whose state does not match the attempt', async () => {
    const res = await signInWithGoogle({ state: 'forged-state-value' });
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=failed`);
    expect(count('accounts')).toBe(0);
  });

  it('refuses a callback without a pending attempt', async () => {
    const res = await app.request(`${API}/auth/google/callback?code=abc&state=x`, {}, env);
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=failed`);
  });

  it('reports a cancelled sign-in', async () => {
    const start = await app.request(`${API}/auth/google`, {}, env);
    const res = await app.request(
      `${API}/auth/google/callback?error=access_denied`,
      { headers: { Cookie: cookiesFrom(start) } },
      env,
    );
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=cancelled`);
  });

  it('changes nothing when Google verification fails', async () => {
    googleAnswer = new Error('bad token');
    const res = await signInWithGoogle();
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=failed`);
    expect(count('accounts')).toBe(0);
  });

  it('never returns to another site', async () => {
    const res = await signInWithGoogle({ returnTo: '//evil.example/x' });
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=welcome`);
  });

  it('adds Google to the account the reader is signed in to', async () => {
    const accountId = await createAccount(db, now);
    const { token } = await createSession(db, accountId, now);
    const res = await signInWithGoogle({ cookie: `__Host-cspn_session=${token}` });
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=linked`);
    expect(count('accounts')).toBe(1);
    const row = db.sqlite.prepare('SELECT account_id FROM identities').get() as {
      account_id: string;
    };
    expect(row.account_id).toBe(accountId);
  });

  it('will not move a Google account that belongs to someone else', async () => {
    await signInWithGoogle(); // google-sub-1 now owns an account
    const other = await createAccount(db, now);
    const { token } = await createSession(db, other, now);
    const res = await signInWithGoogle({ cookie: `__Host-cspn_session=${token}` });
    expect(res.headers.get('Location')).toBe(`${SITE}/?signin=in-use`);
    expect(count('identities')).toBe(1);
  });
});
