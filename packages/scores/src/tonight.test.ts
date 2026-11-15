import { describe, expect, it } from 'vitest';

import { definePeople } from '@cspnews/core';

import { parseEspnScoreboard } from './espn.js';
import { centralEuropeanToUtc, euroleagueSeason, parseEuroleagueGames } from './euroleague.js';
import { findFixture, withLiveMatch } from './today.js';
import { buildTonight, datesToAsk, tonightWindow, type TonightWatch } from './tonight.js';

// Hand-made pages in the shape the two sources use, cut to the fields the rules read.
const team = (displayName: string, shortDisplayName = displayName) => ({
  displayName,
  shortDisplayName,
  logo: `https://a.example/${shortDisplayName}.png`,
});
const espnEvent = (
  id: string,
  date: string,
  home: ReturnType<typeof team>,
  away: ReturnType<typeof team>,
  state = 'pre',
  scores: [string, string] = ['0', '0'],
) => ({
  id,
  date,
  name: `${away.displayName} at ${home.displayName}`,
  status: { type: { state, completed: state === 'post' } },
  competitions: [
    {
      competitors: [
        { homeAway: 'home', score: scores[0], team: home },
        { homeAway: 'away', score: scores[1], team: away },
      ],
    },
  ],
});

const nbaPage = {
  events: [
    espnEvent('401', '2026-11-16T01:00Z', team('Houston Rockets', 'Rockets'), team('LA Lakers')),
    espnEvent('402', '2026-11-16T00:00Z', team('Boston Celtics'), team('Miami Heat')),
    espnEvent(
      '403',
      '2026-11-15T01:00Z',
      team('Houston Rockets', 'Rockets'),
      team('Utah Jazz'),
      'post',
      ['118', '109'],
    ),
    { id: 'broken' },
  ],
};
const championsPage = {
  events: [
    espnEvent('501', '2026-11-15T20:00Z', team('Galatasaray'), team('Liverpool'), 'in', ['1', '1']),
    espnEvent('502', '2026-11-15T20:00Z', team('Real Madrid'), team('Juventus')),
  ],
};
const nationsPage = {
  events: [espnEvent('601', '2026-11-15T19:45Z', team('Türkiye'), team('Spain'))],
};
const euroleaguePage = {
  data: [
    {
      gameCode: 98,
      date: '2026-11-15T19:45:00',
      played: false,
      local: { club: { code: 'ULK', name: 'Fenerbahce Beko Istanbul' }, score: 0 },
      road: { club: { code: 'MAD', name: 'Real Madrid' }, score: 0 },
    },
    {
      gameCode: 12,
      date: '2026-10-02T19:45:00',
      played: true,
      local: { club: { code: 'ULK', name: 'Fenerbahce Beko Istanbul' }, score: 88 },
      road: { club: { code: 'PAN', name: 'Panathinaikos' }, score: 80 },
    },
  ],
};

const watch: TonightWatch = {
  espnLeagues: [
    { path: 'basketball/nba', sport: 'basketball', competition: { en: 'NBA', tr: 'NBA' } },
    {
      path: 'soccer/uefa.champions',
      sport: 'football',
      competition: { en: 'Champions League', tr: 'Şampiyonlar Ligi' },
    },
    {
      path: 'soccer/uefa.nations',
      sport: 'football',
      competition: { en: 'Nations League', tr: 'Uluslar Ligi' },
    },
  ],
  nationalTeam: ['Türkiye', 'Turkey'],
  nationalLeagues: ['soccer/uefa.nations'],
  turkishClubs: ['Galatasaray', 'Fenerbahçe'],
  clubLeagues: ['soccer/uefa.champions'],
  personClubs: [
    { personId: 'alperen-sengun', team: ['Houston Rockets'], leagues: ['basketball/nba'] },
    { personId: 'arda-guler', team: ['Real Madrid'], leagues: ['soccer/uefa.champions'] },
    { personId: 'kenan-yildiz', team: ['Juventus'], leagues: ['soccer/uefa.champions'] },
  ],
  euroleagueClubs: [{ code: 'ULK', name: 'Fenerbahçe Beko' }],
  euroleague: { en: 'Euroleague', tr: 'EuroLeague' },
  people: definePeople([
    { id: 'alperen-sengun', name: 'Alperen Şengün', kind: 'basketball' },
    { id: 'arda-guler', name: 'Arda Güler', kind: 'football' },
    { id: 'kenan-yildiz', name: 'Kenan Yıldız', kind: 'football' },
  ]),
};

const fixtures = [
  ...parseEspnScoreboard('basketball/nba', nbaPage),
  ...parseEspnScoreboard('soccer/uefa.champions', championsPage),
  ...parseEspnScoreboard('soccer/uefa.nations', nationsPage),
  ...parseEuroleagueGames('E2026', euroleaguePage),
];

// The late bulletin of Sunday 15 November, 22:30 Istanbul.
const window = tonightWindow(new Date('2026-11-15T22:30:00+03:00'));

describe('score sources', () => {
  it('reads an ESPN scoreboard and skips what does not read cleanly', () => {
    const nba = parseEspnScoreboard('basketball/nba', nbaPage);
    expect(nba.map((f) => f.id)).toEqual(['espn-401', 'espn-402', 'espn-403']);
    expect(nba[0]).toMatchObject({
      ref: 'basketball/nba/401',
      startsAt: '2026-11-16T01:00:00.000Z',
      completed: false,
      home: { display: 'Houston Rockets', names: ['Houston Rockets', 'Rockets'] },
    });
    // A match that has not started has no score.
    expect(nba[0]?.home.score).toBeUndefined();
    expect(nba[2]).toMatchObject({ completed: true, home: { score: 118 }, away: { score: 109 } });
  });

  it('reads Euroleague times as Central European time', () => {
    expect(centralEuropeanToUtc('2026-11-15T19:45:00')).toBe('2026-11-15T18:45:00.000Z');
    expect(centralEuropeanToUtc('2026-05-22T17:00:00')).toBe('2026-05-22T15:00:00.000Z');
    const [game] = parseEuroleagueGames('E2026', euroleaguePage);
    expect(game).toMatchObject({ id: 'euroleague-e2026-98', ref: 'E2026/98' });
    expect(game?.home.score).toBeUndefined();
  });

  it('names the Euroleague season from the date', () => {
    expect(euroleagueSeason(new Date('2026-11-15T00:00:00Z'))).toBe('E2026');
    expect(euroleagueSeason(new Date('2027-03-01T00:00:00Z'))).toBe('E2026');
  });
});

describe('tonight rules', () => {
  it('covers from ten hours before the bulletin to 09:00 the next morning', () => {
    expect(window.from.toISOString()).toBe('2026-11-15T09:30:00.000Z');
    expect(window.until.toISOString()).toBe('2026-11-16T06:00:00.000Z');
    expect(datesToAsk(window)).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
  });

  it('keeps only our matches in the window, in the order they start', () => {
    const rows = buildTonight(fixtures, watch, window);
    expect(rows.map((row) => [row.id, row.focus, row.name.en])).toEqual([
      ['euroleague-e2026-98', 'club', 'Fenerbahce Beko Istanbul'],
      ['espn-601', 'national', 'Türkiye'],
      ['espn-501', 'club', 'Galatasaray'],
      ['espn-502', 'person', 'Arda Güler, Kenan Yıldız'],
      ['espn-401', 'person', 'Alperen Şengün'],
    ]);
  });

  it('marks our side and keeps the logo key only where the source has a logo', () => {
    const rows = buildTonight(fixtures, watch, window);
    const galatasaray = rows.find((row) => row.id === 'espn-501');
    expect(galatasaray?.home).toEqual({ name: 'Galatasaray', ours: true, team: 'galatasaray' });
    expect(galatasaray?.away).toEqual({ name: 'Liverpool', ours: false, team: 'liverpool' });
    // Under way: the score is not a result yet.
    expect(galatasaray?.result).toBeUndefined();
    const both = rows.find((row) => row.id === 'espn-502');
    expect([both?.home?.ours, both?.away?.ours]).toEqual([true, true]);
  });

  it('carries the final score once a match has ended', () => {
    const morning = tonightWindow(new Date('2026-11-15T07:30:00+03:00'));
    const rows = buildTonight(fixtures, watch, morning);
    expect(rows.find((row) => row.id === 'espn-403')?.result).toEqual({ home: 118, away: 109 });
  });

  it('ends a late edition published after midnight at 09:00 that same morning', () => {
    const late = tonightWindow(new Date('2026-11-16T00:55:00+03:00'));
    expect(late.until.toISOString()).toBe('2026-11-16T06:00:00.000Z');
    const evening = tonightWindow(new Date('2026-11-15T22:30:00+03:00'));
    expect(evening.until.toISOString()).toBe('2026-11-16T06:00:00.000Z');
  });

  it('keeps the rows a writer added', () => {
    const show = {
      id: 'ballon-dor',
      kind: 'show' as const,
      focus: 'person' as const,
      name: { en: 'Arda Güler', tr: 'Arda Güler' },
      competition: { en: "Ballon d'Or", tr: "Ballon d'Or" },
      event: { en: 'Nominated', tr: 'Aday' },
      startsAt: '2026-11-15T22:00:00+03:00',
    };
    const rows = buildTonight(fixtures, watch, window, [show]);
    expect(rows.some((row) => row.id === 'ballon-dor')).toBe(true);
  });
});

describe('today line match', () => {
  it('finds the fixture a label names, in either order', () => {
    expect(findFixture('Liverpool – Galatasaray', fixtures)?.ref).toBe('soccer/uefa.champions/501');
    expect(findFixture('Türkiye v Spain', fixtures)?.id).toBe('espn-601');
    expect(findFixture('Türkiye – France', fixtures)).toBeUndefined();
  });

  it('adds the live address to the match only', () => {
    const items = withLiveMatch(
      [
        {
          kind: 'match',
          label: { en: 'Real Madrid – Juventus', tr: 'Real Madrid – Juventus' },
          value: '23:00',
          source: 'UEFA',
          asOf: '2026-11-15T18:00:00+03:00',
        },
        {
          kind: 'weather',
          label: { en: 'Istanbul', tr: 'İstanbul' },
          value: '14°C',
          source: 'Open-Meteo',
          asOf: '2026-11-15T18:00:00+03:00',
        },
      ],
      fixtures,
    );
    expect(items[0]?.live).toEqual({ source: 'espn', ref: 'soccer/uefa.champions/502' });
    expect(items[1]?.live).toBeUndefined();
  });
});
