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
});
