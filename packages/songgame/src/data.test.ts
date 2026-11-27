import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CLIP_SECONDS, GENRES, type PoolSong } from './index.js';

const folder = resolve(import.meta.dirname, '../data/songs');
const longest = CLIP_SECONDS[CLIP_SECONDS.length - 1] ?? 16;

describe.each(GENRES)('the %s songs', (genre) => {
  const file = resolve(folder, `${genre}.json`);
  const songs: PoolSong[] = existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as PoolSong[])
    : [];

  it.runIf(songs.length > 0)('each have a preview and room for the longest clip', () => {
    for (const song of songs) {
      expect(song.preview, song.pick).toMatch(/^https:\/\//);
      expect(song.start, song.pick).toBeGreaterThanOrEqual(0);
      expect(song.start + longest, song.pick).toBeLessThanOrEqual(song.previewSeconds);
    }
  });

  it.runIf(songs.length > 0)('never repeat', () => {
    const picks = songs.map((song) => song.pick);
    expect(new Set(picks).size).toBe(picks.length);
  });
});
