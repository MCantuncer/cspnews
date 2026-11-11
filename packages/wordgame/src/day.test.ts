import { describe, expect, it } from 'vitest';

import {
  addDays,
  answerOn,
  daysBetween,
  daysLeft,
  gameDayAt,
  puzzleNumber,
  seededShuffle,
  weekStartOf,
} from './day.js';

describe('gameDayAt', () => {
  it('switches to the next word at 00:00 Istanbul time', () => {
    // Istanbul is UTC+3: 20:59 UTC is 23:59, 21:00 UTC is midnight.
    expect(gameDayAt(new Date('2026-11-11T20:59:59Z'))).toBe('2026-11-11');
    expect(gameDayAt(new Date('2026-11-11T21:00:00Z'))).toBe('2026-11-12');
  });

  it('crosses the year end', () => {
    expect(gameDayAt(new Date('2026-12-31T21:30:00Z'))).toBe('2027-01-01');
  });
});

describe('day arithmetic', () => {
  it('counts and adds days across months and leap years', () => {
    expect(daysBetween('2026-11-11', '2026-12-01')).toBe(20);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('finds the Monday of the week', () => {
    expect(weekStartOf('2026-11-11')).toBe('2026-11-09'); // Wednesday
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09'); // Sunday
  });

  it('refuses dates that do not exist', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow();
    expect(() => addDays('11/11/2026', 1)).toThrow();
  });
});

describe('the day word', () => {
  const answers = ['SHORE', 'CRANE', 'PLUMB'];
  const firstDay = '2026-12-01';

  it('numbers puzzles from the first day', () => {
    expect(puzzleNumber('2026-12-01', firstDay)).toBe(1);
    expect(puzzleNumber('2026-12-03', firstDay)).toBe(3);
    expect(puzzleNumber('2026-11-30', firstDay)).toBeUndefined();
  });

  it('plays the list in order and stops at its end', () => {
    expect(answerOn(answers, '2026-12-01', firstDay)).toBe('SHORE');
    expect(answerOn(answers, '2026-12-03', firstDay)).toBe('PLUMB');
    expect(answerOn(answers, '2026-12-04', firstDay)).toBeUndefined();
    expect(answerOn(answers, '2026-11-30', firstDay)).toBeUndefined();
  });

  it('counts the days left, today included', () => {
    expect(daysLeft(answers, '2026-12-01', firstDay)).toBe(3);
    expect(daysLeft(answers, '2026-12-03', firstDay)).toBe(1);
    expect(daysLeft(answers, '2026-12-09', firstDay)).toBe(0);
  });
});

describe('seededShuffle', () => {
  const words = Array.from({ length: 50 }, (_, index) => `W${String(index)}`);

  it('gives the same order for the same seed', () => {
    expect(seededShuffle(words, 'en-1')).toEqual(seededShuffle(words, 'en-1'));
  });

  it('gives a different order for another seed and keeps every word', () => {
    const shuffled = seededShuffle(words, 'en-1');
    expect(shuffled).not.toEqual(seededShuffle(words, 'en-2'));
    expect([...shuffled].sort()).toEqual([...words].sort());
  });
});
