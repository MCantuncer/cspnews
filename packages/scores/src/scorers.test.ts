import { describe, expect, it } from 'vitest';

import { goalScorers, parseEspnScoreboard } from './espn.js';
import { euroleaguePlayerName, euroleagueStatsUrl, euroleagueTopScorers } from './euroleague.js';
import { photosToSave } from './fetch.js';
import { scorerOf } from './tonight.js';

// Goal entries in the shape ESPN's scoreboard `details` uses, cut to the fields read.
const goal = (
  minute: string,
  teamId: string,
  athlete: { id: string; displayName: string; headshot?: string },
  extra: Record<string, unknown> = {},
) => ({
  scoringPlay: true,
  ownGoal: false,
  penaltyKick: false,
  clock: { value: 0, displayValue: minute },
  team: { id: teamId },
  athletesInvolved: [athlete],
  ...extra,
});

const osimhen = {
  id: '231388',
  displayName: 'Victor Osimhen',
  headshot: 'https://a.espncdn.com/i/headshots/soccer/players/full/231388.png',
};
const salah = { id: '158301', displayName: 'Mohamed Salah' };

describe('goal scorers', () => {
  it('gathers each player’s goals for their side, in order, with their photo', () => {
    const scorers = goalScorers(
      [
        goal("23'", '432', osimhen),
        goal("41'", '364', salah, { penaltyKick: true }),
        goal("90+2'", '432', osimhen),
        { scoringPlay: false, clock: { displayValue: "50'" } },
        goal('soon', '432', osimhen),
      ],
      { home: '432', away: '364' },
    );
    expect(scorers).toEqual([
      {
        side: 'home',
        name: 'Victor Osimhen',
        minutes: ["23'", "90+2'"],
        photo: { key: 'espn-231388', url: osimhen.headshot },
      },
      { side: 'away', name: 'Mohamed Salah', minutes: ["41'"], penalty: true },
    ]);
  });

  it('keeps an own goal apart from the same player’s goals', () => {
    const scorers = goalScorers(
      [goal("10'", '1', salah), goal("20'", '1', salah, { ownGoal: true })],
      { home: '1', away: '2' },
    );
    expect(scorers.map((s) => [s.minutes, s.own])).toEqual([
      [["10'"], undefined],
      [["20'"], true],
    ]);
  });

  it('reads the scorers off a scoreboard and saves only the photos a row names', () => {
    const team = (id: string, displayName: string) => ({ id, displayName });
    const [fixture] = parseEspnScoreboard('soccer/uefa.champions', {
      events: [
        {
          id: '501',
          date: '2026-11-15T20:00Z',
          status: { type: { state: 'in', completed: false } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '1', team: team('432', 'Galatasaray') },
                { homeAway: 'away', score: '0', team: team('364', 'Liverpool') },
              ],
              details: [goal("23'", '432', osimhen)],
            },
          ],
        },
      ],
    });
    expect(fixture?.scorers?.map(scorerOf)).toEqual([
      { side: 'home', name: 'Victor Osimhen', minutes: ["23'"], photo: 'espn-231388' },
    ]);
    const row = { scorers: fixture?.scorers?.map(scorerOf) };
    expect([...photosToSave(fixture ? [fixture] : [], [row as never])]).toEqual([
      ['espn-231388', osimhen.headshot],
    ]);
  });
});

describe('euroleague top scorers', () => {
  const player = (name: string, points: number, headshot?: string) => ({
    player: { person: { code: name.slice(0, 3), name }, images: headshot ? { headshot } : {} },
    stats: { points },
  });

  it('takes each side’s top scorer with their official photo', () => {
    const scorers = euroleagueTopScorers({
      local: {
        players: [player('PETERS, ALEC', 17, 'https://m.example/p.png'), player('X, Y', 4)],
      },
      road: { players: [player('HAYES-DAVIS, NIGEL', 24), { broken: true }] },
    });
    expect(scorers).toEqual([
      {
        side: 'home',
        name: 'Alec Peters',
        points: 17,
        photo: { key: 'euroleague-pet', url: 'https://m.example/p.png' },
      },
      { side: 'away', name: 'Nigel Hayes-Davis', points: 24 },
    ]);
  });

  it('writes names as people read them, and finds the box score', () => {
    expect(euroleaguePlayerName("O'NEALE, ROYCE")).toBe("Royce O'Neale");
    expect(euroleagueStatsUrl('E2026/98')).toBe(
      'https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games/98/stats?format=json',
    );
  });
});
