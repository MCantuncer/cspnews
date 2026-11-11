import { describe, expect, it } from 'vitest';

import { recentDays, statsOf, streakOn, type GameResult } from './progress.js';

const solved = (day: string, tries = 4): GameResult => ({ day, tries, solved: true });
const unsolved = (day: string): GameResult => ({ day, tries: 6, solved: false });

// 2026-11-09 is a Monday.
describe('streakOn', () => {
  it('counts solved days in a row', () => {
    const results = [solved('2026-11-09'), solved('2026-11-10'), solved('2026-11-11')];
    expect(streakOn(results, '2026-11-11')).toEqual({ current: 3, best: 3, restDays: [] });
  });

  it('does not break while today is still open', () => {
    const results = [solved('2026-11-09'), solved('2026-11-10')];
    expect(streakOn(results, '2026-11-11').current).toBe(2);
  });

  it('keeps the streak over one missed day in a week', () => {
    const results = [solved('2026-11-09'), solved('2026-11-11'), solved('2026-11-12')];
    expect(streakOn(results, '2026-11-12')).toEqual({
      current: 3,
      best: 3,
      restDays: ['2026-11-10'],
    });
  });

  it('treats an unsolved day like a missed one', () => {
    const results = [solved('2026-11-09'), unsolved('2026-11-10'), solved('2026-11-11')];
    expect(streakOn(results, '2026-11-11')).toEqual({
      current: 2,
      best: 2,
      restDays: ['2026-11-10'],
    });
  });

  it('ends the streak on a second missed day in the same week', () => {
    const results = [solved('2026-11-09'), solved('2026-11-11'), solved('2026-11-13')];
    expect(streakOn(results, '2026-11-13')).toEqual({
      current: 1,
      best: 2,
      restDays: ['2026-11-10'],
    });
  });

  it('gives a new rest day each Monday', () => {
    const results = [
      solved('2026-11-14'),
      // 2026-11-15 (Sunday) missed: rest day of the first week.
      // 2026-11-16 (Monday) missed: rest day of the new week.
      solved('2026-11-17'),
    ];
    expect(streakOn(results, '2026-11-17')).toEqual({
      current: 2,
      best: 2,
      restDays: ['2026-11-15', '2026-11-16'],
    });
  });

  it('ends the streak when today is the second missed day in a week', () => {
    // Monday solved, Tuesday missed (rest), Wednesday finished unsolved.
    const results = [solved('2026-11-09'), unsolved('2026-11-11')];
    expect(streakOn(results, '2026-11-11').current).toBe(0);
  });

  it('is empty with no results', () => {
    expect(streakOn([], '2026-11-11')).toEqual({ current: 0, best: 0, restDays: [] });
  });

  it('ignores results after today and counts a day once', () => {
    const results = [solved('2026-11-10'), solved('2026-11-10'), solved('2026-11-12')];
    expect(streakOn(results, '2026-11-11').current).toBe(1);
  });
});

describe('recentDays', () => {
  it('shows the week as solved, rest, missed and open days', () => {
    const results = [solved('2026-11-06'), solved('2026-11-08'), solved('2026-11-09')];
    // The window runs from Thursday 2026-11-05 to Wednesday 2026-11-11.
    expect(recentDays(results, '2026-11-11', 7).map((entry) => entry.status)).toEqual([
      'missed', // Before the streak started.
      'solved',
      'rest', // Saturday: the rest day of the week of 2 November.
      'solved',
      'solved',
      'rest', // Tuesday: the rest day of the week of 9 November.
      'open',
    ]);
  });
});

describe('statsOf', () => {
  it('counts played days, solved days and tries', () => {
    const stats = statsOf([
      solved('2026-11-09', 3),
      solved('2026-11-10', 3),
      unsolved('2026-11-11'),
    ]);
    expect(stats).toEqual({ played: 3, solved: 2, byTries: [0, 0, 2, 0, 0, 0] });
  });
});
