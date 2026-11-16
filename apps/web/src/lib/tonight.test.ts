import { describe, expect, it } from 'vitest';

import { personMarks, tonightOutcome, tonightState, tonightStatus, tonightWhat } from './tonight';

const match = {
  kind: 'match' as const,
  sport: 'football' as const,
  startsAt: '2026-11-15T22:45:00+03:00',
};

describe('tonight status', () => {
  it('shows the kick-off time before a match', () => {
    expect(tonightStatus(match, 'en', new Date('2026-11-15T18:00:00Z'))).toEqual({
      state: 'upcoming',
      figure: '22:45',
      word: 'Tonight',
    });
  });

  it('says a midday match is today, and a 04:00 NBA game tonight', () => {
    const midday = { ...match, startsAt: '2026-11-15T14:00:00+03:00' };
    expect(tonightStatus(midday, 'tr', new Date('2026-11-15T08:00:00Z')).word).toBe('Bugün');
    const nba = { ...match, sport: 'basketball' as const, startsAt: '2026-11-16T04:00:00+03:00' };
    expect(tonightStatus(nba, 'tr', new Date('2026-11-15T18:00:00Z')).word).toBe('Bu gece');
  });

  it('moves to under way, then shows the final score', () => {
    expect(tonightStatus(match, 'en', new Date('2026-11-15T20:00:00Z')).word).toBe('Live');
    const ended = { ...match, result: { home: 2, away: 1 } };
    expect(tonightStatus(ended, 'tr', new Date('2026-11-15T22:00:00Z'))).toEqual({
      state: 'over',
      figure: '2–1',
      word: 'Maç sonu',
    });
  });

  it('says a match ended without inventing a score', () => {
    expect(tonightStatus(match, 'en', new Date('2026-11-16T01:00:00Z'))).toEqual({
      state: 'over',
      figure: '22:45',
      word: 'Ended',
    });
  });

  it('writes the fixture in each language', () => {
    const sides = { home: { name: 'Türkiye', ours: true }, away: { name: 'Spain', ours: false } };
    expect(tonightWhat(sides, 'en')).toBe('Türkiye v Spain');
    expect(tonightWhat(sides, 'tr')).toBe('Türkiye - Spain');
    expect(tonightWhat({ event: 'Nominated' }, 'en')).toBe('Nominated');
  });
});

describe('tonight state', () => {
  const nba = { ...match, sport: 'basketball' as const, startsAt: '2026-11-16T04:00:00+03:00' };
  it('moves a row on by the clock', () => {
    expect(tonightState(nba, new Date('2026-11-16T00:59:00Z'))).toBe('upcoming');
    expect(tonightState(nba, new Date('2026-11-16T01:00:00Z'))).toBe('on');
    expect(tonightState(nba, new Date('2026-11-16T03:29:00Z'))).toBe('on');
    expect(tonightState(nba, new Date('2026-11-16T03:31:00Z'))).toBe('over');
  });

  it('counts a row with a final score as over, whatever the clock says', () => {
    const ended = { ...nba, result: { home: 118, away: 109 } };
    expect(tonightState(ended, new Date('2026-11-16T01:30:00Z'))).toBe('over');
  });
});

describe('tonight outcome and marks', () => {
  const sides = {
    home: { name: 'Real Madrid', ours: true },
    away: { name: 'Getafe', ours: false },
  };
  it('reads the result from our side', () => {
    expect(tonightOutcome({ ...sides, result: { home: 2, away: 0 } })).toBe('win');
    expect(tonightOutcome({ ...sides, result: { home: 0, away: 1 } })).toBe('loss');
    expect(tonightOutcome({ ...sides, result: { home: 1, away: 1 } })).toBe('draw');
    expect(tonightOutcome(sides)).toBeUndefined();
    const both = { home: { ...sides.home }, away: { ...sides.away, ours: true } };
    expect(tonightOutcome({ ...both, result: { home: 2, away: 0 } })).toBeUndefined();
  });

  it('shows goals and assists only when there are some', () => {
    expect(personMarks({ goals: 2, assists: 0 })).toEqual([{ kind: 'goals', count: 2 }]);
    expect(personMarks({ goals: 0, assists: 0 })).toEqual([]);
    expect(personMarks({ points: 27, rebounds: 13, assists: 8 })).toEqual([
      { kind: 'points', count: 27 },
      { kind: 'rebounds', count: 13 },
      { kind: 'assists', count: 8 },
    ]);
  });
});
