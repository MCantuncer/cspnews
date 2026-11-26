import { z } from 'zod';

import type { Chart, ChartEntry } from './types.js';

/**
 * Deezer's public API, no key needed: the rap chart, a song's ISRC, tempo and album date, the
 * album's genres, and a followed artist's latest releases.
 */

export const DEEZER = 'https://api.deezer.com';
/** Deezer's genre id for Rap/Hip Hop. */
export const DEEZER_RAP = 116;
/** "Techno Tunnel", the warehouse techno playlist of Deezer's Dance & EDM editor. */
export const DEEZER_TECHNO_TUNNEL = 1275756721;

export const deezerPlaylistSearchUrl = (query: string) =>
  `${DEEZER}/search/playlist?${new URLSearchParams({ q: query, limit: '50' }).toString()}`;
export const deezerPlaylistTracksUrl = (id: number) =>
  `${DEEZER}/playlist/${String(id)}/tracks?limit=100`;

/**
 * The editors' playlist a search found: made by a Deezer editor account ("… - Deezer Dance & EDM
 * Editor") and named like the search. Listeners' own playlists are never used.
 */
export function editorsPlaylist(
  json: string,
  name: RegExp,
): { id: number; title: string } | undefined {
  const found = z
    .object({
      data: z.array(
        z.looseObject({
          id: z.number(),
          title: z.string(),
          nb_tracks: z.number().optional(),
          user: z.looseObject({ name: z.string() }).optional(),
        }),
      ),
    })
    .parse(ok(json))
    .data.filter((list) => /deezer/i.test(list.user?.name ?? '') && name.test(list.title))
    .sort((a, b) => (b.nb_tracks ?? 0) - (a.nb_tracks ?? 0))[0];
  return found ? { id: found.id, title: found.title } : undefined;
}

const Artist = z.looseObject({ id: z.number(), name: z.string() });

const ChartSchema = z.object({
  data: z.array(
    z.looseObject({
      id: z.number(),
      title: z.string(),
      title_short: z.string().optional(),
      position: z.number().optional(),
      link: z.string().optional(),
      duration: z.number().optional(),
      artist: Artist,
      contributors: z.array(Artist).optional(),
      album: z
        .looseObject({ cover_xl: z.string().optional(), cover_big: z.string().optional() })
        .optional(),
    }),
  ),
});

export function parseDeezerChart(json: string, chart: Chart): ChartEntry[] {
  return ChartSchema.parse(JSON.parse(json)).data.map((item, index) => ({
    chart,
    rank: item.position ?? index + 1,
    title: item.title_short ?? item.title,
    artists: (item.contributors?.length ? item.contributors : [item.artist]).map((a) => a.name),
    ids: { deezer: String(item.id) },
    genreTags: chart.genre === 'rap' ? ['Rap/Hip Hop'] : [],
    ...(item.link ? { link: item.link } : {}),
    ...(item.album?.cover_xl ? { cover: item.album.cover_xl } : {}),
    ...(item.duration ? { durationMs: item.duration * 1000 } : {}),
  }));
}

const TrackSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  isrc: z.string().optional(),
  bpm: z.number().optional(),
  release_date: z.string().optional(),
  link: z.string().optional(),
  duration: z.number().optional(),
  artist: Artist,
  contributors: z.array(Artist).optional(),
  album: z.looseObject({ id: z.number(), release_date: z.string().optional() }).optional(),
});
export type DeezerTrack = z.infer<typeof TrackSchema>;

/** A Deezer error comes back as 200 with `{ "error": … }`. */
function ok(json: string): unknown {
  const value: unknown = JSON.parse(json);
  if (value && typeof value === 'object' && 'error' in value) {
    throw new Error(`Deezer: ${JSON.stringify(value.error)}`);
  }
  return value;
}

export const deezerTrackUrl = (id: string) => `${DEEZER}/track/${id}`;
export const deezerIsrcUrl = (isrc: string) => `${DEEZER}/track/isrc:${isrc}`;
export const deezerSearchUrl = (artist: string, title: string) =>
  `${DEEZER}/search?${new URLSearchParams({ q: `artist:"${artist}" track:"${title}"`, limit: '3' }).toString()}`;

export function parseDeezerTrack(json: string): DeezerTrack {
  return TrackSchema.parse(ok(json));
}

export function parseDeezerSearch(json: string): { id: number; title: string; artist: string }[] {
  return z
    .object({ data: z.array(z.looseObject({ id: z.number(), title: z.string(), artist: Artist })) })
    .parse(ok(json))
    .data.map((item) => ({ id: item.id, title: item.title, artist: item.artist.name }));
}

/** The album's genre names: "Rap/Hip Hop", "Dance", "Electro". */
export function parseDeezerAlbumGenres(json: string): string[] {
  return (
    z
      .object({
        genres: z.object({ data: z.array(z.looseObject({ name: z.string() })) }).optional(),
      })
      .parse(ok(json))
      .genres?.data.map((genre) => genre.name) ?? []
  );
}

export const deezerAlbumUrl = (id: number) => `${DEEZER}/album/${String(id)}`;
export const deezerArtistSearchUrl = (name: string) =>
  `${DEEZER}/search/artist?${new URLSearchParams({ q: name, limit: '1' }).toString()}`;
export const deezerArtistAlbumsUrl = (id: number) =>
  `${DEEZER}/artist/${String(id)}/albums?limit=8`;
export const deezerAlbumTracksUrl = (id: number) => `${DEEZER}/album/${String(id)}/tracks?limit=30`;

export function parseDeezerArtistSearch(json: string): { id: number; name: string } | undefined {
  return z.object({ data: z.array(Artist) }).parse(ok(json)).data[0];
}

export function parseDeezerAlbums(json: string): { id: number; title: string; released: string }[] {
  return z
    .object({
      data: z.array(z.looseObject({ id: z.number(), title: z.string(), release_date: z.string() })),
    })
    .parse(ok(json))
    .data.map((album) => ({ id: album.id, title: album.title, released: album.release_date }));
}

export function parseDeezerAlbumTracks(json: string): { id: number; title: string }[] {
  return z
    .object({ data: z.array(z.looseObject({ id: z.number(), title: z.string() })) })
    .parse(ok(json))
    .data.map((track) => ({ id: track.id, title: track.title }));
}
