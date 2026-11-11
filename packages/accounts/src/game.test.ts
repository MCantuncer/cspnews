import { describe, expect, it } from 'vitest';

import {
  GameImportSchema,
  GameResultSchema,
  gameDayAt,
  mergeResults,
  rejectReason,
} from './game.js';

describe('gameDayAt', () => {
  it('uses the Istanbul date, so the word changes at 00:00 Istanbul time', () => {
    expect(gameDayAt(new Date('2026-11-10T20:59:59Z'))).toBe('2026-11-10');
    expect(gameDayAt(new Date('2026-11-10T21:00:00Z'))).toBe('2026-11-11');
  });
});

describe('GameResultSchema', () => {
  it('accepts a solved day and a day that ran out of tries', () => {
    expect(GameResultSchema.safeParse({ day: '2026-11-11', tries: 3, solved: true }).success).toBe(
      true,
    );
    expect(GameResultSchema.safeParse({ day: '2026-11-11', tries: 6, solved: false }).success).toBe(
      true,
    );
  });

  it('refuses impossible results', () => {
    for (const result of [
      { day: '2026-11-11', tries: 0, solved: true },
      { day: '2026-11-11', tries: 7, solved: true },
      { day: '2026-11-11', tries: 2.5, solved: true },
      { day: '2026-11-11', tries: 4, solved: false },
      { day: '2026-13-01', tries: 3, solved: true },
      { day: '11/11/2026', tries: 3, solved: true },
      { day: '2026-11-11', tries: 3, solved: true, guesses: [] },
    ]) {
      expect(GameResultSchema.safeParse(result).success, JSON.stringify(result)).toBe(false);
    }
  });

  it('caps an import at 400 days', () => {
    const day = { day: '2026-11-11', tries: 3, solved: true };
    expect(GameImportSchema.safeParse({ results: Array(400).fill(day) }).success).toBe(true);
    expect(GameImportSchema.safeParse({ results: Array(401).fill(day) }).success).toBe(false);
  });
});

describe('rejectReason', () => {
  const now = new Date('2026-11-11T10:00:00Z');

  it('accepts today and earlier days', () => {
    expect(rejectReason({ day: '2026-11-11', tries: 2, solved: true }, now, '2026-11-01')).toBe(
      undefined,
    );
    expect(rejectReason({ day: '2026-11-01', tries: 2, solved: true }, now, '2026-11-01')).toBe(
      undefined,
    );
  });

  it("refuses tomorrow's word and days before the first puzzle", () => {
    expect(rejectReason({ day: '2026-11-12', tries: 2, solved: true }, now, '2026-11-01')).toBe(
      'future-day',
    );
    expect(rejectReason({ day: '2026-10-31', tries: 2, solved: true }, now, '2026-11-01')).toBe(
      'before-first-day',
    );
  });
});

describe('mergeResults', () => {
  const saved = [
    { day: '2026-11-09', tries: 4, solved: true },
    { day: '2026-11-10', tries: 6, solved: false },
  ];

  it('adds new days and ignores repeats of saved ones', () => {
    const outcome = mergeResults(saved, [
      { day: '2026-11-10', tries: 6, solved: false },
      { day: '2026-11-11', tries: 2, solved: true },
    ]);
    expect(outcome).toEqual({
      added: [{ day: '2026-11-11', tries: 2, solved: true }],
      conflicts: [],
    });
  });

  it('keeps the saved result when a browser disagrees', () => {
    const outcome = mergeResults(saved, [{ day: '2026-11-09', tries: 2, solved: true }]);
    expect(outcome).toEqual({ added: [], conflicts: ['2026-11-09'] });
  });

  it('counts the first of two results for the same new day', () => {
    const outcome = mergeResults(
      [],
      [
        { day: '2026-11-11', tries: 2, solved: true },
        { day: '2026-11-11', tries: 5, solved: true },
      ],
    );
    expect(outcome).toEqual({
      added: [{ day: '2026-11-11', tries: 2, solved: true }],
      conflicts: ['2026-11-11'],
    });
  });
});
