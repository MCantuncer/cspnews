import { describe, expect, it } from 'vitest';

import { definePeople } from '@cspnews/core';

import { parseRefs, readEspn, readEuroleague } from './scores.js';

const people = definePeople([
  { id: 'alperen-sengun', name: 'Alperen Şengün', aliases: ['Alperen Sengun'], kind: 'basketball' },
]);

describe('live refs', () => {
  it('keeps only well-formed refs, so the Worker is no open proxy', () => {
    const refs = parseRefs(
      'espn:basketball/nba/401,euroleague:E2026/98,espn:../../evil,http://x.example,espn:soccer/eng.1/7',
    );
    expect(refs.map((ref) => ref.key)).toEqual([
      'espn:basketball/nba/401',
      'euroleague:E2026/98',
      'espn:soccer/eng.1/7',
    ]);
    expect(refs[0]?.url).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401',
    );
    expect(refs[1]?.url).toBe(
      'https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games/98?format=json',
    );
    expect(parseRefs(null)).toEqual([]);
  });
});

describe('reading a live score', () => {
  const summary = (state: string, home: string, away: string) => ({
    header: {
      competitions: [
        {
          status: { type: { state, shortDetail: state === 'in' ? '3rd 4:12' : 'Final' } },
          competitors: [
            { homeAway: 'home', score: home },
            { homeAway: 'away', score: away },
          ],
        },
      ],
    },
    boxscore: {
      players: [
        {
          statistics: [
            {
              keys: ['points', 'rebounds', 'assists'],
              athletes: [{ athlete: { displayName: 'Alperen Sengun' }, stats: ['21', '9', '5'] }],
            },
          ],
        },
      ],
    },
  });

  it('reads a game being played, with the clock and our player’s numbers', () => {
    expect(
      readEspn('espn:basketball/nba/401', 'basketball/nba/401', summary('in', '78', '74'), people),
    ).toEqual({
      ref: 'espn:basketball/nba/401',
      state: 'in',
      home: 78,
      away: 74,
      clock: '3rd 4:12',
      lines: [{ person: 'alperen-sengun', points: 21, rebounds: 9, assists: 5 }],
    });
  });

  it('gives no score before the start', () => {
    const score = readEspn('k', 'basketball/nba/401', summary('pre', '0', '0'), people);
    expect(score).toEqual({ ref: 'k', state: 'pre' });
  });

  it('reads a Euroleague game, which has no clock', () => {
    const page = (played: boolean, local: number, road: number) => ({
      played,
      local: { score: local },
      road: { score: road },
    });
    expect(readEuroleague('k', page(false, 0, 0))).toEqual({ ref: 'k', state: 'pre' });
    expect(readEuroleague('k', page(false, 58, 61))).toEqual({
      ref: 'k',
      state: 'in',
      home: 58,
      away: 61,
    });
    expect(readEuroleague('k', page(true, 88, 80))).toMatchObject({ state: 'post', home: 88 });
  });
});
