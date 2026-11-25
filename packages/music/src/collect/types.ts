import type { EvidenceSource, Genre } from '../edition.js';

/**
 * What the music Collect reads (docs/music.md, "Sources"). Readers turn each source into chart
 * entries; `join.ts` merges the entries of one song; `score.ts` ranks the songs per genre.
 */

/** Fetches a URL and returns its body; throws on failure. Injected so tests need no network. */
export type FetchText = (url: string) => Promise<string>;

/** The genre a chart speaks for: a techno chart, a rap chart, or a general chart (`undefined`). */
export type ChartGenre = 'techno' | 'rap' | undefined;

export interface Chart {
  /** Stable id, used in history snapshots: `spotify-tr-daily`. */
  id: string;
  source: EvidenceSource;
  /** As a reader would name it: "Spotify Türkiye daily". */
  name: string;
  url: string;
  genre: ChartGenre;
  /** The country whose listeners make the chart, when it is a country chart. */
  country?: 'tr' | 'us' | 'global';
}

export interface ChartEntry {
  chart: Chart;
  rank: number;
  /** Plays, streams or views the chart counts for the day. */
  plays?: number | undefined;
  title: string;
  /** Lead artist first. */
  artists: string[];
  ids: { spotify?: string; apple?: string; deezer?: string; beatport?: string };
  isrc?: string | undefined;
  /** Release date the source gives (not necessarily the first release). */
  released?: string | undefined;
  bpm?: number | undefined;
  /** Genre names the source gives: "Hip-Hop/Rap", "Peak Time / Driving". */
  genreTags: string[];
  link?: string | undefined;
  cover?: string | undefined;
  durationMs?: number | undefined;
  /** A 30-second preview, when the source gives one (Apple). */
  preview?: string | undefined;
  /** Beatport's label name, for techno. */
  label?: string | undefined;
}

export interface Failure {
  source: string;
  reason: string;
}

export type { EvidenceSource, Genre };
