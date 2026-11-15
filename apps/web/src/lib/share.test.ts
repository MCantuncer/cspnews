import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  languageAlternates,
  pagePath,
  SHARE_FALLBACK,
  shareImagePath,
} from './share.js';

describe('share previews', () => {
  it('gives absolute addresses on the site’s own domain', () => {
    expect(absoluteUrl('/')).toBe('https://www.cspnews.app');
    expect(absoluteUrl('/2026-11-15/morning')).toBe('https://www.cspnews.app/2026-11-15/morning');
    expect(absoluteUrl(SHARE_FALLBACK)).toBe('https://www.cspnews.app/og.png');
  });

  it('reads a built page’s path as readers use it', () => {
    expect(pagePath('/index.html')).toBe('/');
    expect(pagePath('/tr.html')).toBe('/tr');
    expect(pagePath('/2026-11-15/morning/abc.html')).toBe('/2026-11-15/morning/abc');
    expect(pagePath('/hot')).toBe('/hot');
    expect(pagePath('/tr/')).toBe('/tr');
  });

  it('links each page to itself in both languages', () => {
    expect(languageAlternates('/2026-11-15/morning/abc')).toEqual([
      { lang: 'en', href: 'https://www.cspnews.app/2026-11-15/morning/abc' },
      { lang: 'tr', href: 'https://www.cspnews.app/tr/2026-11-15/morning/abc' },
    ]);
    expect(languageAlternates('/tr')).toEqual([
      { lang: 'en', href: 'https://www.cspnews.app' },
      { lang: 'tr', href: 'https://www.cspnews.app/tr' },
    ]);
    expect(languageAlternates('/word/tr')[0]?.href).toBe('https://www.cspnews.app/word');
  });

  it('uses the plain card for an item with no saved photo', () => {
    expect(shareImagePath('no-such-photo-id')).toBe(SHARE_FALLBACK);
  });
});
