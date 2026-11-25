import { describe, expect, it } from 'vitest';

import { readTaste } from '../files.js';
import { buildCandidates } from './candidates.js';
import { CHARTS } from './charts.js';
import { History } from './history.js';
import { parseITunesGenreChart } from './itunes.js';
import type { Chart, ChartEntry } from './types.js';

const chart = (id: string): Chart => {
  const found = CHARTS.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

const entry = (
  id: string,
  rank: number,
  artist: string,
  title: string,
  extra: Partial<ChartEntry> = {},
): ChartEntry => ({
  chart: chart(id),
  rank,
  title,
  artists: [artist],
  ids: {},
  genreTags: [],
  ...extra,
});

const DATE = '2026-11-26';
const build = (entries: ChartEntry[], history = new History([])) =>
  buildCandidates(DATE, '2026-11-26T14:00:00Z', entries, history, readTaste());

describe('music candidates', () => {
  it('brings in only songs on a genre chart', () => {
    const day = build([
      entry('spotify-us-daily', 3, 'Pop Star', 'Big Pop Song'),
      entry('itunes-us-rap', 4, 'Rapper', 'Bars'),
      entry('spotify-us-daily', 20, 'Rapper', 'Bars'),
    ]);
    expect(day.genres.global.map((c) => c.title)).toEqual(['Bars']);
    expect(day.genres.global[0]?.evidence.map((e) => e.chart)).toContain('Spotify US daily');
  });

  it('puts a song on the Türkiye rap chart under Türkçe rap', () => {
    const day = build([
      entry('itunes-tr-rap', 1, 'Wegh', 'ÖMERHAYYAM', { released: '2026-11-13' }),
    ]);
    expect(day.genres.turkey[0]?.title).toBe('ÖMERHAYYAM');
    expect(day.genres.turkey[0]?.notes).toContain('a favourite artist');
  });

  it('keeps techno between 120 and 134 BPM and prefers Raw / Deep / Hypnotic', () => {
    const day = build([
      entry('beatport-6-top-100', 1, 'Fast', 'Too Fast', { bpm: 140 }),
      entry('beatport-6-top-100', 2, 'Big Room', 'Festival', { bpm: 130 }),
      entry('beatport-92-top-100', 2, 'Warehouse', 'Pound', { bpm: 132 }),
    ]);
    expect(day.genres.techno.map((c) => c.title)).toEqual(['Pound', 'Festival']);
  });

  it('marks an old song that is only still charting', () => {
    const day = build([
      entry('itunes-us-rap', 5, 'Old Head', 'Classic', { released: '2017-12-01' }),
    ]);
    expect(day.genres.global[0]?.notes).toContain('old and only still charting: not a comeback');
  });

  it('measures a climb from the history', () => {
    const history = new History([
      { date: '2026-11-25', rows: [{ key: 'rapper-bars', chart: 'itunes-us-rap', rank: 30 }] },
    ]);
    const day = build([entry('itunes-us-rap', 10, 'Rapper', 'Bars')], history);
    const before = day.genres.global[0]?.evidence.find((e) => e.metric === 'rankBefore');
    expect(before).toMatchObject({ value: 30, before: '2026-11-25' });
  });
});

describe('iTunes genre chart', () => {
  it('reads the preview, cover and release date', () => {
    const json = JSON.stringify({
      feed: {
        entry: [
          {
            'im:name': { label: 'Hırsız' },
            'im:artist': { label: 'UZI' },
            'im:image': [{ label: 'https://is1-ssl.mzstatic.com/image/thumb/a/170x170bb.png' }],
            'im:releaseDate': { label: '2026-11-20T00:00:00-07:00' },
            link: [
              {
                attributes: {
                  href: 'https://music.apple.com/tr/album/x?i=1&uo=2',
                  type: 'text/html',
                },
              },
              {
                attributes: {
                  href: 'https://audio-ssl.itunes.apple.com/a.m4a',
                  type: 'audio/x-m4a',
                },
              },
            ],
            id: { attributes: { 'im:id': '1' } },
            category: { attributes: { label: 'Hip-Hop/Rap' } },
          },
        ],
      },
    });
    const [song] = parseITunesGenreChart(json, chart('itunes-tr-rap'));
    expect(song).toMatchObject({
      title: 'Hırsız',
      released: '2026-11-20',
      preview: 'https://audio-ssl.itunes.apple.com/a.m4a',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.png',
      genreTags: ['Hip-Hop/Rap'],
    });
  });
});
