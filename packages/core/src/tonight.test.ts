import { describe, expect, it } from 'vitest';

import { TonightItemSchema, sortTonight, teamKey, tonightIn } from './tonight.js';

const match = TonightItemSchema.parse({
  id: 'espn-401909980',
  kind: 'match',
  sport: 'basketball',
  focus: 'person',
  people: ['alperen-sengun'],
  name: { en: 'Alperen Şengün', tr: 'Alperen Şengün' },
  competition: { en: 'NBA', tr: 'NBA' },
  home: { name: 'Houston Rockets', ours: true },
  away: { name: 'Los Angeles Lakers', ours: false },
  startsAt: '2026-11-16T04:00:00+03:00',
  live: { source: 'espn', ref: 'basketball/nba/401909980' },
});

const show = TonightItemSchema.parse({
  id: 'ballon-dor-2026',
  kind: 'show',
  focus: 'person',
  name: { en: 'Arda Güler', tr: 'Arda Güler' },
  competition: { en: "Ballon d'Or", tr: "Ballon d'Or" },
  event: { en: 'Nominated for the Kopa Trophy', tr: 'Kopa Ödülü’ne aday' },
  startsAt: '2026-11-15T22:00:00+03:00',
});

describe('tonight', () => {
  it('reads a row in the reader’s language', () => {
    const local = tonightIn(show, 'tr');
    expect(local.event).toBe('Kopa Ödülü’ne aday');
    expect(local.name).toBe('Arda Güler');
  });

  it('needs both sides for a match and an event line for a show', () => {
    expect(TonightItemSchema.safeParse({ ...match, home: undefined }).success).toBe(false);
    expect(TonightItemSchema.safeParse({ ...show, event: undefined }).success).toBe(false);
    expect(TonightItemSchema.safeParse({ ...show, result: { home: 1, away: 0 } }).success).toBe(
      false,
    );
  });

  it('names a team’s logo file without Turkish letters', () => {
    expect(teamKey('Fenerbahçe Beko')).toBe('fenerbahce-beko');
    expect(teamKey('Brighton & Hove Albion')).toBe('brighton-hove-albion');
  });

  it('orders rows by start, national team first at the same time', () => {
    const club = { startsAt: '2026-11-15T19:45:00Z', focus: 'club' as const };
    const national = { startsAt: '2026-11-15T22:45:00+03:00', focus: 'national' as const };
    const early = { startsAt: '2026-11-15T18:00:00Z', focus: 'person' as const };
    expect(sortTonight([club, early, national])).toEqual([early, national, club]);
  });
});
