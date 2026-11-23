import { z } from 'zod';

import type { Chart, ChartEntry } from './types.js';

/**
 * Apple Music's most-played songs per country (the public marketing RSS feed, JSON), and the
 * iTunes Search API for a song's 30-second preview, its store genre and release date.
 */

const FeedSchema = z.object({
  feed: z.object({
    results: z.array(
      z.looseObject({
        id: z.string(),
        name: z.string(),
        artistName: z.string(),
        releaseDate: z.string().optional(),
        artworkUrl100: z.string().optional(),
        url: z.string().optional(),
        genres: z.array(z.looseObject({ name: z.string() })).optional(),
      }),
    ),
  }),
});

export function parseAppleChart(json: string, chart: Chart): ChartEntry[] {
  const { results } = FeedSchema.parse(JSON.parse(json)).feed;
  return results.map((item, index) => ({
    chart,
    rank: index + 1,
    title: item.name,
    artists: splitArtists(item.artistName),
    ids: { apple: item.id },
    ...(item.releaseDate ? { released: item.releaseDate.slice(0, 10) } : {}),
    genreTags: (item.genres ?? []).map((genre) => genre.name).filter((name) => name !== 'Music'),
    ...(item.url ? { link: item.url } : {}),
    ...(item.artworkUrl100 ? { cover: item.artworkUrl100.replace('100x100', '600x600') } : {}),
  }));
}

/** "A & B" and "A, B & C" as Apple writes them. */
export function splitArtists(value: string): string[] {
  return value
    .split(/,\s*|\s+&\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

const SearchSchema = z.object({
  results: z.array(
    z.looseObject({
      kind: z.string().optional(),
      trackId: z.number(),
      trackName: z.string(),
      artistName: z.string(),
      releaseDate: z.string().optional(),
      primaryGenreName: z.string().optional(),
      previewUrl: z.string().optional(),
      trackViewUrl: z.string().optional(),
      artworkUrl100: z.string().optional(),
      trackTimeMillis: z.number().optional(),
    }),
  ),
});
export type ITunesSong = z.infer<typeof SearchSchema>['results'][number];

export const itunesSearchUrl = (artist: string, title: string, country: 'tr' | 'us') =>
  `https://itunes.apple.com/search?${new URLSearchParams({
    term: `${artist} ${title}`,
    entity: 'song',
    country,
    limit: '5',
  }).toString()}`;

export function parseITunesSearch(json: string): ITunesSong[] {
  return SearchSchema.parse(JSON.parse(json)).results.filter(
    (item) => !item.kind || item.kind === 'song',
  );
}
