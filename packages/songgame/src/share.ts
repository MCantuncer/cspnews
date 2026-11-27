/**
 * The result a reader sends a friend: the day and the try each song was named on, in the link
 * (`/song?vs=20261127-13x2`). The friend's page reads it, plays the same day's set and shows both
 * scores side by side. Nothing is stored anywhere else.
 */
import type { GameDay } from '@cspnews/wordgame';

import { GENRES, MAX_TRIES, POINTS, type Round } from './rounds.js';

export interface SharedResult {
  readonly day: GameDay;
  /** Per genre, the 1-based try the song was named on, or undefined when it was not. */
  readonly tries: readonly (number | undefined)[];
  readonly points: number;
}

/** The `vs` value for a finished day: `YYYYMMDD-` and one character per round (1–6, or x). */
export function shareCode(day: GameDay, rounds: readonly Round[]): string {
  const tries = rounds
    .map((round) =>
      round.solvedOn === undefined ? 'x' : String(Math.min(round.solvedOn, MAX_TRIES - 1) + 1),
    )
    .join('');
  return `${day.replaceAll('-', '')}-${tries}`;
}

/** The result in a `vs` value, or undefined when the value is not one. */
export function readShareCode(code: string | null | undefined): SharedResult | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})-([1-9x]+)$/i.exec(code?.trim() ?? '');
  if (!match) return undefined;
  const [, year, month, date, marks = ''] = match;
  if (marks.length !== GENRES.length) return undefined;
  const tries = Array.from(marks.toLowerCase(), (mark) =>
    mark === 'x' ? undefined : Number(mark),
  );
  if (tries.some((value) => value !== undefined && value > MAX_TRIES)) return undefined;
  const points = tries.reduce<number>(
    (sum, value) => sum + (value === undefined ? 0 : (POINTS[value - 1] ?? 0)),
    0,
  );
  return { day: `${year ?? ''}-${month ?? ''}-${date ?? ''}`, tries, points };
}
