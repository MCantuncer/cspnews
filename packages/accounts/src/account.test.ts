import { describe, expect, it } from 'vitest';

import {
  MAX_NAME_LENGTH,
  ProfilePatchSchema,
  hashSessionToken,
  newAccountId,
  newSessionToken,
  normalizeName,
  sessionExpiry,
} from './account.js';

describe('normalizeName', () => {
  it('trims and joins spaces', () => {
    expect(normalizeName('  Can   Tuncer ')).toBe('Can Tuncer');
  });

  it('drops control and invisible formatting characters', () => {
    expect(normalizeName('Can\u0000‮ Ece​')).toBe('Can Ece');
  });

  it('treats an empty name as no name', () => {
    expect(normalizeName('   ')).toBeNull();
  });
});

describe('ProfilePatchSchema', () => {
  it('accepts a name, an avatar and settings', () => {
    const patch = ProfilePatchSchema.parse({
      name: ' Can ',
      avatar: 'station:loop:night',
      settings: { lang: 'tr' },
    });
    expect(patch).toEqual({
      name: 'Can',
      avatar: { kind: 'station', design: 'loop', ground: 'night' },
      settings: { lang: 'tr' },
    });
  });

  it('clears the name with null or blanks', () => {
    expect(ProfilePatchSchema.parse({ name: null }).name).toBeNull();
    expect(ProfilePatchSchema.parse({ name: '  ' }).name).toBeNull();
  });

  it('counts characters, not bytes, for the length limit', () => {
    expect(ProfilePatchSchema.safeParse({ name: 'ş'.repeat(MAX_NAME_LENGTH) }).success).toBe(true);
    expect(ProfilePatchSchema.safeParse({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it('refuses unknown avatars and unknown fields', () => {
    expect(ProfilePatchSchema.safeParse({ avatar: 'photo:me' }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ email: 'a@b.c' }).success).toBe(false);
    expect(ProfilePatchSchema.safeParse({ settings: { font: 'big' } }).success).toBe(false);
  });
});

describe('ids and tokens', () => {
  it('makes url-safe random ids and tokens of the right length', () => {
    expect(newAccountId()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(newSessionToken());
  });

  it('stores tokens as SHA-256 hex', async () => {
    expect(await hashSessionToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('keeps a sign-in for 90 days', () => {
    expect(sessionExpiry(new Date('2026-11-11T12:00:00Z')).toISOString()).toBe(
      '2027-02-09T12:00:00.000Z',
    );
  });
});
