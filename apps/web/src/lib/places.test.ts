import { describe, expect, it } from 'vitest';

import { currentPlace, placeLinks } from './places.js';

describe('places', () => {
  it('knows which place a page belongs to', () => {
    expect(currentPlace('/')).toBe('news');
    expect(currentPlace('/tr')).toBe('news');
    expect(currentPlace('/2026-11-23/late')).toBe('news');
    expect(currentPlace('/music')).toBe('music');
    expect(currentPlace('/tr/music/crate')).toBe('music');
    expect(currentPlace('/tr/music.html')).toBe('music');
    expect(currentPlace('/word')).toBe('word');
    expect(currentPlace('/word/tr')).toBe('word');
    expect(currentPlace('/song')).toBe('word');
    expect(currentPlace('/tr/song')).toBe('word');
    expect(currentPlace('/tr/settings')).toBe('news');
  });

  it('links each place in the reader language', () => {
    expect(placeLinks('tr').map((place) => place.href)).toEqual(['/tr', '/tr/music', '/word/tr']);
    expect(placeLinks('en').map((place) => place.label)).toEqual(['News', 'Music', 'Games']);
  });
});
