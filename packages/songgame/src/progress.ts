/**
 * The reader's finished days, kept in the browser, and what the stats sheet shows from them.
 * A streak counts days in a row with all three rounds played, whatever the score.
 */
import { addDays, type GameDay } from '@cspnews/wordgame';

import { stepOf, totalPoints, type Round } from './rounds.js';

export interface FinishedDay {
  readonly day: GameDay;
  readonly rounds: readonly Round[];
}

export interface SongStats {
  readonly played: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly bestPoints: number;
  readonly averagePoints: number;
  /** Songs named on each try (index 0 = the 0.1 s clip), and songs not named. */
  readonly namedOn: readonly number[];
  readonly missed: number;
}

export function songStats(days: readonly FinishedDay[], today: GameDay, tries: number): SongStats {
  const played = new Set(days.map((entry) => entry.day));
  // A streak still counts while today is unplayed.
  let cursor = played.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (played.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...played].sort();
  let bestStreak = 0;
  let run = 0;
  sorted.forEach((day, index) => {
    run = index > 0 && addDays(sorted[index - 1] ?? day, 1) === day ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });
  const points = days.map((entry) => totalPoints(entry.rounds));
  const namedOn = Array.from({ length: tries }, () => 0);
  let missed = 0;
  for (const round of days.flatMap((entry) => entry.rounds)) {
    if (round.solvedOn === undefined) missed += 1;
    else namedOn[stepOf(round.solvedOn)] = (namedOn[stepOf(round.solvedOn)] ?? 0) + 1;
  }
  return {
    played: played.size,
    streak,
    bestStreak,
    bestPoints: points.length ? Math.max(...points) : 0,
    averagePoints: points.length
      ? Math.round(points.reduce((sum, value) => sum + value, 0) / points.length)
      : 0,
    namedOn,
    missed,
  };
}
