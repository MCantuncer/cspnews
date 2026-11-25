import { z } from 'zod';

import type { Chart, ChartEntry } from './types.js';

/**
 * Apple's per-genre top songs, from the iTunes RSS feed (`/rss/topsongs/genre=18` is
 * Hip-Hop/Rap). It is the one public rap chart for Türkiye, and each entry carries the song's
 * 30-second preview, cover, release date and store link.
 */

export const ITUNES_RAP_GENRE = 18;

export const itunesGenreChartUrl = (country: 'us' | 'tr', genre = ITUNES_RAP_GENRE) =>
  `https://itunes.apple.com/${country}/rss/topsongs/limit=100/genre=${String(genre)}/json`;

const Label = z.looseObject({ label: z.string() });
const Link = z.looseObject({
  attributes: z.looseObject({ href: z.string(), type: z.string().optional() }),
});

const EntrySchema = z.looseObject({
  'im:name': Label,
  'im:artist': Label,
  'im:image': z.array(Label).optional(),
  'im:releaseDate': Label.optional(),
  link: z.union([Link, z.array(Link)]).optional(),
  id: z.looseObject({ attributes: z.looseObject({ 'im:id': z.string() }) }).optional(),
  category: z.looseObject({ attributes: z.looseObject({ label: z.string() }) }).optional(),
});

const FeedSchema = z.object({
  feed: z.looseObject({ entry: z.union([EntrySchema, z.array(EntrySchema)]).optional() }),
});

export function parseITunesGenreChart(json: string, chart: Chart): ChartEntry[] {
  const raw = FeedSchema.parse(JSON.parse(json)).feed.entry ?? [];
  const entries = Array.isArray(raw) ? raw : [raw];
  if (entries.length === 0) throw new Error(`No songs on ${chart.url}`);
  return entries.map((item, index) => {
    const links = item.link === undefined ? [] : Array.isArray(item.link) ? item.link : [item.link];
    const page = links.find((link) => !link.attributes.type?.startsWith('audio'));
    const preview = links.find((link) => link.attributes.type?.startsWith('audio'));
    const image = item['im:image']?.at(-1)?.label;
    const id = item.id?.attributes['im:id'];
    return {
      chart,
      rank: index + 1,
      title: item['im:name'].label,
      artists: item['im:artist'].label
        .split(/,\s*|\s+&\s+/)
        .map((name) => name.trim())
        .filter(Boolean),
      ids: id ? { apple: id } : {},
      ...(item['im:releaseDate'] ? { released: item['im:releaseDate'].label.slice(0, 10) } : {}),
      genreTags: item.category ? [item.category.attributes.label] : [],
      ...(page ? { link: page.attributes.href.split('?')[0] ?? page.attributes.href } : {}),
      ...(image ? { cover: image.replace(/\/\d+x\d+bb/, '/600x600bb') } : {}),
      ...(preview ? { preview: preview.attributes.href } : {}),
    };
  });
}
