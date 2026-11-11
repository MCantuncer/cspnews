import { describe, expect, it } from 'vitest';

import { hideWord, revealWord } from './hide.js';

describe('hideWord and revealWord', () => {
  it('give back the same word, Turkish letters included', () => {
    for (const [word, language] of [
      ['SHORE', 'en'],
      ['ŞEHİR', 'tr'],
      ['IĞDIR', 'tr'],
    ] as const) {
      const hidden = hideWord(word, '2026-11-23', language);
      expect(hidden).toMatch(/^[0-9a-f]{20}$/);
      expect(hidden).not.toContain(word.toLowerCase());
      expect(revealWord(hidden, '2026-11-23', language)).toBe(word);
    }
  });

  it('scramble the same word differently on each day and language', () => {
    const monday = hideWord('SHORE', '2026-11-23', 'en');
    expect(hideWord('SHORE', '2026-11-24', 'en')).not.toBe(monday);
    expect(hideWord('SHORE', '2026-11-23', 'tr')).not.toBe(monday);
  });

  it('reject text that is not a scrambled word', () => {
    expect(revealWord('', '2026-11-23', 'en')).toBeUndefined();
    expect(revealWord('zzzz', '2026-11-23', 'en')).toBeUndefined();
    expect(revealWord('12345', '2026-11-23', 'en')).toBeUndefined();
  });
});
