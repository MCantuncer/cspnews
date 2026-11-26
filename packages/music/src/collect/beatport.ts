import type { Chart, ChartEntry } from './types.js';

/**
 * Beatport's genre charts (Top 100 and Hype). The page is server-rendered with its data in a
 * `__NEXT_DATA__` script; the reader takes the longest list of track-shaped objects in it, so a
 * change in where the list sits does not break it. Beatport gives every track its tempo, ISRC,
 * label and release date: the tempo is the source of record for the 134 BPM cap.
 */

interface BeatportTrack {
  id?: number;
  slug?: string;
  name: string;
  mix_name?: string;
  bpm: number;
  isrc?: string;
  publish_date?: string;
  new_release_date?: string;
  length_ms?: number;
  artists: { name: string }[];
  remixers?: { name: string }[];
  genre?: { name?: string };
  sub_genre?: { name?: string } | null;
  label?: { name?: string };
  release?: { image?: { uri?: string } };
  image?: { uri?: string };
}

function isTrack(value: unknown): value is BeatportTrack {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === 'string' &&
    typeof item.bpm === 'number' &&
    Array.isArray(item.artists) &&
    item.artists.every((artist) => typeof (artist as { name?: unknown }).name === 'string')
  );
}

function trackLists(value: unknown, found: BeatportTrack[][] = []): BeatportTrack[][] {
  if (Array.isArray(value)) {
    const tracks = value.filter(isTrack);
    if (tracks.length > 0 && tracks.length === value.length) found.push(tracks);
    for (const item of value) trackLists(item, found);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) trackLists(item, found);
  }
  return found;
}

/** "Original Mix" and "Extended Mix" are the track itself; any other mix name is part of the title. */
const titleOf = (track: BeatportTrack) =>
  track.mix_name && !/^(original|extended) mix$/i.test(track.mix_name)
    ? `${track.name} (${track.mix_name})`
    : track.name;

export function parseBeatportChart(html: string, chart: Chart): ChartEntry[] {
  const script = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!script) throw new Error(`No page data on ${chart.url}`);
  const lists = trackLists(JSON.parse(script) as unknown);
  const tracks = lists.sort((a, b) => b.length - a.length)[0];
  if (!tracks || tracks.length < 10) throw new Error(`No chart list on ${chart.url}`);
  return tracks.map((track, index) => ({
    chart,
    rank: index + 1,
    title: titleOf(track),
    artists: track.artists.map((artist) => artist.name),
    ids: track.id ? { beatport: String(track.id) } : {},
    ...(track.isrc ? { isrc: track.isrc.toUpperCase() } : {}),
    ...(track.new_release_date || track.publish_date
      ? { released: (track.new_release_date ?? track.publish_date ?? '').slice(0, 10) }
      : {}),
    bpm: track.bpm,
    genreTags: [track.genre?.name, track.sub_genre?.name].filter(
      (name): name is string => typeof name === 'string',
    ),
    ...(track.id && track.slug
      ? { link: `https://www.beatport.com/track/${track.slug}/${String(track.id)}` }
      : {}),
    ...((track.release?.image?.uri ?? track.image?.uri)
      ? { cover: track.release?.image?.uri ?? track.image?.uri }
      : {}),
    ...(track.length_ms ? { durationMs: track.length_ms } : {}),
    ...(track.label?.name ? { label: track.label.name } : {}),
  }));
}
