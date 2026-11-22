import { describe, expect, it } from 'vitest';

import { definePeople } from '@cspnews/core';

import { basketballLine, espnSummaryUrl, footballLine } from './summary.js';

// Hand-made pages in the shape of ESPN's game summaries, cut to the fields read.
const [alperen, arda] = definePeople([
  { id: 'alperen-sengun', name: 'Alperen Şengün', aliases: ['Alperen Sengun'], kind: 'basketball' },
  { id: 'arda-guler', name: 'Arda Güler', aliases: ['Arda Guler'], kind: 'football' },
]);

describe('game summaries', () => {
  it('builds the summary address from a live ref', () => {
    expect(espnSummaryUrl('basketball/nba/401')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401',
    );
  });

  it('reads a basketball player’s points, rebounds and assists', () => {
    const page = {
      boxscore: {
        players: [
          {
            statistics: [
              {
                keys: ['minutes', 'points', 'rebounds', 'assists'],
                athletes: [
                  { athlete: { displayName: 'Jabari Smith Jr.' }, stats: ['30', '12', '6', '1'] },
                  { athlete: { displayName: 'Alperen Sengun' }, stats: ['36', '27', '13', '8'] },
                ],
              },
            ],
          },
        ],
      },
    };
    expect(alperen && basketballLine(page, alperen)).toEqual({
      person: 'alperen-sengun',
      points: 27,
      rebounds: 13,
      assists: 8,
      minutes: 36,
    });
  });

  it('says when a basketball player was left out', () => {
    const page = {
      boxscore: {
        players: [
          {
            statistics: [
              {
                keys: ['minutes', 'points'],
                athletes: [
                  { athlete: { displayName: 'Alperen Sengun' }, stats: [], didNotPlay: true },
                ],
              },
            ],
          },
        ],
      },
    };
    expect(alperen && basketballLine(page, alperen)).toEqual({
      person: 'alperen-sengun',
      didNotPlay: 'unused',
    });
  });

  it('gives no line to a player who did not play', () => {
    const page = {
      boxscore: {
        players: [
          {
            statistics: [
              {
                labels: ['MIN', 'PTS'],
                athletes: [{ athlete: { displayName: 'Alperen Şengün' }, stats: ['--', '--'] }],
              },
            ],
          },
        ],
      },
    };
    expect(alperen && basketballLine(page, alperen)).toBeUndefined();
  });

  it('reads a footballer’s goals and assists', () => {
    const page = {
      rosters: [
        {
          roster: [
            {
              athlete: { displayName: 'Arda Güler' },
              stats: [
                { name: 'totalGoals', value: 1 },
                { name: 'goalAssists', value: 1 },
              ],
            },
          ],
        },
      ],
    };
    expect(arda && footballLine(page, arda)).toEqual({
      person: 'arda-guler',
      goals: 1,
      assists: 1,
    });
    expect(arda && footballLine({ rosters: [] }, arda)).toBeUndefined();
  });

  describe('minutes on the pitch, once the match is over', () => {
    const over = { header: { competitions: [{ status: { type: { state: 'post' } } }] } };
    const others = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ athlete: { displayName: `Player ${String(i)}` } }));
    const sheet = (entry: Record<string, unknown> | undefined, state = over) => ({
      ...state,
      rosters: [
        {
          roster: [
            ...others(13),
            ...(entry ? [{ athlete: { displayName: 'Arda Guler' }, ...entry }] : []),
          ],
        },
        { roster: others(14) },
      ],
    });
    const sub = (minute: string) => ({ substitution: true, clock: { displayValue: minute } });

    it('gives a starter who stayed on the whole match', () => {
      expect(arda && footballLine(sheet({ starter: true }), arda)).toEqual({
        person: 'arda-guler',
        minutes: 90,
      });
    });

    it('counts a starter until they came off, and a substitute from when they came on', () => {
      const off = sheet({ starter: true, subbedOut: true, plays: [sub("64'")] });
      expect(arda && footballLine(off, arda)?.minutes).toBe(64);
      const on = sheet({ starter: false, subbedIn: { didSub: true }, plays: [sub("71'")] });
      expect(arda && footballLine(on, arda)?.minutes).toBe(19);
      const both = sheet({ subbedIn: true, subbedOut: true, plays: [sub("46'"), sub("80'")] });
      expect(arda && footballLine(both, arda)?.minutes).toBe(34);
    });

    it('says an unused substitute and a player not in the squad apart', () => {
      expect(arda && footballLine(sheet({ starter: false, subbedIn: false }), arda)).toEqual({
        person: 'arda-guler',
        didNotPlay: 'unused',
      });
      expect(arda && footballLine(sheet(undefined), arda)).toEqual({
        person: 'arda-guler',
        didNotPlay: 'notInSquad',
      });
    });

    it('says nothing of minutes or absence while the match is on', () => {
      const live = { header: { competitions: [{ status: { type: { state: 'in' } } }] } };
      expect(arda && footballLine(sheet({ starter: true }, live), arda)).toEqual({
        person: 'arda-guler',
      });
      expect(arda && footballLine(sheet(undefined, live), arda)).toBeUndefined();
    });
  });
});
