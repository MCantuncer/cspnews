import type { Bilingual, EspnLeague, EuroleagueClub, PersonClub } from '@cspnews/config';
import {
  ISTANBUL_UTC_OFFSET_MINUTES,
  TONIGHT_MAX,
  foldName,
  sortTonight,
  teamKey,
  type AbroadPerson,
  type Scorer,
  type TonightFocus,
  type TonightItem,
} from '@cspnews/core';

import type { Fixture, FixtureScorer, FixtureSide } from './fixture.js';

/**
 * The Tonight rules (docs/design/decisions/tonight.md): which matches become rows. No writer and
 * no model is involved; a match is ours when one side is the national team, a Turkish club in a
 * European competition, or the club of someone on the Turks abroad list.
 */
export interface TonightWatch {
  readonly espnLeagues: readonly EspnLeague[];
  readonly nationalTeam: readonly string[];
  readonly nationalLeagues: readonly string[];
  readonly turkishClubs: readonly string[];
  readonly clubLeagues: readonly string[];
  readonly personClubs: readonly PersonClub[];
  readonly euroleagueClubs: readonly EuroleagueClub[];
  readonly euroleague: Bilingual;
  readonly people: readonly AbroadPerson[];
}

export interface TonightWindow {
  readonly from: Date;
  readonly until: Date;
}

const HOUR = 3_600_000;

/**
 * The matches a bulletin carries: from ten hours before it, so the morning bulletin still has last
 * night's results, to 09:00 Istanbul time on the day after its own, so the evening's matches and
 * the night's NBA games are all in.
 */
export function tonightWindow(publishAt: Date): TonightWindow {
  const offset = ISTANBUL_UTC_OFFSET_MINUTES * 60_000;
  const local = new Date(publishAt.getTime() + offset);
  const nextMorning = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
    9,
  );
  return { from: new Date(publishAt.getTime() - 10 * HOUR), until: new Date(nextMorning - offset) };
}

/** The calendar dates (yyyy-mm-dd, UTC and US) a source must be asked for to cover the window. */
export function datesToAsk(window: TonightWindow): string[] {
  const dates = new Set<string>();
  // US scoreboards file a 04:00 Istanbul game under the day before, so ask a day early too.
  for (let at = window.from.getTime() - 24 * HOUR; at <= window.until.getTime(); at += 24 * HOUR) {
    dates.add(new Date(at).toISOString().slice(0, 10));
  }
  dates.add(window.until.toISOString().slice(0, 10));
  return [...dates];
}

const matches = (side: FixtureSide, names: readonly string[]) => {
  const wanted = new Set(names.map(foldName));
  return side.names.some((name) => wanted.has(foldName(name)));
};

interface Reason {
  readonly focus: TonightFocus;
  readonly side: 'home' | 'away';
  readonly people: readonly string[];
}

function reasonsFor(fixture: Fixture, watch: TonightWatch): Reason[] {
  const reasons: Reason[] = [];
  for (const sideKey of ['home', 'away'] as const) {
    const side = fixture[sideKey];
    if (fixture.source === 'euroleague') {
      for (const club of watch.euroleagueClubs) {
        if (!side.names.includes(club.code)) continue;
        reasons.push(
          club.personId
            ? { focus: 'person', side: sideKey, people: [club.personId] }
            : { focus: 'club', side: sideKey, people: [] },
        );
      }
      continue;
    }
    if (watch.nationalLeagues.includes(fixture.league) && matches(side, watch.nationalTeam)) {
      reasons.push({ focus: 'national', side: sideKey, people: [] });
    }
    if (watch.clubLeagues.includes(fixture.league) && matches(side, watch.turkishClubs)) {
      reasons.push({ focus: 'club', side: sideKey, people: [] });
    }
    const people = watch.personClubs
      .filter((club) => club.leagues.includes(fixture.league) && matches(side, club.team))
      .map((club) => club.personId);
    if (people.length > 0) reasons.push({ focus: 'person', side: sideKey, people });
  }
  return reasons;
}

const RANK: Record<TonightFocus, number> = { national: 0, club: 1, person: 2 };

function competitionOf(fixture: Fixture, watch: TonightWatch): Bilingual | undefined {
  if (fixture.source === 'euroleague') return watch.euroleague;
  return watch.espnLeagues.find((league) => league.path === fixture.league)?.competition;
}

function sportOf(fixture: Fixture, watch: TonightWatch): 'football' | 'basketball' | undefined {
  if (fixture.source === 'euroleague') return 'basketball';
  return watch.espnLeagues.find((league) => league.path === fixture.league)?.sport;
}

/** A source's scorer as the bulletin keeps it: the photo by its saved key, not its address. */
export function scorerOf(scorer: FixtureScorer): Scorer {
  return {
    side: scorer.side,
    name: scorer.name,
    ...(scorer.minutes && { minutes: [...scorer.minutes] }),
    ...(scorer.points !== undefined && { points: scorer.points }),
    ...(scorer.own && { own: true }),
    ...(scorer.penalty && { penalty: true }),
    ...(scorer.photo && { photo: scorer.photo.key }),
  };
}

function sideOf(side: FixtureSide, ours: boolean) {
  const team = teamKey(side.display);
  return { name: side.display, ours, ...(side.logo && team && { team }) };
}

/** One fixture as a row, or nothing when it is not ours. */
export function rowFor(fixture: Fixture, watch: TonightWatch): TonightItem | undefined {
  const reasons = reasonsFor(fixture, watch);
  const competition = competitionOf(fixture, watch);
  const sport = sportOf(fixture, watch);
  if (reasons.length === 0 || !competition || !sport) return undefined;
  const top = [...reasons].sort((a, b) => RANK[a.focus] - RANK[b.focus])[0];
  if (!top) return undefined;
  const ours = new Set(reasons.map((reason) => reason.side));
  const people = [...new Set(reasons.flatMap((reason) => reason.people))];
  const names = people.flatMap((id) => {
    const person = watch.people.find((p) => p.id === id);
    return person ? [person.name] : [];
  });
  const name: Bilingual =
    top.focus === 'national'
      ? { en: 'Türkiye', tr: 'Türkiye' }
      : top.focus === 'club'
        ? { en: fixture[top.side].display, tr: fixture[top.side].display }
        : { en: names.join(', '), tr: names.join(', ') };
  if (name.en.length === 0) return undefined;
  const { home, away } = fixture;
  return {
    id: fixture.id,
    kind: 'match',
    sport,
    focus: top.focus,
    ...(people.length > 0 && { people: people.slice(0, 4) }),
    name,
    competition,
    home: sideOf(home, ours.has('home')),
    away: sideOf(away, ours.has('away')),
    startsAt: fixture.startsAt,
    live: { source: fixture.source, ref: fixture.ref },
    ...(top.focus !== 'person' &&
      fixture.scorers &&
      fixture.scorers.length > 0 && { scorers: fixture.scorers.slice(0, 16).map(scorerOf) }),
    ...(fixture.completed &&
      home.score !== undefined &&
      away.score !== undefined && { result: { home: home.score, away: away.score } }),
  };
}

/**
 * The bulletin's Tonight list: the rows the rules found in the window, plus the rows a writer
 * added (shows, and matches no source covers), at most TONIGHT_MAX. Writer rows are kept first.
 */
export function buildTonight(
  fixtures: readonly Fixture[],
  watch: TonightWatch,
  window: TonightWindow,
  written: readonly TonightItem[] = [],
): TonightItem[] {
  const inWindow = (startsAt: string) => {
    const at = Date.parse(startsAt);
    return at >= window.from.getTime() && at <= window.until.getTime();
  };
  const seen = new Set<string>();
  const found: TonightItem[] = [];
  for (const fixture of fixtures) {
    if (seen.has(fixture.id) || !inWindow(fixture.startsAt)) continue;
    const row = rowFor(fixture, watch);
    if (!row) continue;
    seen.add(fixture.id);
    found.push(row);
  }
  const ranked = [...found].sort(
    (a, b) => RANK[a.focus] - RANK[b.focus] || Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  const writerRows = written.filter((item) => !item.live && !seen.has(item.id));
  return sortTonight([...writerRows, ...ranked].slice(0, TONIGHT_MAX));
}
