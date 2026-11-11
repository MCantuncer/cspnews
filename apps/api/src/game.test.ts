import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { Env } from './env.js';
import { createAccount, createSession } from './store.js';
import { createTestDatabase } from './testing/sqlite-d1.js';

const SITE = 'https://cspnews.example';
// 2026-11-14, 10:00 in Istanbul. The game opened on 2026-11-11.
const T0 = new Date('2026-11-14T07:00:00Z');

let now: Date;
let db: ReturnType<typeof createTestDatabase>;
let env: Env;
const app = createApp({ clock: () => now });

beforeEach(() => {
  now = T0;
  db = createTestDatabase();
  env = {
    DB: db,
    ALLOWED_ORIGINS: SITE,
    COOKIE_DOMAIN: 'cspnews.example',
    SITE_URL: SITE,
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    PASSKEY_RP_ID: 'cspnews.example',
  };
});

async function signIn() {
  const accountId = await createAccount(db, now);
  const { token } = await createSession(db, accountId, now);
  return { accountId, cookie: `__Host-cspn_session=${token}` };
}

function send(path: string, cookie: string, results?: unknown) {
  const headers = new Headers({ Cookie: cookie });
  if (results === undefined) return app.request(path, { headers }, env);
  headers.set('Origin', SITE);
  headers.set('Content-Type', 'application/json');
  return app.request(path, { method: 'POST', headers, body: JSON.stringify({ results }) }, env);
}

const day = (d: string, tries: number, solved = true) => ({ day: d, tries, solved });

describe('word game results', () => {
  it('starts empty, and needs a sign-in', async () => {
    const { cookie } = await signIn();
    const res = await send('/me/game/en', cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
    expect((await send('/me/game/en', '')).status).toBe(401);
  });

  it('imports a browser’s history and answers with every saved day', async () => {
    const { cookie } = await signIn();
    const res = await send('/me/game/en', cookie, [
      day('2026-11-13', 4),
      day('2026-11-11', 6, false),
      day('2026-11-12', 3),
    ]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [day('2026-11-11', 6, false), day('2026-11-12', 3), day('2026-11-13', 4)],
      added: 3,
      conflicts: [],
      refused: 0,
    });
  });

  it('keeps the first result for a day, so another device cannot change it', async () => {
    const { cookie } = await signIn();
    await send('/me/game/en', cookie, [day('2026-11-14', 2)]);
    const res = await send('/me/game/en', cookie, [day('2026-11-14', 5), day('2026-11-13', 4)]);
    expect(await res.json()).toMatchObject({
      results: [day('2026-11-13', 4), day('2026-11-14', 2)],
      added: 1,
      conflicts: ['2026-11-14'],
    });
  });

  it('refuses days that have not started in Istanbul or came before the game opened', async () => {
    const { cookie } = await signIn();
    const res = await send('/me/game/tr', cookie, [
      day('2026-11-15', 3),
      day('2026-11-10', 3),
      day('2026-11-14', 1),
    ]);
    expect(await res.json()).toMatchObject({
      results: [day('2026-11-14', 1)],
      added: 1,
      refused: 2,
    });
  });

  it('keeps the two languages apart', async () => {
    const { cookie } = await signIn();
    await send('/me/game/tr', cookie, [day('2026-11-14', 2)]);
    expect(await (await send('/me/game/en', cookie)).json()).toEqual({ results: [] });
  });

  it('refuses bad input', async () => {
    const { cookie } = await signIn();
    expect((await send('/me/game/de', cookie)).status).toBe(404);
    expect((await send('/me/game/en', cookie, [day('2026-11-14', 7)])).status).toBe(400);
    expect((await send('/me/game/en', cookie, [day('2026-11-14', 3, false)])).status).toBe(400);
    expect((await send('/me/game/en', cookie, 'nope')).status).toBe(400);
  });

  it('is in the export, and goes with the account', async () => {
    const { cookie } = await signIn();
    await send('/me/game/en', cookie, [day('2026-11-14', 2)]);
    const exported = (await (await send('/me/export', cookie)).json()) as {
      wordGame: unknown[];
    };
    expect(exported.wordGame).toMatchObject([
      { lang: 'en', day: '2026-11-14', tries: 2, solved: 1 },
    ]);
    const headers = new Headers({ Cookie: cookie, Origin: SITE });
    expect((await app.request('/me', { method: 'DELETE', headers }, env)).status).toBe(204);
    expect(
      (db.sqlite.prepare('SELECT count(*) AS n FROM game_results').get() as { n: number }).n,
    ).toBe(0);
  });
});
