/**
 * Which songs play on which day. A game day is an Istanbul date (`YYYY-MM-DD`); the set changes
 * at 00:00 Istanbul time for everyone, like the daily word.
 *
 * Each genre's songs (data/songs/<genre>.json) are kept in play order: entry 1 plays on the
 * first day. New songs are appended and a song that has to go is replaced in place, so a played
 * day keeps its song. Should a list ever run out, it starts over from the top.
 */
import { puzzleNumber, type GameDay } from '@cspnews/wordgame';

import type { Genre } from './rounds.js';
import type { SongName } from './names.js';

/** Set 1 is played on this day, the day the game opened. Never change it. */
export const FIRST_DAY: GameDay = '2026-11-27';

/** CI warns when fewer days than this are left in a genre before it would start over. */
export const MIN_DAYS_LEFT = 60;

/** One song of the pool, as data/songs/<genre>.json keeps it. */
export interface PoolSong extends SongName {
  /** The line in data/picks/<genre>.txt it was found from. */
  readonly pick: string;
  readonly year?: number;
  /** Apple's track id, its 30-second preview, store page and cover. */
  readonly apple: string;
  readonly preview: string;
  readonly link: string;
  readonly artwork: string;
  /** Seconds into the preview where the clips start: past the fade-in, at full sound. */
  readonly start: number;
  readonly previewSeconds: number;
}

/** The set number on `day`, from 1; undefined before the first day. */
export const setNumber = (day: GameDay): number | undefined => puzzleNumber(day, FIRST_DAY);

/** The song of one genre on `day`. */
export function songOn<T>(songs: readonly T[], day: GameDay): T | undefined {
  const number = setNumber(day);
  if (number === undefined || songs.length === 0) return undefined;
  return songs[(number - 1) % songs.length];
}

/** Days of songs left in a list from `day` on, counting `day`, before it would start over. */
export function songDaysLeft(songs: readonly unknown[], day: GameDay): number {
  return Math.max(0, songs.length - (setNumber(day) ?? 1) + 1);
}

export type DaySet = Readonly<Record<Genre, PoolSong>>;
