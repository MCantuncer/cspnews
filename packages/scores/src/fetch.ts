import type { FetchText } from '@cspnews/collector';
import { teamKey, type AbroadPerson, type TonightItem } from '@cspnews/core';

import { espnScoreboardUrl, parseEspnScoreboard } from './espn.js';
import { euroleagueGamesUrl, euroleagueSeason, parseEuroleagueGames } from './euroleague.js';
import type { Fixture } from './fixture.js';
import { basketballLine, espnSummaryUrl, footballLine } from './summary.js';
import { datesToAsk, type TonightWatch, type TonightWindow } from './tonight.js';

export interface FetchedFixtures {
  readonly fixtures: Fixture[];
  /** Pages that could not be read, with why. A failure never stops the others. */
  readonly failures: { readonly url: string; readonly reason: string }[];
}

/**
 * Fetches JSON. The Euroleague answers in XML unless JSON is asked for first, so the collector's
 * feed fetcher (which prefers RSS and XML) is not used here.
 */
export function httpFetchJson(timeoutMs = 15_000): FetchText {
  return async (url) => {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'CSPNews scores (+https://github.com/MCantuncer/cspnews)',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    return response.text();
  };
}

/** Reads every watched schedule that can hold a match in the window. */
export async function fetchFixtures(
  watch: TonightWatch,
  window: TonightWindow,
  fetchText: FetchText,
): Promise<FetchedFixtures> {
  const failures: FetchedFixtures['failures'] = [];
  const read = async (url: string, parse: (json: unknown) => Fixture[]) => {
    try {
      return parse(JSON.parse(await fetchText(url)));
    } catch (error) {
      failures.push({ url, reason: error instanceof Error ? error.message : String(error) });
      return [];
    }
  };
  const espn = watch.espnLeagues.flatMap((league) =>
    datesToAsk(window).map((date) =>
      read(espnScoreboardUrl(league.path, date), (json) => parseEspnScoreboard(league.path, json)),
    ),
  );
  const season = euroleagueSeason(window.until);
  const euroleague = watch.euroleagueClubs.map((club) =>
    read(euroleagueGamesUrl(season, club.code), (json) => parseEuroleagueGames(season, json)),
  );
  const fixtures = (await Promise.all([...espn, ...euroleague])).flat();
  return { fixtures, failures };
}

/** The team logos the rows use that have a source address: team key to URL. */
export function logosToSave(
  fixtures: readonly Fixture[],
  teams: ReadonlySet<string>,
): Map<string, string> {
  const logos = new Map<string, string>();
  for (const fixture of fixtures) {
    for (const side of [fixture.home, fixture.away]) {
      const key = teamKey(side.display);
      if (side.logo && teams.has(key) && !logos.has(key)) logos.set(key, side.logo);
    }
  }
  return logos;
}

/**
 * Adds the followed people's own numbers to rows that have started, from ESPN's game summaries.
 * A summary that can't be read leaves the row as it was.
 */
export async function withPersonLines(
  rows: readonly TonightItem[],
  people: readonly AbroadPerson[],
  fetchText: FetchText,
  now: Date,
): Promise<TonightItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      if (row.live?.source !== 'espn' || !row.people || Date.parse(row.startsAt) > now.getTime()) {
        return row;
      }
      let json: unknown;
      try {
        json = JSON.parse(await fetchText(espnSummaryUrl(row.live.ref)));
      } catch {
        return row;
      }
      const lines = row.people.flatMap((id) => {
        const person = people.find((p) => p.id === id);
        if (!person) return [];
        const line =
          row.sport === 'basketball' ? basketballLine(json, person) : footballLine(json, person);
        return line ? [line] : [];
      });
      return lines.length > 0 ? { ...row, lines } : row;
    }),
  );
}
