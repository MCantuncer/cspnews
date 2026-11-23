import { describe, expect, it } from 'vitest';

import { canonKey } from './canon.js';
import { TECHNO_MAX_BPM } from './edition.js';
import { problemsIn, readCanon, readEditions, readTaste } from './files.js';

const published = new URL('../../../data/music/', import.meta.url).pathname;

describe('music data in the repository', () => {
  it('has a valid all-time list with no song twice and no techno over the cap', () => {
    const canon = readCanon();
    expect(canon.length).toBeGreaterThan(0);
    for (const entry of canon) {
      if (entry.bpm !== undefined)
        expect(entry.bpm, canonKey(entry)).toBeLessThanOrEqual(TECHNO_MAX_BPM);
    }
  });

  it('has a valid taste profile', () => {
    expect(readTaste().genres.turkey.favouriteArtists).toContain('Wegh');
  });

  it('passes every published edition', () => {
    expect(problemsIn(readEditions(published), readCanon())).toEqual([]);
  });
});
