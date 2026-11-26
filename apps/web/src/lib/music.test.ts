import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  crateDays,
  editionMinutes,
  formatLength,
  loadMusic,
  readMusicFile,
  spotifyTrack,
} from './music.js';

const DATA = fileURLToPath(new URL('../../../../data/music', import.meta.url));

describe('music', () => {
  it('reads the published editions, newest first', () => {
    const editions = loadMusic(DATA);
    expect(editions.length).toBeGreaterThan(0);
    const dates = editions.map((edition) => edition.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('treats a missing directory as nothing published', () => {
    expect(loadMusic(`${DATA}/missing`)).toEqual([]);
  });

  it('rejects a file whose name does not match its date', () => {
    const [edition] = loadMusic(DATA);
    expect(() => readMusicFile('2020-01-01.json', JSON.stringify(edition))).toThrow(/file name/);
  });

  it('lists each song once in the Crate, on its latest day', () => {
    const [edition] = loadMusic(DATA);
    if (!edition) throw new Error('no edition');
    const earlier = { ...edition, date: '2026-01-01' };
    const days = crateDays([earlier, edition]);
    expect(days).toHaveLength(1);
    expect(days[0]?.date).toBe(edition.date);
    expect(days[0]?.entries).toHaveLength(15);
  });

  it('formats lengths and finds Spotify track ids', () => {
    expect(formatLength(192)).toBe('3:12');
    const [edition] = loadMusic(DATA);
    if (!edition) throw new Error('no edition');
    expect(editionMinutes(edition) % 5).toBe(0);
    // A fixed day, so a new edition does not change what this test reads.
    const first = loadMusic(DATA).find((day) => day.date === '2026-11-23');
    if (!first) throw new Error('no 23 November edition');
    const ids = first.genres.turkey.map(spotifyTrack);
    expect(ids).toContain('0MCEEI8LCEUJKi4apujvff');
  });
});
