import { z } from 'zod';

import type { Chart, ChartEntry } from './types.js';

/**
 * Bandcamp's discover list for one tag, best-selling first ("top"): the same list as
 * bandcamp.com/discover/<tag>. It is the one Indie Dance list GitHub's runners can read (Beatport
 * and Traxsource answer them with a Cloudflare challenge). Each release is read as its featured
 * track; merch and releases not out yet are left out.
 */

export const BANDCAMP_DISCOVER = 'https://bandcamp.com/api/discover/1/discover_web';

export const bandcampDiscoverBody = (tag: string, size = 60) =>
  JSON.stringify({
    category_id: 0,
    tag_norm_names: [tag],
    geoname_id: 0,
    slice: 'top',
    cursor: '*',
    size,
    include_result_types: ['a', 's'],
  });

const Result = z.looseObject({
  itemType: z.string(),
  title: z.string(),
  bandName: z.string(),
  releaseDate: z.string().optional(),
  isAlbumPreorder: z.boolean().optional(),
  playerData: z
    .looseObject({
      title: z.string(),
      artistName: z.string().optional(),
      url: z.string().optional(),
      duration: z.number().optional(),
    })
    .nullish(),
});

/** "[SPA492] STEFANO TIRELLI, FISSA - When I See Your Smile" → "When I See Your Smile". */
export function trackTitle(title: string, artist: string): string {
  let clean = title.replace(/^\[[^\]]*\]\s*/, '').trim();
  const prefix = `${artist} - `;
  if (clean.toLowerCase().startsWith(prefix.toLowerCase())) clean = clean.slice(prefix.length);
  return clean.trim();
}

export function parseBandcampDiscover(json: string, chart: Chart, today?: string): ChartEntry[] {
  const { results } = z.object({ results: z.array(Result) }).parse(JSON.parse(json));
  const entries: ChartEntry[] = [];
  for (const result of results) {
    const track = result.playerData;
    if (result.itemType !== 'a' && result.itemType !== 't') continue;
    if (!track || result.isAlbumPreorder) continue;
    const released = result.releaseDate?.slice(0, 10);
    if (today && released && released > today) continue;
    const artist = track.artistName ?? result.bandName;
    entries.push({
      chart,
      rank: entries.length + 1,
      title: trackTitle(track.title, artist),
      artists: artist
        .split(/,\s*|\s+&\s+/)
        .map((name) => name.trim())
        .filter(Boolean),
      ids: {},
      released,
      genreTags: ['Indie Dance'],
      link: track.url,
      durationMs: track.duration ? Math.round(track.duration * 1000) : undefined,
    });
  }
  return entries;
}
