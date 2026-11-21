import { describe, expect, it } from 'vitest';

import { justStarted, nextAskIn, readScores } from './live';

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

  it('asks every minute while a match is on, every two before, never after', () => {
    expect(nextAskIn([{ state: 'pre' }, { state: 'in' }])).toBe(60_000);
    expect(nextAskIn([{ state: 'pre' }, { state: 'post' }])).toBe(120_000);
    expect(nextAskIn([{ state: 'post' }])).toBeUndefined();
  });

  it('says "starting soon" only just after the start time, never well into a game', () => {
    const row = JSON.stringify({ kind: 'match', startsAt: '2026-11-19T18:00:00.000Z' });
    expect(justStarted(row, new Date('2026-11-19T18:05:00Z'))).toBe(true);
    expect(justStarted(row, new Date('2026-11-19T18:20:00Z'))).toBe(false);
    expect(justStarted(row, new Date('2026-11-19T17:59:00Z'))).toBe(false);
    expect(justStarted('not json', new Date('2026-11-19T18:05:00Z'))).toBe(false);
  });
});
