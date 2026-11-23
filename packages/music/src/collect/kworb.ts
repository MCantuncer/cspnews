import type { Chart, ChartEntry } from './types.js';

/**
 * Spotify's daily charts, read through kworb.net, which republishes them as plain tables:
 * position, artist and title (linked to the Spotify track), days on the chart, streams.
 * The columns are found by their header names, so a new column does not break the reader.
 */

const cells = (row: string) =>
  [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1] ?? '');

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const number = (text: string) => {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? Number(digits) : undefined;
};

export function parseKworbChart(html: string, chart: Chart): ChartEntry[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1] ?? '');
  const header = rows.find((row) => /<th\b/i.test(row));
  if (!header) throw new Error(`No table header on ${chart.url}`);
  const names = cells(header).map((cell) => plain(cell).toLowerCase());
  const column = (...wanted: string[]) => names.findIndex((name) => wanted.includes(name));
  const pos = column('pos', '#');
  const title = column('artist and title', 'artist - title', 'track');
  const streams = column('streams');
  if (pos < 0 || title < 0) throw new Error(`Unexpected columns on ${chart.url}: ${names.join(', ')}`);

  const entries: ChartEntry[] = [];
  for (const row of rows) {
    if (/<th\b/i.test(row)) continue;
    const values = cells(row);
    const rank = number(plain(values[pos] ?? ''));
    const cell = values[title] ?? '';
    if (!rank || !cell) continue;
    const links = [...cell.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const track = links.find((link) => /track\/([A-Za-z0-9]{22})/.test(link[1] ?? ''));
    const spotify = /track\/([A-Za-z0-9]{22})/.exec(track?.[1] ?? '')?.[1];
    const text = plain(cell);
    const split = text.indexOf(' - ');
    const artistText = split >= 0 ? text.slice(0, split) : '';
    const songTitle = track ? plain(track[2] ?? '') : split >= 0 ? text.slice(split + 3) : text;
    const artists = links
      .filter((link) => /artist\//.test(link[1] ?? ''))
      .map((link) => plain(link[2] ?? ''))
      .filter(Boolean);
    entries.push({
      chart,
      rank,
      ...(streams >= 0 && number(plain(values[streams] ?? ''))
        ? { plays: number(plain(values[streams] ?? '')) }
        : {}),
      title: songTitle,
      artists: artists.length > 0 ? artists : artistText.split(/,\s*|\s+&\s+/).filter(Boolean),
      ids: spotify ? { spotify } : {},
      genreTags: [],
      ...(spotify ? { link: `https://open.spotify.com/track/${spotify}` } : {}),
    });
  }
  if (entries.length === 0) throw new Error(`No rows on ${chart.url}`);
  return entries;
}
