import { describe, expect, it } from 'vitest';

import { definePeople } from '@cspnews/core';

import {
  espnScorers,
  parseRefs,
  readEspn,
  readEuroleague,
  readEuroleagueHeader,
} from './scores.js';

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
    expect(refs[1]?.headerUrl).toBe(
      'https://live.euroleague.net/api/Header?gamecode=98&seasoncode=E2026',
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

describe('the Euroleague live header', () => {
  const header = (live: boolean, a: string, b: string, quarter: string, left: string) => ({
    Live: live,
    ScoreA: a,
    ScoreB: b,
    Quarter: quarter,
    RemainingPartialTime: left,
  });

  it('reads a game being played, with its quarter and time left', () => {
    // Zalgiris v Panathinaikos, 2026-11-19, while the season game page still read 0–0.
    expect(readEuroleagueHeader('k', header(true, '52', '52', '3', '03:35'))).toEqual({
      ref: 'k',
      state: 'in',
      home: 52,
      away: 52,
      clock: 'Q3 3:35',
    });
    expect(readEuroleagueHeader('k', header(true, '80', '80', '5', '01:12'))).toMatchObject({
      clock: 'OT 1:12',
    });
    // Between quarters the header may drop Live while it still names the quarter.
    expect(readEuroleagueHeader('k', header(false, '39', '47', '2', '00:00'))).toMatchObject({
      state: 'in',
    });
  });

  it('reads a game not started, and one that is over', () => {
    expect(readEuroleagueHeader('k', header(false, '0', '0', '', '10:00'))).toEqual({
      ref: 'k',
      state: 'pre',
    });
    expect(readEuroleagueHeader('k', header(false, '85', '78', '', '00:00'))).toEqual({
      ref: 'k',
      state: 'post',
      home: 85,
      away: 78,
    });
    expect(readEuroleagueHeader('k', { error: 'nope' })).toBeUndefined();
  });
});

describe('scorers', () => {
  it('reads one match’s goal scorers off its league’s scoreboard', () => {
    const board = {
      events: [
        {
          id: '501',
          date: '2026-11-15T20:00Z',
          status: { type: { state: 'in', completed: false } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '1', team: { id: '432', displayName: 'Galatasaray' } },
                { homeAway: 'away', score: '0', team: { id: '364', displayName: 'Liverpool' } },
              ],
              details: [
                {
                  scoringPlay: true,
                  clock: { displayValue: "23'" },
                  team: { id: '432' },
                  athletesInvolved: [{ id: '9', displayName: 'Victor Osimhen' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(espnScorers('soccer/uefa.champions/501', board)).toEqual([
      { side: 'home', name: 'Victor Osimhen', minutes: ["23'"] },
    ]);
    expect(espnScorers('soccer/uefa.champions/999', board)).toEqual([]);
    expect(parseRefs('espn:soccer/uefa.champions/501')[0]?.scorersUrl).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
    );
  });
});
