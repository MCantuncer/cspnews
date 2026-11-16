import type { TennisLine } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { clubOf, initials, istanbulMoment, statBoard, statStrip, whenLine } from './abroad.js';

const EVENING = '2026-11-14T15:30:00Z';

describe('Turks abroad on the site', () => {
  it('makes initials from the first and last name', () => {
    expect(initials('Alperen Şengün')).toBe('AŞ');
    expect(initials('Daron Acemoğlu')).toBe('DA');
  });

  it('reads the club from the where line, for its crest', () => {
    expect(clubOf('Houston Rockets, NBA')).toBe('Houston Rockets');
    expect(clubOf('MIT')).toBe('MIT');
  });

  it('gives a time on the bulletin’s own day, and the weekday otherwise, in Istanbul time', () => {
    expect(istanbulMoment('2026-11-14T01:30:00Z', EVENING, 'en')).toBe('04:30');
    expect(istanbulMoment('2026-11-16T02:00:00Z', EVENING, 'en')).toBe('Monday 05:00');
    expect(istanbulMoment('2026-11-16T02:00:00Z', EVENING, 'tr')).toBe('Pazartesi 05:00');
  });

  it('says when a game was played, else when the next one is', () => {
    expect(whenLine({ playedAt: '2026-11-14T01:30:00Z' }, EVENING, 'en')).toBe(
      'Played at 04:30 our time',
    );
    expect(whenLine({ playedAt: '2026-11-14T01:30:00Z' }, EVENING, 'tr')).toBe(
      'Maç saati: 04:30 (TSİ)',
    );
    expect(whenLine({ playedAt: '2026-11-13T20:00:00Z' }, EVENING, 'en')).toBe(
      'Played on Friday at 23:00 our time',
    );
    expect(whenLine({ playedAt: '2026-11-13T12:00:00Z', kind: 'motorsport' }, EVENING, 'tr')).toBe(
      'Yarış saati: Cuma 15:00 (TSİ)',
    );
    expect(whenLine({ nextAt: '2026-11-16T20:00:00Z' }, EVENING, 'en')).toBe('Next: Monday 23:00');
    expect(whenLine({}, EVENING, 'en')).toBeUndefined();
  });
});

describe('stat layouts', () => {
  it('shows a basketball line as points, rebounds and assists', () => {
    const line = { sport: 'basketball', points: 28, rebounds: 12, assists: 1 } as const;
    expect(statStrip(line, 'en')).toEqual([
      { value: '28', label: 'points' },
      { value: '12', label: 'rebounds' },
      { value: '1', label: 'assist' },
    ]);
    expect(statStrip(line, 'tr').map((cell) => cell.label)).toEqual(['sayı', 'ribaunt', 'asist']);
  });

  it('shows a goalless footballer’s minutes instead', () => {
    const line = { sport: 'football', goals: 0, assists: 0, minutes: 90 } as const;
    expect(statStrip(line, 'en')).toEqual([{ value: '90', label: 'minutes' }]);
  });

  it('lays a tennis match out as its sets', () => {
    const line: TennisLine = {
      sport: 'tennis',
      opponent: 'A Player',
      sets: [
        { us: 6, them: 7, tiebreak: 5 },
        { us: 6, them: 3 },
      ],
    };
    expect(statStrip(line, 'en')).toEqual([{ value: '6–7  6–3', label: 'vs A Player' }]);
  });

  it('puts a race result as places', () => {
    const board = statBoard({ sport: 'motorsport', position: 3, grid: 8, standing: 2 }, 'en');
    expect(board.main.map((cell) => cell.value)).toEqual(['P3', 'P8']);
    expect(board.more).toEqual([{ value: '2nd', label: 'In the championship' }]);
  });
});
