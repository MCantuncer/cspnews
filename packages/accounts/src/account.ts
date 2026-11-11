/**
 * The reader account: ids, the optional name, and sign-in tokens.
 *
 * We keep as little as we can. An account has a random id, the ways it signs in (a Google account
 * number or passkeys), an optional name only the reader sees, an avatar and settings. No email,
 * no password.
 */
import { z } from 'zod';

import { formatAvatar, parseAvatar } from './avatar.js';
import type { Avatar } from './avatar.js';

/** How long a sign-in lasts without a visit. Each visit pushes the expiry out again. */
export const SESSION_DAYS = 90;

/** The longest name we keep, in characters. */
export const MAX_NAME_LENGTH = 40;

export type InterfaceLanguage = 'en' | 'tr';
export type Theme = 'dark' | 'light';

export interface ReaderSettings {
  readonly lang: InterfaceLanguage;
  readonly theme: Theme;
}

export const DEFAULT_SETTINGS: ReaderSettings = { lang: 'en', theme: 'dark' };

/** The ways an account can sign in. */
export type SignInMethod = 'google' | 'passkey';

/** An account as the reader sees it on their account page. */
export interface ReaderProfile {
  readonly id: string;
  readonly name: string | null;
  readonly avatar: Avatar;
  readonly settings: ReaderSettings;
  readonly signInMethods: readonly SignInMethod[];
}

/**
 * Tidies a name the reader typed: trims it, joins runs of spaces, and drops control and
 * formatting characters. An empty result means "no name".
 */
export function normalizeName(input: string): string | null {
  const cleaned = input
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return cleaned === '' ? null : cleaned;
}

const NameSchema = z
  .string()
  .transform(normalizeName)
  .refine((name) => name === null || characterCount(name) <= MAX_NAME_LENGTH, {
    message: `A name can be at most ${String(MAX_NAME_LENGTH)} characters.`,
  });

const AvatarCodeSchema = z.string().transform((code, ctx) => {
  const avatar = parseAvatar(code);
  if (!avatar) {
    ctx.addIssue({ code: 'custom', message: 'Unknown avatar.' });
    return z.NEVER;
  }
  return avatar;
});

/** A change the reader makes on their account page. Every field is optional. */
export const ProfilePatchSchema = z
  .object({
    name: z.union([NameSchema, z.null()]).optional(),
    avatar: AvatarCodeSchema.optional(),
    settings: z
      .object({
        lang: z.enum(['en', 'tr']).optional(),
        theme: z.enum(['dark', 'light']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ProfilePatch = z.output<typeof ProfilePatchSchema>;

/** The profile as JSON for the browser: the avatar goes out in its stored form. */
export function profileToJson(profile: ReaderProfile) {
  return { ...profile, avatar: formatAvatar(profile.avatar) };
}

/** A new account id: 16 random bytes, base64url. Ids carry no meaning and reveal nothing. */
export function newAccountId(): string {
  return base64url(randomBytes(16));
}

/**
 * A new sign-in token for the cookie: 32 random bytes, base64url. Only its hash is stored, so a
 * copy of the database can't sign anyone in.
 */
export function newSessionToken(): string {
  return base64url(randomBytes(32));
}

/** The stored form of a sign-in token: SHA-256, hex. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** When a sign-in made or refreshed at `now` expires. */
export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

/** Characters as a reader counts them: an emoji or an accented letter is one. */
function characterCount(text: string): number {
  return [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].length;
}

function randomBytes(count: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(count));
}

function base64url(bytes: Uint8Array): string {
  // btoa exists in browsers, Node and Workers alike, so this file runs anywhere.
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
