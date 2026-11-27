import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  GENRES,
  hideText,
  setNumber,
  songOn,
  type Genre,
  type PoolSong,
  type SongName,
} from '@cspnews/songgame';
import type { GameDay } from '@cspnews/wordgame';

import type { RevealedSong, WindowSet } from './song';
import { windowDays } from './word';

/**
 * The song pool, read at build time from packages/songgame/data/songs (or CSPNEWS_SONGS). Only a few days of songs
 * leave the build, each answer scrambled; the full pool never reaches the browser.
 */
const dataFile = (name: string) =>
  resolve(
    process.env.CSPNEWS_SONGS ?? resolve(process.cwd(), '../../packages/songgame/data/songs'),
    name,
  );

function readPool(genre: Genre): PoolSong[] {
  try {
    return JSON.parse(readFileSync(dataFile(`${genre}.json`), 'utf8')) as PoolSong[];
  } catch {
    return [];
  }
}

/** Yesterday's set up to the end of the window (the same days the word game ships). */
export function songWindow(today: GameDay): WindowSet[] {
  const pools = GENRES.map((genre) => [genre, readPool(genre)] as const);
  return windowDays(today).flatMap((day) => {
    const number = setNumber(day);
    const songs = pools.flatMap(([genre, pool]) => {
      const song = songOn(pool, day);
      if (!song) return [];
      const revealed: RevealedSong = {
        artist: song.artist,
        title: song.title,
        ...(song.year ? { year: song.year } : {}),
        artwork: song.artwork,
        link: song.link,
      };
      return [
        {
          genre,
          preview: song.preview,
          start: song.start,
          answer: hideText(JSON.stringify(revealed), day, genre),
        },
      ];
    });
    return number && songs.length === GENRES.length ? [{ day, number, songs }] : [];
  });
}

/** Every name the guess box offers, as compact [artist, title] pairs. */
export function songCatalog(): [string, string][] {
  try {
    const catalog = JSON.parse(readFileSync(dataFile('catalog.json'), 'utf8')) as SongName[];
    return catalog.map((song) => [song.artist, song.title]);
  } catch {
    return [];
  }
}
