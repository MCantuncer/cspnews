import { describe, expect, it } from 'vitest';

import { localePath, otherLanguagePath } from './locale.js';
import { isTextSize, isTheme, stepTextSize } from './settings.js';

describe('stepTextSize', () => {
  it('moves one step and stops at the ends', () => {
    expect(stepTextSize('default', 1)).toBe('large');
    expect(stepTextSize('default', -1)).toBe('small');
    expect(stepTextSize('small', -1)).toBe('small');
    expect(stepTextSize('larger', 1)).toBe('larger');
  });

  it('only accepts known values from storage', () => {
    expect(isTextSize('large')).toBe(true);
    expect(isTextSize('huge')).toBe(false);
    expect(isTheme('device')).toBe(true);
    expect(isTheme(null)).toBe(false);
  });
});

describe('locale paths', () => {
  it('puts the Turkish interface under /tr', () => {
    expect(localePath('/', 'tr')).toBe('/tr');
    expect(localePath('/settings', 'tr')).toBe('/tr/settings');
    expect(localePath('/settings', 'en')).toBe('/settings');
  });

  it('switches a path to the other language', () => {
    expect(otherLanguagePath('/2026-11-11/evening')).toBe('/tr/2026-11-11/evening');
    expect(otherLanguagePath('/tr/2026-11-11/evening')).toBe('/2026-11-11/evening');
    expect(otherLanguagePath('/tr')).toBe('/');
    expect(otherLanguagePath('/')).toBe('/tr');
  });
});
