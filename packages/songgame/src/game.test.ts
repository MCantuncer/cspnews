import { describe, expect, it } from 'vitest';

import {
  FIRST_DAY,
  clipFor,
  giveUp,
  guess,
  hideText,
  isRoundOver,
  isSameSong,
  pointsFor,
  readShareCode,
  revealText,
  searchSongs,
  shareCode,
  songOn,
  songStats,
  totalPoints,
  type Round,
} from './index.js';

const start: Round = { guesses: [] };

describe('rounds', () => {
  it('opens a longer clip after each miss or skip', () => {
    expect(clipFor(start)).toBe(0.1);
    const once = guess(start, null, false);
    expect(clipFor(once)).toBe(1);
    expect(clipFor(guess(once, 'Queen – Under Pressure', false))).toBe(2);
  });

  it('scores 100 on the 0.1 s clip and 0 for a missed song', () => {
    const first = guess(start, 'Queen – Bohemian Rhapsody', true);
    expect(pointsFor(first)).toBe(100);
    expect(isRoundOver(first)).toBe(true);
    let missed = start;
    for (let i = 0; i < 5; i += 1) missed = guess(missed, null, false);
    // On the 16 s clip a wrong guess keeps the round open; only giving up ends it.
    missed = guess(missed, 'Queen – Under Pressure', false);
    missed = guess(missed, 'Queen – Radio Ga Ga', false);
    expect(isRoundOver(missed)).toBe(false);
    expect(clipFor(missed)).toBe(16);
    expect(pointsFor(guess(missed, 'Queen – Bohemian Rhapsody', true))).toBe(10);
    missed = guess(missed, null, false);
    expect(isRoundOver(missed)).toBe(true);
    expect(giveUp(start)).toEqual({ guesses: [], gaveUp: true });
    expect(pointsFor(missed)).toBe(0);
    expect(guess(missed, 'late', true)).toBe(missed);
    expect(totalPoints([first, missed, guess(guess(start, null, false), 'x', true)])).toBe(180);
  });
});

describe('names', () => {
  it('matches across case, accents, punctuation and feat. parts', () => {
    expect(
      isSameSong(
        { artist: 'guns n roses', title: 'sweet child o mine' },
        { artist: "Guns N' Roses", title: "Sweet Child O' Mine" },
      ),
    ).toBe(true);
    expect(
      isSameSong(
        { artist: 'Sezen Aksu', title: 'Gidiyorum' },
        { artist: 'SEZEN AKSU', title: 'Gİdİyorum (feat. Someone)' },
      ),
    ).toBe(true);
    expect(
      isSameSong(
        { artist: 'Hande Yener', title: 'Kırmızı' },
        { artist: 'Tarkan', title: 'Kırmızı' },
      ),
    ).toBe(false);
  });

  it('finds songs by the start of any word, titles first', () => {
    const catalog = [
      { artist: 'Tarkan', title: 'Şımarık' },
      { artist: 'Queen', title: 'Bohemian Rhapsody' },
      { artist: 'Simge', title: 'Miş Miş' },
    ];
    expect(searchSongs(catalog, 'sim').map((song) => song.title)).toEqual(['Şımarık', 'Miş Miş']);
    expect(searchSongs(catalog, 'queen boh')[0]?.title).toBe('Bohemian Rhapsody');
    expect(searchSongs(catalog, '  ')).toEqual([]);
  });
});

describe('days', () => {
  it('starts with entry 1 on the first day and starts over at the end', () => {
    expect(songOn(['a', 'b'], FIRST_DAY)).toBe('a');
    expect(songOn(['a', 'b'], '2026-11-29')).toBe('a');
    expect(songOn(['a', 'b'], '2026-11-26')).toBeUndefined();
  });

  it('scrambles and restores an answer', () => {
    const hidden = hideText('{"title":"Şımarık"}', '2026-11-27', 'pop-tr');
    expect(hidden).not.toContain('marık');
    expect(revealText(hidden, '2026-11-27', 'pop-tr')).toBe('{"title":"Şımarık"}');
    expect(revealText('nothex', '2026-11-27', 'pop-tr')).toBeUndefined();
  });
});

describe('share link', () => {
  it('round-trips the tries and works out the points', () => {
    const rounds: Round[] = [
      { guesses: ['a'], solvedOn: 0 },
      { guesses: [null, null, 'b'], solvedOn: 2 },
      { guesses: [null, null, null, null, null], gaveUp: true },
      { guesses: [null, 'c'], solvedOn: 1 },
    ];
    const code = shareCode('2026-11-27', rounds);
    expect(code).toBe('20261127-13x2');
    expect(readShareCode(code)).toEqual({
      day: '2026-11-27',
      tries: [1, 3, undefined, 2],
      points: 240,
    });
    expect(readShareCode('20261127-17x1')).toBeUndefined();
    expect(readShareCode('20261127-1x1')).toBeUndefined();
    expect(readShareCode(null)).toBeUndefined();
  });
});

describe('stats', () => {
  it('counts streaks of played days and the points', () => {
    const won: Round = { guesses: ['a'], solvedOn: 0 };
    const lost: Round = { guesses: [], gaveUp: true };
    const stats = songStats(
      [
        { day: '2026-11-27', rounds: [won, won, lost, lost] },
        { day: '2026-11-28', rounds: [won, lost, lost, won] },
        { day: '2026-11-30', rounds: [won, won, won, won] },
      ],
      '2026-12-01',
      6,
    );
    expect(stats).toMatchObject({
      played: 3,
      streak: 1,
      bestStreak: 2,
      bestPoints: 400,
      averagePoints: 267,
      missed: 4,
    });
    expect(stats.namedOn[0]).toBe(8);
  });
});
