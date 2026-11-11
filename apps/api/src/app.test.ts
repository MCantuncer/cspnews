import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { Env } from './env.js';
import { createAccount, createSession } from './store.js';
import { createTestDatabase } from './testing/sqlite-d1.js';

const SITE = 'https://cspnews.example';
const T0 = new Date('2026-11-11T12:00:00Z');

let now: Date;
let db: ReturnType<typeof createTestDatabase>;
let env: Env;
const app = createApp({ clock: () => now });

beforeEach(() => {
  now = T0;
  db = createTestDatabase();
  env = {
    DB: db,
    ALLOWED_ORIGINS: `${SITE}, http://localhost:4321`,
    COOKIE_DOMAIN: 'cspnews.example',
    SITE_URL: SITE,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
  };
});

/** Makes an account and signs it in; returns the account id and the request cookie. */
async function signIn() {
  const accountId = await createAccount(db, now);
  const { token } = await createSession(db, accountId, now);
  return { accountId, cookie: `__Host-cspn_session=${token}` };
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('Cookie', init.cookie);
  if (init.method && init.method !== 'GET') headers.set('Origin', headers.get('Origin') ?? SITE);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  return app.request(path, { ...init, headers }, env);
}

const rowCount = (table: string) =>
  (db.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('GET /me', () => {
  it('returns the profile with a random avatar and default settings', async () => {
    const { accountId, cookie } = await signIn();
    const res = await call('/me', { cookie });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: accountId,
      name: null,
      settings: { lang: 'en', theme: 'dark' },
      signInMethods: [],
    });
    expect(body.avatar).toMatch(/^station:[a-z-]+:[a-z]+$/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 401 and clears both cookies without a sign-in', async () => {
    const res = await call('/me');
    expect(res.status).toBe(401);
    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toContain('__Host-cspn_session=;');
    expect(cookies).toMatch(/cspn_signed_in=;.*Domain=cspnews\.example/);
  });

  it('refuses an unknown token', async () => {
    const res = await call('/me', { cookie: '__Host-cspn_session=not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('refuses and removes an expired sign-in', async () => {
    const { cookie } = await signIn();
    now = new Date('2027-03-01T00:00:00Z'); // past 90 days
    expect((await call('/me', { cookie })).status).toBe(401);
    expect(rowCount('sessions')).toBe(0);
  });

  it('pushes the expiry out at most once a day', async () => {
    const { cookie } = await signIn();
    now = new Date(T0.getTime() + 60 * 60 * 1000);
    expect((await call('/me', { cookie })).headers.getSetCookie()).toEqual([]);

    now = new Date(T0.getTime() + 25 * 60 * 60 * 1000);
    const res = await call('/me', { cookie });
    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('Expires=Wed, 10 Feb 2027 13:00:00 GMT');
    const row = db.sqlite.prepare('SELECT expires_at FROM sessions').get() as {
      expires_at: string;
    };
    expect(row.expires_at).toBe('2027-02-10T13:00:00.000Z');
  });
});

describe('PATCH /me', () => {
  it('changes name, avatar and settings', async () => {
    const { cookie } = await signIn();
    const res = await call('/me', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ name: '  Can ', avatar: 'initial:night', settings: { lang: 'tr' } }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: 'Can',
      avatar: 'initial:night',
      settings: { lang: 'tr', theme: 'dark' },
    });
  });

  it('refuses fields we do not keep, with a readable message', async () => {
    const { cookie } = await signIn();
    const res = await call('/me', {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ email: 'a@b.c' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBeTruthy();
  });

  it('refuses requests from other sites', async () => {
    const { cookie } = await signIn();
    const res = await call('/me', {
      method: 'PATCH',
      cookie,
      headers: { Origin: 'https://evil.example' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('CORS', () => {
  it('lets the site call with cookies, and nobody else', async () => {
    const ok = await app.request(
      '/me',
      { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'PATCH' } },
      env,
    );
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(ok.headers.get('Access-Control-Allow-Credentials')).toBe('true');

    const no = await app.request(
      '/me',
      {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PATCH' },
      },
      env,
    );
    expect(no.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('GET /me/export', () => {
  it('downloads everything stored about the account, without token hashes', async () => {
    const { accountId, cookie } = await signIn();
    const res = await call('/me/export', { cookie });
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const body = (await res.json()) as { account: { id: string }; sessions: object[] };
    expect(body.account.id).toBe(accountId);
    expect(body.sessions).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('token_hash');
  });
});

describe('DELETE /me', () => {
  it('removes the account and every row, and signs out', async () => {
    const { accountId, cookie } = await signIn();
    db.sqlite
      .prepare(
        "INSERT INTO identities (provider, subject, account_id, created_at) VALUES ('google', '123', ?, ?)",
      )
      .run(accountId, T0.toISOString());
    await createSession(db, accountId, now); // a second device

    const res = await call('/me', { method: 'DELETE', cookie });
    expect(res.status).toBe(204);
    expect(rowCount('accounts')).toBe(0);
    expect(rowCount('identities')).toBe(0);
    expect(rowCount('sessions')).toBe(0);
    expect((await call('/me', { cookie })).status).toBe(401);
  });

  it('leaves other accounts alone', async () => {
    const { cookie } = await signIn();
    await signIn();
    await call('/me', { method: 'DELETE', cookie });
    expect(rowCount('accounts')).toBe(1);
    expect(rowCount('sessions')).toBe(1);
  });
});

describe('POST /auth/signout', () => {
  it('signs out this device only', async () => {
    const { accountId, cookie } = await signIn();
    await createSession(db, accountId, now);
    expect((await call('/auth/signout', { method: 'POST', cookie })).status).toBe(204);
    expect(rowCount('sessions')).toBe(1);
  });

  it('signs out everywhere', async () => {
    const { accountId, cookie } = await signIn();
    await createSession(db, accountId, now);
    const res = await call('/auth/signout', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ everywhere: true }),
    });
    expect(res.status).toBe(204);
    expect(rowCount('sessions')).toBe(0);
  });
});

describe('unknown paths', () => {
  it('answer 404, signed in or not', async () => {
    expect((await call('/nope')).status).toBe(404);
  });
});

describe('GET /health', () => {
  it('answers without a sign-in', async () => {
    expect(await (await call('/health')).json()).toEqual({ ok: true });
  });
});
