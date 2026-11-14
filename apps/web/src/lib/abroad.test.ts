import { describe, expect, it } from 'vitest';

import { initials, istanbulMoment, whenLine } from './abroad.js';

const EVENING = '2026-11-14T15:30:00Z';

describe('Turks abroad on the site', () => {
  it('makes initials from the first and last name', () => {
    expect(initials('Alperen Şengün')).toBe('AŞ');
    expect(initials('Daron Acemoğlu')).toBe('DA');
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
    expect(whenLine({ nextAt: '2026-11-16T20:00:00Z' }, EVENING, 'en')).toBe('Next: Monday 23:00');
    expect(whenLine({}, EVENING, 'en')).toBeUndefined();
  });
});
