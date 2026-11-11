/**
 * A reader's streak and stats, worked out from their finished days.
 *
 * The streak counts solved days in a row. One rest day per Monday-to-Sunday week keeps it alive: the
 * first day in a week that is missed or not solved is a rest day, and the streak carries on. A
 * second such day in the same week ends it. Today never breaks the streak while it is still open.
 *
 * Results come from the browser or, for signed-in readers, from their account. The same code runs
 * in both places, so two devices can never disagree.
 */
import { addDays, weekStartOf, type GameDay } from './day.js';
import { MAX_TRIES } from './language.js';

export interface GameResult {
  readonly day: GameDay;
  /** Tries used, 1 to 6. An unsolved day used all 6. */
  readonly tries: number;
  readonly solved: boolean;
}

export type DayStatus = 'solved' | 'rest' | 'missed' | 'unsolved' | 'open';

export interface Streak {
  readonly current: number;
  readonly best: number;
  /** Days that were covered by the weekly rest day. */
  readonly restDays: readonly GameDay[];
}

/** The streak on `today`, from all finished days. */
export function streakOn(results: readonly GameResult[], today: GameDay): Streak {
  const byDay = indexByDay(results);
  const days = [...byDay.keys()].filter((day) => day <= today).sort();
  const first = days[0];
  if (first === undefined) return { current: 0, best: 0, restDays: [] };

  let current = 0;
  let best = 0;
  const restDays: GameDay[] = [];
  const restWeeks = new Set<GameDay>();

  for (let day = first; day <= today; day = addDays(day, 1)) {
    const result = byDay.get(day);
    if (result?.solved) {
      current += 1;
      best = Math.max(best, current);
      continue;
    }
    if (day === today && result === undefined) continue; // Still open.
    if (current === 0) continue;

    const week = weekStartOf(day);
    if (restWeeks.has(week)) {
      current = 0;
      restWeeks.clear();
    } else {
      restWeeks.add(week);
      restDays.push(day);
    }
  }

  return { current, best, restDays };
}

/** What happened on each of the `count` days up to and including `today`, oldest first. */
export function recentDays(
  results: readonly GameResult[],
  today: GameDay,
  count = 7,
): { readonly day: GameDay; readonly status: DayStatus }[] {
  const byDay = indexByDay(results);
  const rest = new Set(streakOn(results, today).restDays);
  return Array.from({ length: count }, (_, index) => {
    const day = addDays(today, index - count + 1);
    const result = byDay.get(day);
    let status: DayStatus;
    if (result?.solved) status = 'solved';
    else if (rest.has(day)) status = 'rest';
    else if (result) status = 'unsolved';
    else status = day === today ? 'open' : 'missed';
    return { day, status };
  });
}

export interface Stats {
  readonly played: number;
  readonly solved: number;
  /** Solved days by tries used: index 0 is one try. */
  readonly byTries: readonly number[];
}

/** Totals over every finished day. */
export function statsOf(results: readonly GameResult[]): Stats {
  const byTries = Array.from({ length: MAX_TRIES }, () => 0);
  const unique = [...indexByDay(results).values()];
  for (const result of unique) {
    if (result.solved && result.tries >= 1 && result.tries <= MAX_TRIES) {
      byTries[result.tries - 1] = (byTries[result.tries - 1] ?? 0) + 1;
    }
  }
  return {
    played: unique.length,
    solved: unique.filter((result) => result.solved).length,
    byTries,
  };
}

/** One result per day; when a day appears twice, the first one counts. */
function indexByDay(results: readonly GameResult[]): Map<GameDay, GameResult> {
  const byDay = new Map<GameDay, GameResult>();
  for (const result of results) {
    if (!byDay.has(result.day)) byDay.set(result.day, result);
  }
  return byDay;
}
