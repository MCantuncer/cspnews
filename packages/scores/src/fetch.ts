import type { FetchText } from '@cspnews/collector';
import { teamKey } from '@cspnews/core';

import { espnScoreboardUrl, parseEspnScoreboard } from './espn.js';
import { euroleagueGamesUrl, euroleagueSeason, parseEuroleagueGames } from './euroleague.js';
import type { Fixture } from './fixture.js';
import { datesToAsk, type TonightWatch, type TonightWindow } from './tonight.js';

export interface FetchedFixtures {
  readonly fixtures: Fixture[];
  /** Pages that could not be read, with why. A failure never stops the others. */
  readonly failures: { readonly url: string; readonly reason: string }[];
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
