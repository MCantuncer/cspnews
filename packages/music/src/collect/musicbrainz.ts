import { z } from 'zod';

/**
 * MusicBrainz: a recording's first release date (the earliest anywhere, so a remaster is not new)
 * and the lead artist's country, which decides Türkçe rap from global hip-hop.
 */

const MB = 'https://musicbrainz.org/ws/2';

export const recordingByIsrcUrl = (isrc: string) =>
  `${MB}/recording?${new URLSearchParams({ query: `isrc:${isrc}`, fmt: 'json', limit: '5' }).toString()}`;

export const recordingSearchUrl = (artist: string, title: string) =>
  `${MB}/recording?${new URLSearchParams({
    query: `recording:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`,
    fmt: 'json',
    limit: '5',
  }).toString()}`;

export const artistUrl = (id: string) => `${MB}/artist/${id}?fmt=json`;

const RecordingsSchema = z.object({
  recordings: z.array(
    z.looseObject({
      id: z.string(),
      title: z.string(),
      score: z.number().optional(),
      'first-release-date': z.string().optional(),
      'artist-credit': z
        .array(z.looseObject({ artist: z.looseObject({ id: z.string(), name: z.string() }) }))
        .optional(),
    }),
  ),
});

export interface Recording {
  firstRelease?: string;
  artistId?: string;
}

/** The earliest first-release date among good matches, and the lead artist's id. */
export function parseRecordings(json: string, minScore = 90): Recording {
  const recordings = RecordingsSchema.parse(JSON.parse(json)).recordings.filter(
    (item) => (item.score ?? 100) >= minScore,
  );
  const dates = recordings
    .map((item) => item['first-release-date'])
    .filter((date): date is string => typeof date === 'string' && /^\d{4}/.test(date))
    .map(fullDate)
    .sort();
  const artistId = recordings[0]?.['artist-credit']?.[0]?.artist.id;
  return { ...(dates[0] ? { firstRelease: dates[0] } : {}), ...(artistId ? { artistId } : {}) };
}

/** "2004" → "2004-01-01", "2004-05" → "2004-05-01". */
export function fullDate(date: string): string {
  const [year, month = '01', day = '01'] = date.split('-');
  return `${year ?? ''}-${month}-${day}`;
}

export function parseArtistCountry(json: string): string | undefined {
  const artist = z
    .looseObject({
      country: z.string().nullable().optional(),
      area: z
        .looseObject({ 'iso-3166-1-codes': z.array(z.string()).optional() })
        .nullable()
        .optional(),
    })
    .parse(JSON.parse(json));
  return artist.country ?? artist.area?.['iso-3166-1-codes']?.[0] ?? undefined;
}
