import { parseAvatar } from '@cspnews/accounts/avatar';
import { describe, expect, it } from 'vitest';

import {
  AccountError,
  PROFILE_MAX_AGE_MS,
  accountApi,
  avatarChoices,
  avatarOf,
  googleSignInUrl,
  hasSignInHint,
  readSavedProfile,
  saveProfile,
  signInOutcome,
  withoutSignInOutcome,
} from './account.js';
import type { Profile } from './account.js';
import { accountPath, accountWords } from './account-words.js';

const profile: Profile = {
  id: 'abc',
  name: 'Can',
  avatar: 'station:junction:dusk',
  settings: { lang: 'en', theme: 'dark' },
  signInMethods: ['passkey'],
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('the signed-in hint', () => {
  it('reads only the exact hint cookie', () => {
    expect(hasSignInHint('a=1; cspn_signed_in=1; b=2')).toBe(true);
    expect(hasSignInHint('cspn_signed_in=1')).toBe(true);
    expect(hasSignInHint('')).toBe(false);
    expect(hasSignInHint('cspn_signed_in=0')).toBe(false);
    expect(hasSignInHint('xcspn_signed_in=1')).toBe(false);
  });
});

describe('the saved profile', () => {
  it('is used for an hour, then asked for again', () => {
    const storage = memoryStorage();
    saveProfile(storage, profile, 1_000);
    expect(readSavedProfile(storage, 1_000 + PROFILE_MAX_AGE_MS)).toEqual(profile);
    expect(readSavedProfile(storage, 1_001 + PROFILE_MAX_AGE_MS)).toBeUndefined();
    expect(readSavedProfile(storage, 999)).toBeUndefined();
  });

  it('is removed on sign-out and ignores junk', () => {
    const storage = memoryStorage();
    saveProfile(storage, profile, 0);
    saveProfile(storage, null, 0);
    expect(readSavedProfile(storage, 0)).toBeUndefined();
    storage.setItem('cspnews:profile', '{not json');
    expect(readSavedProfile(storage, 0)).toBeUndefined();
    storage.setItem('cspnews:profile', JSON.stringify({ profile: { id: 1 }, savedAt: 0 }));
    expect(readSavedProfile(storage, 0)).toBeUndefined();
    expect(readSavedProfile(undefined, 0)).toBeUndefined();
  });
});

describe('Google sign-in addresses', () => {
  it('reads the outcome the API adds, and nothing else', () => {
    expect(signInOutcome('?signin=welcome')).toBe('welcome');
    expect(signInOutcome('?a=1&signin=in-use')).toBe('in-use');
    expect(signInOutcome('?signin=hello')).toBeUndefined();
    expect(signInOutcome('')).toBeUndefined();
  });

  it('removes the outcome and keeps the rest of the address', () => {
    expect(withoutSignInOutcome('https://example.com/2026-11-11/evening?signin=welcome#s3')).toBe(
      '/2026-11-11/evening#s3',
    );
    expect(withoutSignInOutcome('https://example.com/word?lang=tr&signin=failed')).toBe(
      '/word?lang=tr',
    );
  });

  it('starts at the API and comes back to the page', () => {
    expect(googleSignInUrl('https://api.example.com', '/word?x=1')).toBe(
      'https://api.example.com/auth/google?return=%2Fword%3Fx%3D1',
    );
  });
});

describe('avatar choices', () => {
  it('offers different designs, never the current avatar', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const choices = avatarChoices('station:junction:dusk', 7, random);
    expect(choices).toHaveLength(7);
    const designs = choices.map((code) => {
      const avatar = parseAvatar(code);
      return avatar?.kind === 'station' ? avatar.design : undefined;
    });
    expect(new Set(designs).size).toBe(7);
    expect(designs).not.toContain('junction');
    expect(designs).not.toContain(undefined);
  });

  it('falls back to a fixed avatar for an unknown code', () => {
    expect(avatarOf('nonsense')).toEqual({ kind: 'station', design: 'through', ground: 'stone' });
    expect(avatarOf('initial:night')).toEqual({ kind: 'initial', ground: 'night' });
  });
});

describe('the API client', () => {
  it('sends the sign-in cookie and JSON, and reads errors', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetcher = ((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/me/passkeys/x%2Fy')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'This is your only way to sign in.' }), {
            status: 409,
          }),
        );
      }
      if (init?.method === 'POST') return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }));
    }) as typeof fetch;
    const api = accountApi('https://api.example.com', fetcher);

    await expect(api.update({ name: 'Can' })).resolves.toEqual(profile);
    expect(calls[0]?.init).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Can"}',
    });
    await expect(api.signOut()).resolves.toBeUndefined();
    const error = await api.removePasskey('x/y').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AccountError);
    expect(error).toMatchObject({ status: 409, message: 'This is your only way to sign in.' });
  });
});

describe('account words', () => {
  it('has every word in both languages', () => {
    const en = accountWords('en');
    const tr = accountWords('tr');
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    expect(tr.passkeyName(2)).toBe('Geçiş anahtarı 2');
    expect(accountPath('tr')).toBe('/account/tr');
  });
});
