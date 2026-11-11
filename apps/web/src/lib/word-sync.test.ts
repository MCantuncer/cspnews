import { describe, expect, it } from 'vitest';

import { combineResults, sameResults, syncWordResults } from './word-sync.js';

const day = (d: string, tries: number, solved = true) => ({ day: d, tries, solved });
const BASE = 'https://api.example.com';
const SIGNED_IN = 'cspn_signed_in=1';

describe('combining results', () => {
  it('lets the account win a day, keeps days only this browser has, and sorts by day', () => {
    const local = [day('2026-11-13', 5), day('2026-11-12', 2)];
    const account = [day('2026-11-13', 3), day('2026-11-11', 6, false)];
    expect(combineResults(local, account)).toEqual([
      day('2026-11-11', 6, false),
      day('2026-11-12', 2),
      day('2026-11-13', 3),
    ]);
  });

  it('compares lists by their days, not their order', () => {
    expect(sameResults([day('a', 1), day('b', 2)], [day('b', 2), day('a', 1)])).toBe(true);
    expect(sameResults([day('a', 1)], [day('a', 2)])).toBe(false);
    expect(sameResults([day('a', 1)], [])).toBe(false);
  });
});

describe('syncing with the account', () => {
  it('never calls the API for a signed-out reader, or with accounts off', async () => {
    let calls = 0;
    const fetcher = (() => {
      calls += 1;
      return Promise.resolve(new Response('{}'));
    }) as typeof fetch;
    expect(await syncWordResults('en', [], { base: BASE, cookie: '', fetcher })).toBeUndefined();
    expect(
      await syncWordResults('en', [], { base: undefined, cookie: SIGNED_IN, fetcher }),
    ).toBeUndefined();
    expect(calls).toBe(0);
  });

  it('sends this browser’s days and returns them combined with the account’s', async () => {
    let sent: unknown;
    const fetcher = ((url: string, init?: RequestInit) => {
      expect(url).toBe(`${BASE}/me/game/tr`);
      sent = JSON.parse(init?.body as string);
      return Promise.resolve(
        new Response(JSON.stringify({ results: [day('2026-11-11', 4), day('2026-11-12', 1)] })),
      );
    }) as typeof fetch;
    const combined = await syncWordResults('tr', [day('2026-11-12', 3)], {
      base: BASE,
      cookie: SIGNED_IN,
      fetcher,
    });
    expect(sent).toEqual({ results: [day('2026-11-12', 3)] });
    expect(combined).toEqual([day('2026-11-11', 4), day('2026-11-12', 1)]);
  });

  it('carries on locally when the API fails or the sign-in has ended', async () => {
    const offline = (() => Promise.reject(new TypeError('offline'))) as typeof fetch;
    const signedOut = (() =>
      Promise.resolve(new Response('{"error":"Not signed in."}', { status: 401 }))) as typeof fetch;
    for (const fetcher of [offline, signedOut]) {
      expect(
        await syncWordResults('en', [day('2026-11-12', 3)], {
          base: BASE,
          cookie: SIGNED_IN,
          fetcher,
        }),
      ).toBeUndefined();
    }
  });
});
