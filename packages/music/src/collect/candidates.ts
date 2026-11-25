import type { Evidence, Genre } from '../edition.js';
import { songKey } from '../song.js';
import type { Taste } from '../taste.js';
import { TECHNO_MAX_BPM } from '../edition.js';
import type { History, Snapshot } from './history.js';
import type { ChartEntry } from './types.js';

/**
 * Turns a day's chart entries into ranked candidates per genre (docs/music.md, "Sources" and
 * "Ranking"). A song is a candidate only when a genre chart has it: a rap chart for the two rap
 * genres, Beatport for techno. Charts of every genre add numbers but never bring a song in.
 * The writer picks the day's five from the top of each list; the numbers it may quote are in
 * each candidate's `evidence`, ready to copy into the edition.
 */

export interface Candidate {
  key: string;
  genre: Genre;
  title: string;
  artists: string[];
  isrc?: string;
  /** The earliest release date any source gives. */
  released?: string;
  bpm?: number;
  /** Where the tempo was read: a Beatport or Deezer track page. */
  bpmFrom?: string;
  label?: string;
  genreTags: string[];
  links: { spotify?: string; appleMusic?: string; beatport?: string; deezer?: string };
  preview?: string;
  artwork?: string;
  durationSec?: number;
  evidence: Evidence[];
  /** Why the score is what it is, in short words, for the writer. */
  notes: string[];
  score: number;
}

export interface CandidateDay {
  date: string;
  readAt: string;
  genres: Record<Genre, Candidate[]>;
}

/** Techno slower than this is probably a half-time reading or not techno for this page. */
export const TECHNO_MIN_BPM = 120;
/** How many candidates per genre are kept for the writer. */
export const CANDIDATES_PER_GENRE = 30;
const NEW_DAYS = 14;

const TURKISH_LETTERS = /[çğıöşüÇĞİÖŞÜ]/;

const keyOf = (entry: ChartEntry) => songKey(entry.artists[0] ?? '', entry.title);

/** The day's snapshot for the history file. */
export function snapshotOf(date: string, entries: readonly ChartEntry[]): Snapshot {
  return {
    date,
    rows: entries.map((entry) => ({
      key: keyOf(entry),
      chart: entry.chart.id,
      rank: entry.rank,
      ...(entry.plays === undefined ? {} : { plays: entry.plays }),
    })),
  };
}

function genreOf(entries: readonly ChartEntry[]): Genre | undefined {
  if (entries.some((entry) => entry.chart.genre === 'techno')) return 'techno';
  if (!entries.some((entry) => entry.chart.genre === 'rap')) return undefined;
  const turkish = entries.some((entry) => entry.chart.country === 'tr');
  const abroad = entries.some(
    (entry) => entry.chart.country === 'us' || entry.chart.country === 'global',
  );
  const letters = entries.some(
    (entry) =>
      TURKISH_LETTERS.test(entry.title) || entry.artists.some((a) => TURKISH_LETTERS.test(a)),
  );
  if (turkish && (!abroad || letters)) return 'turkey';
  return 'global';
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** A techno tempo this page takes: 120 to 134 BPM. */
export const technoTempo = (bpm: number) => bpm >= TECHNO_MIN_BPM && bpm <= TECHNO_MAX_BPM;

const dayBefore = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

const fold = (name: string) => name.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

export function buildCandidates(
  date: string,
  readAt: string,
  entries: readonly ChartEntry[],
  history: History,
  taste: Taste,
): CandidateDay {
  const bySong = new Map<string, ChartEntry[]>();
  const isrcKey = new Map<string, string>();
  for (const entry of entries) {
    let key = keyOf(entry);
    if (entry.isrc) {
      const known = isrcKey.get(entry.isrc);
      if (known) key = known;
      else isrcKey.set(entry.isrc, key);
    }
    bySong.set(key, [...(bySong.get(key) ?? []), entry]);
  }

  const genres: Record<Genre, Candidate[]> = { global: [], turkey: [], techno: [] };
  for (const [key, songEntries] of bySong) {
    const genre = genreOf(songEntries);
    if (!genre) continue;
    const candidate = toCandidate(key, genre, songEntries, date, readAt, history, taste);
    if (candidate) genres[genre].push(candidate);
  }
  for (const genre of Object.keys(genres) as Genre[]) {
    genres[genre] = genres[genre].sort((a, b) => b.score - a.score).slice(0, CANDIDATES_PER_GENRE);
  }
  return { date, readAt, genres };
}

function toCandidate(
  key: string,
  genre: Genre,
  entries: readonly ChartEntry[],
  date: string,
  readAt: string,
  history: History,
  taste: Taste,
): Candidate | undefined {
  // The richest entry names the song: Beatport for techno, Apple or Spotify for rap.
  const lead =
    entries.find((entry) => entry.chart.source === 'beatport') ??
    entries.find((entry) => entry.chart.genre === 'rap') ??
    entries[0];
  if (!lead) return undefined;

  const tempo = entries.find((entry) => entry.bpm !== undefined);
  const bpm = tempo?.bpm;
  // Unknown tempo stays in for now: the Collect asks Deezer and drops what is still unknown.
  if (genre === 'techno' && bpm !== undefined && !technoTempo(bpm)) return undefined;

  const released = entries
    .map((entry) => entry.released)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const age = released ? daysBetween(released, date) : undefined;

  const evidence: Evidence[] = [];
  const notes: string[] = [];
  let score = 0;
  for (const entry of entries) {
    const { chart } = entry;
    const size = 100;
    const weight = chart.genre ? 1 : 0.6;
    score += weight * Math.max(0, 1 - (entry.rank - 1) / size);
    evidence.push({
      source: chart.source,
      metric: 'rank',
      value: entry.rank,
      chart: chart.name,
      at: readAt,
      url: chart.url,
    });
    if (entry.plays !== undefined) {
      evidence.push({
        source: chart.source,
        metric: 'plays',
        value: entry.plays,
        chart: chart.name,
        at: readAt,
        url: chart.url,
      });
    }
    const signals = history.signals(date, chart.id, key, entry.plays);
    // Our own history wins; until it has yesterday, a chart that prints the change gives it.
    if (!signals.rankBefore && entry.rankBefore !== undefined) {
      signals.rankBefore = { rank: entry.rankBefore, date: dayBefore(date) };
    }
    if (signals.rankBefore) {
      evidence.push({
        source: chart.source,
        metric: 'rankBefore',
        value: signals.rankBefore.rank,
        chart: chart.name,
        at: readAt,
        before: signals.rankBefore.date,
        url: chart.url,
      });
      const climb = signals.rankBefore.rank - entry.rank;
      if (climb >= 5) {
        score += Math.min(0.5, climb / 40);
        notes.push(`up ${String(climb)} on ${chart.name}`);
      }
    } else if (signals.daysOnChart === 1 && history.has(chart.id)) {
      notes.push(`new on ${chart.name} today`);
    }
    if (signals.daysOnChart > 1) {
      evidence.push({
        source: chart.source,
        metric: 'daysOnChart',
        value: signals.daysOnChart,
        chart: chart.name,
        at: readAt,
        url: chart.url,
      });
    }
    if (signals.usualPlays !== undefined && signals.surge !== undefined) {
      evidence.push({
        source: chart.source,
        metric: 'usualPlays',
        value: signals.usualPlays,
        chart: chart.name,
        at: readAt,
        url: chart.url,
      });
      evidence.push({
        source: chart.source,
        metric: 'surge',
        value: signals.surge,
        chart: chart.name,
        at: readAt,
        url: chart.url,
      });
      if (signals.surge >= 2) {
        score += 0.6;
        notes.push(`plays at ${String(signals.surge)}x its usual on ${chart.name}`);
      }
    }
    if (signals.daysOffChart !== undefined && signals.daysOffChart >= 90) {
      evidence.push({
        source: chart.source,
        metric: 'daysOffChart',
        value: signals.daysOffChart,
        chart: chart.name,
        at: readAt,
        url: chart.url,
      });
      score += 0.6;
      notes.push(`back on ${chart.name} after ${String(signals.daysOffChart)} days`);
    }
  }

  if (age !== undefined && age >= 0 && age <= NEW_DAYS) {
    score += 0.5;
    notes.push(`out ${String(age)} days ago`);
  }
  if (age !== undefined && age > 730 && !notes.some((note) => /usual|back on/.test(note))) {
    // An old song that is simply still on a chart is not news for this page.
    score -= 0.5;
    notes.push('old and only still charting: not a comeback');
  }

  const genreTaste = taste.genres[genre];
  const favourites = new Set(genreTaste.favouriteArtists.map(fold));
  if (entries.some((entry) => entry.artists.some((artist) => favourites.has(fold(artist))))) {
    score += 0.4;
    notes.push('a favourite artist');
  }
  if (genre === 'techno') {
    const raw = entries.some((entry) => /raw|hypnotic|tunnel/i.test(entry.chart.name));
    if (raw) {
      score += 0.3;
      notes.push('Raw / Deep / Hypnotic or Techno Tunnel');
    } else {
      notes.push('only on a general techno chart: check it is heavy and driving, not big-room');
    }
  }

  const links: Candidate['links'] = {};
  for (const entry of entries) {
    if (entry.ids.spotify) links.spotify ??= `https://open.spotify.com/track/${entry.ids.spotify}`;
    if (entry.chart.source === 'apple' && entry.link?.includes('music.apple.com'))
      links.appleMusic ??= entry.link;
    if (entry.chart.source === 'beatport' && entry.link) links.beatport ??= entry.link;
    if (entry.chart.source === 'deezer' && entry.link) links.deezer ??= entry.link;
  }
  const isrc = entries.find((entry) => entry.isrc)?.isrc;
  const preview = entries.find((entry) => entry.preview)?.preview;
  const artwork = entries.find((entry) => entry.cover?.includes('mzstatic.com'))?.cover;
  const durationMs = entries.find((entry) => entry.durationMs)?.durationMs;
  const label = entries.find((entry) => entry.label)?.label;

  return {
    key,
    genre,
    title: lead.title,
    artists: lead.artists,
    ...(isrc ? { isrc } : {}),
    ...(released ? { released } : {}),
    ...(bpm === undefined ? {} : { bpm }),
    ...(bpm !== undefined && tempo?.link ? { bpmFrom: tempo.link } : {}),
    ...(label ? { label } : {}),
    genreTags: [...new Set(entries.flatMap((entry) => entry.genreTags))],
    links,
    ...(preview ? { preview } : {}),
    ...(artwork ? { artwork } : {}),
    ...(durationMs ? { durationSec: Math.round(durationMs / 1000) } : {}),
    evidence,
    notes,
    score: Math.round(score * 100) / 100,
  };
}
