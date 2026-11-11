import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { daysLeft, gameDayAt } from './day.js';
import { GAME_LANGUAGES, type GameLanguage } from './language.js';
import { FIRST_DAY, MIN_DAYS_LEFT, listProblems, parseWordList, type WordLists } from './lists.js';

function readList(language: GameLanguage, name: string): string[] {
  const url = new URL(`../data/${language}/${name}.txt`, import.meta.url);
  return parseWordList(readFileSync(url, 'utf8'), language);
}

function listsOf(language: GameLanguage): WordLists {
  return {
    answers: readList(language, 'answers'),
    guesses: readList(language, 'guesses'),
    blocked: readList(language, 'blocked'),
  };
}

describe.each(GAME_LANGUAGES)('the %s word lists', (language) => {
  const lists = listsOf(language);

  it('have no problems', () => {
    expect(listProblems(lists, language)).toEqual([]);
  });

  it(`have at least ${String(MIN_DAYS_LEFT)} days of answers left`, () => {
    const today = gameDayAt(new Date());
    const day = today < FIRST_DAY[language] ? FIRST_DAY[language] : today;
    expect(daysLeft(lists.answers, day, FIRST_DAY[language])).toBeGreaterThanOrEqual(MIN_DAYS_LEFT);
  });
});

describe('parseWordList', () => {
  it('skips blank lines and comments and normalises words', () => {
    expect(parseWordList('# heading\nşehir  # a city\n\nkitap\n', 'tr')).toEqual([
      'ŞEHİR',
      'KİTAP',
    ]);
  });
});

describe('listProblems', () => {
  it('finds repeated, blocked, unplayable and unguessable answers', () => {
    const problems = listProblems(
      {
        answers: ['SHORE', 'SHORE', 'IDIOT', 'SHO', 'CRANE'],
        guesses: ['SHORE', 'IDIOT', 'SHO'],
        blocked: ['IDIOT'],
      },
      'en',
    );
    expect(problems).toEqual([
      'answer 2 (SHORE) is listed twice.',
      'answer 3 (IDIOT) is blocked.',
      'answer 4 (SHO) is not five en letters.',
      'answer 5 (CRANE) is not accepted as a guess.',
      'guess SHO is not five en letters.',
    ]);
  });
});
