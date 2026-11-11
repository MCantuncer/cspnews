import { describe, expect, it } from 'vitest';

import { languagePath, localePath } from './locale.js';

describe('localePath', () => {
  it('puts Turkish pages under /tr', () => {
    expect(localePath('/', 'tr')).toBe('/tr');
    expect(localePath('/settings', 'tr')).toBe('/tr/settings');
    expect(localePath('/settings', 'en')).toBe('/settings');
  });
});

describe('languagePath', () => {
  it('moves prefixed pages between the two sides', () => {
    expect(languagePath('/2026-11-11/evening', 'tr')).toBe('/tr/2026-11-11/evening');
    expect(languagePath('/tr/2026-11-11/evening', 'en')).toBe('/2026-11-11/evening');
    expect(languagePath('/tr', 'en')).toBe('/');
    expect(languagePath('/', 'tr')).toBe('/tr');
    expect(languagePath('/tr/settings', 'tr')).toBe('/tr/settings');
  });

  it('keeps the /tr suffix on the word game, account and privacy pages', () => {
    expect(languagePath('/word', 'tr')).toBe('/word/tr');
    expect(languagePath('/word/tr', 'en')).toBe('/word');
    expect(languagePath('/account/tr', 'tr')).toBe('/account/tr');
    expect(languagePath('/privacy', 'en')).toBe('/privacy');
  });
});
