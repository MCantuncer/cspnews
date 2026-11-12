import { alphabetOf, GAME_LANGUAGES } from '@cspnews/wordgame';
import { describe, expect, it } from 'vitest';

import {
  KEYBOARD,
  countdown,
  lostLineFor,
  msUntilNextWord,
  parseResults,
  parseSavedGame,
  praiseFor,
  puzzleDate,
  shareText,
  todayLine,
  todayState,
  windowDays,
} from './word.js';

describe('the keyboards', () => {
  it.each(GAME_LANGUAGES)('have every %s letter exactly once', (language) => {
    const letters = KEYBOARD[language].flat().filter((key) => key !== 'enter' && key !== 'delete');
    expect([...letters].sort()).toEqual([...alphabetOf(language)].sort());
  });
});

describe('praiseFor', () => {
  it('has a calm line for each number of tries', () => {
    expect(praiseFor(1, 'en')).toBe('First try.');
    expect(praiseFor(4, 'en')).toBe('Steady.');
    expect(praiseFor(6, 'tr')).toBe('Son hakta. Yetiştin.');
    for (const language of GAME_LANGUAGES) {
      for (let tries = 1; tries <= 6; tries += 1)
        expect(praiseFor(tries, language)).not.toMatch('!');
    }
  });
});

describe('lostLineFor', () => {
  it('gives everyone the same calm line on a day, and changes it between days', () => {
    expect(lostLineFor('2026-11-11', 'tr')).toBe(lostLineFor('2026-11-11', 'tr'));
    const week = ['11', '12', '13', '14', '15', '16', '17'].map((d) =>
      lostLineFor(`2026-11-${d}`, 'en'),
    );
    expect(new Set(week).size).toBeGreaterThan(3);
    for (const line of week) expect(line).not.toMatch('!');
  });
});

describe('windowDays', () => {
  it('runs from yesterday through ten days ahead', () => {
    const days = windowDays('2026-11-30');
    expect(days[0]).toBe('2026-11-29');
    expect(days[1]).toBe('2026-11-30');
    expect(days.at(-1)).toBe('2026-12-10');
  });
});

describe('parseSavedGame', () => {
  it('reads a saved game and drops anything that is not a playable word', () => {
    const text = JSON.stringify({ day: '2026-11-11', guesses: ['ŞEHİR', 'abc', 7, 'KİTAP'] });
    expect(parseSavedGame(text, 'tr')).toEqual({ day: '2026-11-11', guesses: ['ŞEHİR', 'KİTAP'] });
  });

  it('treats broken storage as no game', () => {
    expect(parseSavedGame(null, 'en')).toBeUndefined();
    expect(parseSavedGame('{', 'en')).toBeUndefined();
    expect(parseSavedGame('{"day":"today","guesses":[]}', 'en')).toBeUndefined();
  });
});

describe('parseResults', () => {
  it('keeps well-formed results only', () => {
    const text = JSON.stringify([
      { day: '2026-11-10', tries: 4, solved: true },
      { day: '2026-11-11', tries: 9, solved: true },
      { day: 'x', tries: 3, solved: false },
      'junk',
    ]);
    expect(parseResults(text)).toEqual([{ day: '2026-11-10', tries: 4, solved: true }]);
    expect(parseResults('nope')).toEqual([]);
  });
});

describe('shareText', () => {
  it('shares the colours and the score, never the letters', () => {
    const text = shareText(
      'en',
      47,
      [
        ['absent', 'present', 'absent', 'absent', 'correct'],
        ['correct', 'correct', 'correct', 'correct', 'correct'],
      ],
      true,
      'https://example.com/word',
    );
    expect(text).toBe(
      'CSPNews Daily Word 47 2/6\n\n⬛🟨⬛⬛🟩\n🟩🟩🟩🟩🟩\n\nhttps://example.com/word',
    );
    expect(shareText('tr', 3, [], false, 'u')).toContain('Günün Kelimesi 3 X/6');
  });
});

describe('puzzleDate', () => {
  it('writes the day in the puzzle language', () => {
    expect(puzzleDate('2026-11-11', 'en')).toBe('Wed 11 Nov');
    expect(puzzleDate('2026-11-11', 'tr')).toBe('11 Kasım Çar');
  });
});

describe('msUntilNextWord and countdown', () => {
  it('counts down to midnight in Istanbul', () => {
    // 20:00 UTC is 23:00 in Istanbul: one hour to go.
    expect(msUntilNextWord(new Date('2026-11-11T20:00:00Z'))).toBe(3_600_000);
    expect(msUntilNextWord(new Date('2026-11-11T21:00:00Z'))).toBe(86_400_000);
    expect(countdown(3_600_000 + 4 * 60_000 + 9_000)).toBe('01:04:09');
    expect(countdown(-5)).toBe('00:00:00');
  });
});

describe('the line to today’s word', () => {
  const today = '2026-11-12';

  it('invites a reader who has not played', () => {
    expect(todayState(undefined, [], today)).toEqual({ kind: 'new' });
    expect(todayState({ day: '2026-11-11', guesses: ['apple'] }, [], today)).toEqual({
      kind: 'new',
    });
    expect(todayLine({ kind: 'new' }, 'en')).toBe('Five letters, six tries.');
  });

  it('counts the tries left while a game is open', () => {
    const state = todayState({ day: today, guesses: ['apple', 'crane'] }, [], today);
    expect(state).toEqual({ kind: 'playing', tries: 2 });
    expect(todayLine(state, 'en')).toBe('4 tries left.');
    expect(todayLine({ kind: 'playing', tries: 5 }, 'en')).toBe('One try left.');
    expect(todayLine(state, 'tr')).toBe('Kalan deneme: 4.');
  });

  it('prefers the finished day over the saved board', () => {
    const saved = { day: today, guesses: ['apple', 'crane', 'stone'] };
    const solved = todayState(saved, [{ day: today, tries: 3, solved: true }], today);
    expect(solved).toEqual({ kind: 'solved', tries: 3 });
    expect(todayLine(solved, 'en')).toBe('Solved in 3.');
    expect(todayLine(solved, 'tr')).toBe('3. denemede bildin.');
    expect(todayState(saved, [{ day: today, tries: 6, solved: false }], today)).toEqual({
      kind: 'lost',
    });
  });
});
