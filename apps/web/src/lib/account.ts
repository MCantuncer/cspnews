/**
 * Reader accounts on the site: talking to the accounts API (apps/api) from the browser.
 *
 * The site stays static. A signed-out reader never calls the API: the browser only asks for the
 * profile when the readable `cspn_signed_in` hint cookie is there, and keeps the answer for an
 * hour. Sign-in itself happens on the API's own pages (Google) or through a passkey prompt.
 */
import {
  AVATAR_DESIGNS,
  AVATAR_GROUNDS,
  formatAvatar,
  parseAvatar,
} from '@cspnews/accounts/avatar';
import type { Avatar, AvatarDesignId, AvatarGround } from '@cspnews/accounts/avatar';

/** The accounts API address, such as https://api.example.com. Unset means accounts are off. */
export function apiBase(): string | undefined {
  // Read through a plain type, so linting doesn't depend on Astro's generated env types.
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const value = env?.PUBLIC_CSPNEWS_API;
  return typeof value === 'string' && value !== '' ? value.replace(/\/+$/, '') : undefined;
}

/** The profile as the API sends it. */
export interface Profile {
  readonly id: string;
  readonly name: string | null;
  readonly avatar: string;
  readonly settings: { readonly lang: 'en' | 'tr'; readonly theme: 'dark' | 'light' };
  readonly signInMethods: readonly ('google' | 'passkey')[];
}

export interface PasskeyInfo {
  readonly id: string;
  readonly backedUp: boolean;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

/** Whether the readable hint cookie says this browser is signed in. */
export function hasSignInHint(cookie: string): boolean {
  return cookie.split(';').some((part) => part.trim() === 'cspn_signed_in=1');
}

/** How long a saved profile is used before it is asked for again. */
export const PROFILE_MAX_AGE_MS = 60 * 60 * 1000;

const PROFILE_KEY = 'cspnews:profile';

interface SavedProfile {
  readonly profile: Profile;
  readonly savedAt: number;
}

/** The saved profile, if there is one and it is still fresh at `now`. */
export function readSavedProfile(storage: Storage | undefined, now: number): Profile | undefined {
  try {
    const raw = storage?.getItem(PROFILE_KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Partial<SavedProfile>;
    if (typeof saved.savedAt !== 'number' || !isProfile(saved.profile)) return undefined;
    if (now - saved.savedAt > PROFILE_MAX_AGE_MS || now < saved.savedAt) return undefined;
    return saved.profile;
  } catch {
    return undefined;
  }
}

export function saveProfile(storage: Storage | undefined, profile: Profile | null, now: number) {
  try {
    if (profile) storage?.setItem(PROFILE_KEY, JSON.stringify({ profile, savedAt: now }));
    else storage?.removeItem(PROFILE_KEY);
  } catch {
    // Storage can be unavailable (private mode). The profile is then asked for on each page.
  }
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.avatar === 'string' &&
    (p.name === null || typeof p.name === 'string') &&
    typeof p.settings === 'object' &&
    Array.isArray(p.signInMethods)
  );
}

/** What a Google sign-in came back with, from the `?signin=` the API adds to the page address. */
export type SignInOutcome = 'welcome' | 'linked' | 'cancelled' | 'in-use' | 'failed';

export function signInOutcome(search: string): SignInOutcome | undefined {
  const value = new URLSearchParams(search).get('signin');
  const outcomes: readonly string[] = ['welcome', 'linked', 'cancelled', 'in-use', 'failed'];
  return value !== null && outcomes.includes(value) ? (value as SignInOutcome) : undefined;
}

/** The page address without `?signin=`, to put back in the address bar once it is handled. */
export function withoutSignInOutcome(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('signin');
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Where Google sign-in starts, coming back to `returnPath` afterwards. */
export function googleSignInUrl(base: string, returnPath: string): string {
  return `${base}/auth/google?return=${encodeURIComponent(returnPath)}`;
}

/**
 * Avatars to offer next to the current one: `count` station avatars, all different from it and
 * from each other, in a spread of grounds. `random` works like Math.random.
 */
export function avatarChoices(current: string, count: number, random: () => number): string[] {
  const designs = Object.keys(AVATAR_DESIGNS) as AvatarDesignId[];
  const grounds = Object.keys(AVATAR_GROUNDS) as AvatarGround[];
  const all: string[] = [];
  for (const design of designs) {
    for (const ground of grounds) all.push(formatAvatar({ kind: 'station', design, ground }));
  }
  const usedDesigns = new Set<string>();
  const currentAvatar = parseAvatar(current);
  if (currentAvatar?.kind === 'station') usedDesigns.add(currentAvatar.design);
  const picks: string[] = [];
  // Shuffle, then take one avatar per design so the choices look different from each other.
  const shuffled = all
    .map((code) => ({ code, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ code }) => code);
  for (const code of shuffled) {
    if (picks.length >= count) break;
    const design = code.split(':')[1] ?? '';
    if (code === current || usedDesigns.has(design)) continue;
    usedDesigns.add(design);
    picks.push(code);
  }
  return picks;
}

/** Reads an avatar code from the API, falling back to a fixed avatar if it is unknown. */
export function avatarOf(code: string): Avatar {
  return parseAvatar(code) ?? { kind: 'station', design: 'through', ground: 'stone' };
}

/** Errors the API returns as `{ error }` with a status. */
export class AccountError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

/** The accounts API, from the browser. Every call sends the sign-in cookie. */
export function accountApi(base: string, fetcher: typeof fetch = fetch.bind(globalThis)) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetcher(`${base}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 204) return undefined as T;
    const data = (await response.json().catch(() => ({}))) as { error?: unknown };
    if (!response.ok) {
      const message = typeof data.error === 'string' ? data.error : 'Something went wrong.';
      throw new AccountError(response.status, message);
    }
    return data as T;
  }

  return {
    me: () => call<Profile>('GET', '/me'),
    update: (patch: {
      name?: string | null;
      avatar?: string;
      settings?: Partial<Profile['settings']>;
    }) => call<Profile>('PATCH', '/me', patch),
    exportData: () => call<unknown>('GET', '/me/export'),
    deleteAccount: () => call<undefined>('DELETE', '/me'),
    signOut: () => call<undefined>('POST', '/auth/signout', {}),
    passkeys: () => call<PasskeyInfo[]>('GET', '/me/passkeys'),
    removePasskey: (id: string) =>
      call<undefined>('DELETE', `/me/passkeys/${encodeURIComponent(id)}`),
    registerOptions: () => call<unknown>('POST', '/auth/passkey/register/options'),
    registerVerify: (response: unknown) =>
      call<{ result: 'welcome' | 'added' }>('POST', '/auth/passkey/register/verify', response),
    loginOptions: () => call<unknown>('POST', '/auth/passkey/login/options'),
    loginVerify: (response: unknown) =>
      call<{ result: 'signed-in' }>('POST', '/auth/passkey/login/verify', response),
  };
}

export type AccountApi = ReturnType<typeof accountApi>;
