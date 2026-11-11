/**
 * Game days and the day's word.
 *
 * A game day is an Istanbul calendar date, `YYYY-MM-DD`. A new word starts at 00:00 Istanbul time
 * for everyone. Puzzle 1 is played on the language's first day; each later day is the next puzzle.
 *
 * Each language's answer list is kept in play order: entry 1 is puzzle 1. New words are appended,
 * and a word that has to go is replaced in place, so a published day never changes its word.
 */
import { istanbulDateOf } from '@cspnews/core';

import { seededRandom } from './random.js';

/** An Istanbul calendar date, `YYYY-MM-DD`. */
export type GameDay = string;

const MS_PER_DAY = 86_400_000;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The game day at `now`. */
export function gameDayAt(now: Date): GameDay {
  const { year, month, day } = istanbulDateOf(now);
  return formatDay(Date.UTC(year, month - 1, day));
}

function formatDay(utcMidnight: number): GameDay {
  return new Date(utcMidnight).toISOString().slice(0, 10);
}

function parseDay(day: GameDay): number {
  const match = DAY_PATTERN.exec(day);
  if (!match) throw new Error(`"${day}" is not a game day (YYYY-MM-DD).`);
  const [, year, month, date] = match.map(Number);
  const utc = Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1);
  if (formatDay(utc) !== day) throw new Error(`"${day}" is not a real date.`);
  return utc;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: GameDay, to: GameDay): number {
  return Math.round((parseDay(to) - parseDay(from)) / MS_PER_DAY);
}

/** The game day `count` days after `day` (or before, when negative). */
export function addDays(day: GameDay, count: number): GameDay {
  return formatDay(parseDay(day) + count * MS_PER_DAY);
}

/** Monday of the Monday-to-Sunday week that `day` falls in. */
export function weekStartOf(day: GameDay): GameDay {
  const weekday = new Date(parseDay(day)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** The puzzle number on `day`, starting at 1 on `firstDay`. Undefined before the first day. */
export function puzzleNumber(day: GameDay, firstDay: GameDay): number | undefined {
  const offset = daysBetween(firstDay, day);
  return offset < 0 ? undefined : offset + 1;
}

/** The answer on `day`, or undefined when the day is before the first day or past the list. */
export function answerOn(
  answers: readonly string[],
  day: GameDay,
  firstDay: GameDay,
): string | undefined {
  const number = puzzleNumber(day, firstDay);
  return number === undefined ? undefined : answers[number - 1];
}

/** How many days of answers are left after `day`, counting `day` itself. */
export function daysLeft(answers: readonly string[], day: GameDay, firstDay: GameDay): number {
  const number = puzzleNumber(day, firstDay) ?? 1;
  return Math.max(0, answers.length - number + 1);
}

/**
 * A fixed shuffle: the same words and seed always give the same order. Used once, to put a new
 * batch of hand-checked words into play order.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = seededRandom(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}
