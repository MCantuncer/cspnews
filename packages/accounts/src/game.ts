/**
 * Word game results saved to an account.
 *
 * Each finished day is one row: the language, the Istanbul date, the number of tries and whether
 * the word was found. Streaks and stats are worked out from these rows by the game's own code, so
 * two devices can never disagree. A day's result can't change once it is saved.
 */
import { istanbulDateOf } from '@cspnews/core';
import { z } from 'zod';

/** Tries a reader has for one word. */
export const MAX_TRIES = 6;

export const GAME_LANGUAGES = ['en', 'tr'] as const;
export type GameLanguage = (typeof GAME_LANGUAGES)[number];

/** An Istanbul calendar date, `YYYY-MM-DD`. */
export type GameDay = string;

export interface GameResult {
  readonly day: GameDay;
  readonly tries: number;
  readonly solved: boolean;
}

/** The Istanbul date at `now`, as a game day. A new word starts at 00:00 Istanbul time. */
export function gameDayAt(now: Date): GameDay {
  const { year, month, day } = istanbulDateOf(now);
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const GameDaySchema = z.iso.date();

/** One finished day, as the browser sends it. */
export const GameResultSchema = z
  .object({
    day: GameDaySchema,
    tries: z.number().int().min(1).max(MAX_TRIES),
    solved: z.boolean(),
  })
  .strict()
  .refine((result) => result.solved || result.tries === MAX_TRIES, {
    message: `An unsolved day uses all ${String(MAX_TRIES)} tries.`,
    path: ['tries'],
  });

/** The browser's history, sent once on first sign-in. A year of days is plenty. */
export const GameImportSchema = z.object({ results: z.array(GameResultSchema).max(400) }).strict();

/**
 * Why a result can't be saved, or undefined when it can. Only days that have started in Istanbul
 * count, so nobody can save tomorrow's word; `firstDay` is the game's first puzzle.
 */
export function rejectReason(
  result: GameResult,
  now: Date,
  firstDay: GameDay,
): 'future-day' | 'before-first-day' | undefined {
  if (result.day > gameDayAt(now)) return 'future-day';
  if (result.day < firstDay) return 'before-first-day';
  return undefined;
}

export interface MergeOutcome {
  /** New days to save. */
  readonly added: readonly GameResult[];
  /** Days already saved with a different result. The saved result stays. */
  readonly conflicts: readonly GameDay[];
}

/**
 * Merges results from a browser into the saved ones. A saved day always wins; sending the same
 * result again is fine. When `incoming` lists a day twice, the first one counts.
 */
export function mergeResults(
  saved: readonly GameResult[],
  incoming: readonly GameResult[],
): MergeOutcome {
  const known = new Map(saved.map((result) => [result.day, result]));
  const added: GameResult[] = [];
  const conflicts: GameDay[] = [];

  for (const result of incoming) {
    const existing = known.get(result.day);
    if (!existing) {
      known.set(result.day, result);
      added.push(result);
    } else if (existing.tries !== result.tries || existing.solved !== result.solved) {
      conflicts.push(result.day);
    }
  }

  return { added, conflicts };
}
