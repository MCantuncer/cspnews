import { describe, expect, it } from 'vitest';

import { articleIdFor, canonicalUrl } from './url.js';

describe('canonicalUrl', () => {
  it('removes tracking parameters and the fragment, keeps real parameters', () => {
    expect(canonicalUrl('https://Example.com/a?id=7&utm_source=rss&fbclid=x#top')).toBe(
      'https://example.com/a?id=7',
    );
  });

  it('rejects non-web and malformed URLs', () => {
    expect(canonicalUrl('javascript:alert(1)')).toBeUndefined();
    expect(canonicalUrl('not a url')).toBeUndefined();
  });
});

describe('articleIdFor', () => {
  it('is stable and 16 hex characters', () => {
    const id = articleIdFor('https://example.com/a');
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(articleIdFor('https://example.com/a')).toBe(id);
  });
});
