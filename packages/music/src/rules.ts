import { canonKey, type CanonEntry } from './canon.js';
import {
  GENRES,
  PICKS_PER_GENRE,
  TECHNO_MAX_BPM,
  picksOf,
  type Evidence,
  type Genre,
  type MusicEdition,
  type Pick,
} from './edition.js';
import { matchesSource, statedNumbers } from './numbers.js';
import { leadArtist, songKey } from './song.js';

/**
 * The rules a music edition must pass before it is published (docs/music.md, "Checks"). Each
 * problem is one plain sentence naming the pick, so the writer can fix it and run the check again.
 */

export const NEW_MAX_DAYS = 7;
export const CLIMBING_MAX_DAYS = 365;
export const BACK_MIN_DAYS = 730;
export const BACK_MIN_SURGE = 2;
export const BACK_MIN_DAYS_OFF_CHART = 90;
export const REPEAT_DAYS = 30;
export const ALLTIME_REPEAT_DAYS = 180;
/** Two tempo readings further apart than this mean one of them is wrong, so the pick is dropped. */
export const BPM_TOLERANCE = 3;
/** Below this a techno reading is probably half-time and needs a second source. */
export const HALF_TIME_BELOW = 100;
/** How old a number may be when the edition is published. */
export const EVIDENCE_MAX_HOURS = 36;
/** "Top 10", "ilk 20": chart sizes a line may name without evidence. */
const CHART_SIZES = new Set([10, 20, 40, 50, 100, 200]);

const DAY = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export interface CheckContext {
  /** Earlier editions, any order; only the ones before this edition's date count. */
  history: readonly MusicEdition[];
  canon: readonly CanonEntry[];
}

const label = (genre: Genre, pick: Pick) => `${genre} "${pick.title}" (${pick.artists[0] ?? ''})`;

export function checkMusicEdition(edition: MusicEdition, context: CheckContext): string[] {
  const problems: string[] = [];
  const all = picksOf(edition);

  for (const genre of GENRES) {
    const count = edition.genres[genre].length;
    if (count !== PICKS_PER_GENRE) {
      problems.push(`${genre} has ${String(count)} songs; it needs ${String(PICKS_PER_GENRE)}.`);
    }
    const leads = new Map<string, string>();
    for (const pick of edition.genres[genre]) {
      const lead = songKey(leadArtist(pick.artists[0] ?? ''), '');
      const other = leads.get(lead);
      if (other) {
        problems.push(
          `${label(genre, pick)}: ${pick.artists[0] ?? ''} already has "${other}" in ${genre} today.`,
        );
      }
      leads.set(lead, pick.title);
    }
  }

  const ids = new Map<string, string>();
  for (const { genre, pick } of all) {
    const keys = [pick.id, songKey(pick.artists[0] ?? '', pick.title), pick.isrc].filter(
      (key): key is string => Boolean(key),
    );
    for (const key of new Set(keys)) {
      const other = ids.get(key);
      if (other) problems.push(`${label(genre, pick)} is the same song as ${other}.`);
      ids.set(key, label(genre, pick));
    }
  }

  const canon = new Map(context.canon.map((entry) => [canonKey(entry), entry]));
  const earlier = context.history.filter((other) => other.date < edition.date);

  for (const { genre, pick } of all) {
    const name = label(genre, pick);
    const age = daysBetween(pick.released, edition.date);
    if (age < 0) problems.push(`${name}: released ${pick.released}, after the edition's date.`);

    problems.push(...kindProblems(name, pick, age, canon, genre));
    problems.push(...freshnessProblems(name, pick, edition.publishAt));
    if (genre === 'techno') problems.push(...tempoProblems(name, pick));
    problems.push(...numberProblems(name, pick, age));

    if (!pick.play.soundcloud && !pick.play.preview) {
      problems.push(`${name}: nothing to play; it needs a SoundCloud page or a preview.`);
    }

    const window = pick.kind === 'alltime' ? ALLTIME_REPEAT_DAYS : REPEAT_DAYS;
    for (const other of earlier) {
      const gap = daysBetween(other.date, edition.date);
      if (gap > window) continue;
      if (picksOf(other).some(({ pick: old }) => old.id === pick.id)) {
        problems.push(
          `${name} was picked on ${other.date}; it may come back after ${String(window)} days.`,
        );
      }
    }
  }

  return problems;
}

const has = (pick: Pick, metric: Evidence['metric']) =>
  pick.evidence.filter((item) => item.metric === metric);

function kindProblems(
  name: string,
  pick: Pick,
  age: number,
  canon: Map<string, CanonEntry>,
  genre: Genre,
): string[] {
  switch (pick.kind) {
    case 'new': {
      const problems: string[] = [];
      if (age > NEW_MAX_DAYS) {
        problems.push(`${name}: "new" needs a release in the last ${String(NEW_MAX_DAYS)} days.`);
      }
      const reaction = ['rank', 'plays', 'charts'] as const;
      if (!pick.evidence.some((item) => (reaction as readonly string[]).includes(item.metric))) {
        problems.push(`${name}: "new" needs a measured reaction (a rank, plays or charts).`);
      }
      return problems;
    }
    case 'climbing': {
      const problems: string[] = [];
      if (age > CLIMBING_MAX_DAYS) {
        problems.push(
          `${name}: "climbing" needs a release in the last ${String(CLIMBING_MAX_DAYS)} days.`,
        );
      }
      const climbed = has(pick, 'rank').some((now) =>
        has(pick, 'rankBefore').some(
          (before) => before.chart === now.chart && now.value < before.value,
        ),
      );
      if (!climbed)
        problems.push(`${name}: "climbing" needs a better rank than before on one chart.`);
      return problems;
    }
    case 'back': {
      const problems: string[] = [];
      if (age < BACK_MIN_DAYS) {
        problems.push(`${name}: "old song, big again" needs a song at least 2 years old.`);
      }
      const surged = has(pick, 'surge').some((item) => item.value >= BACK_MIN_SURGE);
      const returned =
        has(pick, 'daysOffChart').some((item) => item.value >= BACK_MIN_DAYS_OFF_CHART) &&
        has(pick, 'rank').length > 0;
      if (!surged && !returned) {
        problems.push(
          `${name}: "old song, big again" needs plays at ${String(BACK_MIN_SURGE)}x its usual, or a chart return after ${String(BACK_MIN_DAYS_OFF_CHART)}+ days.`,
        );
      }
      return problems;
    }
    case 'alltime': {
      const entry = canon.get(songKey(pick.artists[0] ?? '', pick.title));
      if (!entry) return [`${name}: "all-time favourite" must come from data/canon.json.`];
      if (entry.genre !== genre) return [`${name}: on the all-time list under ${entry.genre}.`];
      return [];
    }
  }
}

function freshnessProblems(name: string, pick: Pick, publishAt: string): string[] {
  if (pick.kind === 'alltime') return [];
  const published = Date.parse(publishAt);
  return pick.evidence
    .filter((item) => published - Date.parse(item.at) > EVIDENCE_MAX_HOURS * 3_600_000)
    .map(
      (item) =>
        `${name}: the ${item.metric} on ${item.chart} was read at ${item.at}, more than ${String(EVIDENCE_MAX_HOURS)} hours before publishing.`,
    );
}

function tempoProblems(name: string, pick: Pick): string[] {
  const { bpm } = pick;
  if (!bpm) return [`${name}: techno needs a BPM from a source.`];
  const problems: string[] = [];
  if (bpm.value > TECHNO_MAX_BPM) {
    problems.push(`${name}: ${String(bpm.value)} BPM is over ${String(TECHNO_MAX_BPM)}.`);
  }
  if (bpm.confirmedBy && Math.abs(bpm.confirmedBy.value - bpm.value) > BPM_TOLERANCE) {
    problems.push(
      `${name}: ${bpm.source} says ${String(bpm.value)} BPM but ${bpm.confirmedBy.source} says ${String(bpm.confirmedBy.value)}.`,
    );
  }
  if (bpm.value < HALF_TIME_BELOW && !bpm.confirmedBy) {
    problems.push(
      `${name}: ${String(bpm.value)} BPM may be a half-time reading; it needs a second source.`,
    );
  }
  return problems;
}

/** Numbers a reason line may state besides the evidence values. */
function allowedNumbers(pick: Pick, age: number): number[] {
  const values = pick.evidence.map((item) => item.value);
  const ranks = has(pick, 'rank');
  const before = has(pick, 'rankBefore');
  const moves = ranks.flatMap((now) =>
    before.filter((then) => then.chart === now.chart).map((then) => then.value - now.value),
  );
  const year = Number(pick.released.slice(0, 4));
  const named = pick.evidence.flatMap((item) => statedNumbers(item.chart).map((n) => n.value));
  const extra = [year, age, Math.floor(age / 365), Math.round(age / 365), ...moves, ...named];
  if (pick.bpm) extra.push(pick.bpm.value);
  return [...values, ...extra];
}

function numberProblems(name: string, pick: Pick, age: number): string[] {
  const allowed = allowedNumbers(pick, age);
  const problems: string[] = [];
  for (const lang of ['en', 'tr'] as const) {
    const line = pick.reason[lang];
    for (const stated of statedNumbers(line)) {
      if (CHART_SIZES.has(stated.value) && !stated.rounded) continue;
      if (!allowed.some((value) => matchesSource(stated, value))) {
        problems.push(`${name}: "${stated.text}" in the ${lang} reason is not in the evidence.`);
      }
    }
  }
  return problems;
}
