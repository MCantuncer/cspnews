import { describe, expect, it } from 'vitest';

import { checkRounds, madeUpName, nameProblem } from './board.js';

const answers = [
  { artist: 'Simge', title: 'Yankı' },
  { artist: 'Snoop Dogg', title: 'Young, Wild & Free' },
  { artist: 'System Of A Down', title: 'Toxicity' },
  { artist: 'Michael Jackson', title: 'Thriller' },
];

describe('nameProblem', () => {
  it('takes plain and made-up names', () => {
    expect(nameProblem('deniz_k', answers)).toBeUndefined();
    expect(nameProblem('Uykulu Kaset', answers)).toBeUndefined();
    expect(nameProblem("Can's Ear", answers)).toBeUndefined();
  });

  it('turns away names that are too short, too long or not made of letters', () => {
    expect(nameProblem(' a ', answers)).toBe('short');
    expect(nameProblem('a'.repeat(21), answers)).toBe('long');
    expect(nameProblem('<script>', answers)).toBe('letters');
    expect(nameProblem('-dash', answers)).toBe('letters');
  });

  it('turns away rude words, also squeezed together', () => {
    expect(nameProblem('Fucking Owl', answers)).toBe('rude');
    expect(nameProblem('orospucocugu', answers)).toBe('rude');
    expect(nameProblem('Big AMK', answers)).toBe('rude');
    expect(nameProblem('Sikis Kaset', answers)).toBe('rude');
  });

  it("turns away names that give away one of today's songs", () => {
    expect(nameProblem('Thriller fan', answers)).toBe('spoiler');
    expect(nameProblem('simge2026', answers)).toBe('spoiler');
    expect(nameProblem('YANKI', answers)).toBe('spoiler');
    expect(nameProblem('systemofadown', answers)).toBe('spoiler');
  });
});

describe('madeUpName', () => {
  it('pairs two words in the reader’s language', () => {
    expect(madeUpName('en', () => 0)).toBe('Sleepy Bassline');
    expect(madeUpName('tr', () => 0)).toBe('Uykulu Kaset');
  });
});

describe('checkRounds', () => {
  const label = (song: { artist: string; title: string }) => `${song.artist} – ${song.title}`;
  const [pop, rap, rock, hits] = answers.map(label) as [string, string, string, string];

  it('works the score out again from the guesses', () => {
    const checked = checkRounds(
      [
        { guesses: [pop] },
        { guesses: [null, 'Tarkan – Şımarık', rap] },
        { guesses: [null, null, null, null, null], gaveUp: true },
        { guesses: [null, hits] },
      ],
      answers,
    );
    expect(checked).toEqual({
      tries: [1, 3, 0, 2],
      points: 100 + 60 + 0 + 80,
      heard: 0.1 + 2 + 16 + 1,
    });
  });

  it('takes no unfinished or doctored day', () => {
    expect(checkRounds([{ guesses: [pop] }], answers)).toBeUndefined();
    expect(
      checkRounds(
        [{ guesses: [pop] }, { guesses: [rap] }, { guesses: [rock] }, { guesses: [null] }],
        answers,
      ),
    ).toBeUndefined();
    expect(
      checkRounds(
        [{ guesses: [pop, pop] }, { guesses: [rap] }, { guesses: [rock] }, { guesses: [hits] }],
        answers,
      ),
    ).toBeUndefined();
    expect(
      checkRounds(
        [
          { guesses: ['Simge – Ne Güzel'] },
          { guesses: [rap] },
          { guesses: [rock] },
          { guesses: [hits] },
        ],
        answers,
      ),
    ).toBeUndefined();
  });
});
