import { describe, expect, it } from 'vitest';

import { nextAskIn, readScores } from './live';

describe('live scores', () => {
  it('keeps only scores that read cleanly', () => {
    expect(
      readScores({
        scores: [
          { ref: 'espn:soccer/uefa.nations/1', state: 'in', home: 1, away: 2, clock: "63'" },
          { ref: 'espn:basketball/nba/2', state: 'post', home: -1, away: 'x' },
          { ref: 3, state: 'in' },
          { ref: 'euroleague:E2026/98', state: 'later' },
        ],
      }),
    ).toEqual([
      { ref: 'espn:soccer/uefa.nations/1', state: 'in', home: 1, away: 2, clock: "63'" },
      { ref: 'espn:basketball/nba/2', state: 'post' },
    ]);
    expect(readScores('nope')).toEqual([]);
  });

  it('asks every minute while a match is on, every five before, never after', () => {
    expect(nextAskIn([{ state: 'pre' }, { state: 'in' }])).toBe(60_000);
    expect(nextAskIn([{ state: 'pre' }, { state: 'post' }])).toBe(300_000);
    expect(nextAskIn([{ state: 'post' }])).toBeUndefined();
  });
});
