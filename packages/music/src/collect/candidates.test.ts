import { describe, expect, it } from 'vitest';

import { readTaste } from '../files.js';
import { buildCandidates } from './candidates.js';
import { CHARTS, TECHNO_CHARTS } from './charts.js';
import { History } from './history.js';
import { parseITunesGenreChart } from './itunes.js';
import { parseKworbChart } from './kworb.js';
import { parseBandcampDiscover } from './bandcamp.js';
import { editorsPlaylist } from './deezer.js';
import type { Chart, ChartEntry } from './types.js';

const INDIE_DANCE_TEST: Chart = {
  id: 'test-indie-dance',
  source: 'deezer',
  name: 'Test Indie Dance list',
  url: 'https://example.com/indie-dance',
  genre: 'indiedance',
};

const chart = (id: string): Chart => {
  const found = [...CHARTS, ...TECHNO_CHARTS, INDIE_DANCE_TEST].find((item) => item.id === id);
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

  it('keeps a techno song of unknown tempo for the Deezer lookup', () => {
    const day = build([
      entry('itunes-us-techno', 3, 'Warehouse', 'Unknown Tempo'),
      entry('deezer-techno-tunnel', 5, 'Tunnel', 'Dark Room', {
        bpm: 131,
        link: 'https://www.deezer.com/track/1',
      }),
    ]);
    const titles = day.genres.techno.map((c) => c.title);
    expect(titles).toContain('Unknown Tempo');
    const dark = day.genres.techno.find((c) => c.title === 'Dark Room');
    expect(dark?.bpm).toBe(131);
    expect(dark?.bpmFrom).toBe('https://www.deezer.com/track/1');
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

  it("reads yesterday's place from kworb's change column", () => {
    const html = `<table><tr><th>Pos</th><th>P+</th><th>Artist and Title</th><th>Days</th><th>Streams</th></tr>
<tr><td>4</td><td>+7</td><td><a href="../artist/a.html">Rapper</a> - <a href="../track/0ad9Ly0vVZlxMDFWdNYKAg.html">Bars</a></td><td>12</td><td>210,000</td></tr>
<tr><td>5</td><td>-1</td><td><a href="../artist/b.html">Other</a> - <a href="../track/1ad9Ly0vVZlxMDFWdNYKAg.html">Down</a></td><td>30</td><td>200,000</td></tr>
<tr><td>6</td><td>NEW</td><td><a href="../artist/c.html">Fresh</a> - <a href="../track/2ad9Ly0vVZlxMDFWdNYKAg.html">First</a></td><td>1</td><td>190,000</td></tr></table>`;
    const rows = parseKworbChart(html, chart('spotify-tr-daily'));
    expect(rows.map((row) => row.rankBefore)).toEqual([11, 4, undefined]);
    expect(rows[0]?.plays).toBe(210000);

    const [first] = rows;
    if (!first) throw new Error('no row');
    const day = build([first, entry('itunes-tr-rap', 9, 'Rapper', 'Bars')]);
    const bars = day.genres.turkey[0];
    expect(bars?.evidence).toContainEqual(
      expect.objectContaining({ metric: 'rankBefore', value: 11, before: '2026-11-25' }),
    );
    expect(bars?.notes).toContain('up 7 on Spotify Türkiye daily');
  });

  it("reads only an editors' Indie Dance playlist, and files its songs under Indie Dance", () => {
    const search = JSON.stringify({
      data: [
        { id: 1, title: 'indie dance 2026', nb_tracks: 300, user: { name: 'someone' } },
        {
          id: 2,
          title: 'Indie Dance',
          nb_tracks: 80,
          user: { name: 'Laeti - Deezer Dance & EDM Editor' },
        },
        {
          id: 3,
          title: 'Techno Tunnel',
          nb_tracks: 100,
          user: { name: 'Laeti - Deezer Dance & EDM Editor' },
        },
      ],
    });
    expect(editorsPlaylist(search, /indie[- ]?dance/i)).toEqual({ id: 2, title: 'Indie Dance' });
    expect(editorsPlaylist(JSON.stringify({ data: [] }), /indie dance/i)).toBeUndefined();

    const day = build([entry('test-indie-dance', 4, 'Band', 'Groove')]);
    expect(day.genres.indiedance.map((c) => c.title)).toEqual(['Groove']);
  });

  it("reads Bandcamp's best-selling Indie Dance list, leaving out merch and releases not out yet", () => {
    const json = JSON.stringify({
      results: [
        {
          itemType: 'a',
          title: 'Red Box',
          bandName: '20/20 Vision',
          releaseDate: '2026-11-20 00:00:00 UTC',
          playerData: {
            title: 'Red Box',
            artistName: 'Red Axes',
            url: 'https://2020vision.bandcamp.com/track/red-box',
            duration: 301.5,
          },
        },
        { itemType: 'p', title: 'T-shirt', bandName: 'Xinobi', playerData: null },
        {
          itemType: 'a',
          title: 'Later',
          bandName: 'Someone',
          releaseDate: '2026-12-04 00:00:00 UTC',
          playerData: { title: 'Later', artistName: 'Someone' },
        },
        {
          itemType: 'a',
          title: '[SPA492] STEFANO TIRELLI, FISSA - When I See Your Smile',
          bandName: 'Spa In Disco',
          releaseDate: '2026-11-21 17:07:32 UTC',
          playerData: {
            title: '[SPA492] STEFANO TIRELLI, FISSA - When I See Your Smile',
            artistName: 'STEFANO TIRELLI, FISSA',
          },
        },
      ],
    });
    const read = parseBandcampDiscover(json, chart('bandcamp-indie-dance'), '2026-11-26');
    expect(read.map((e) => [e.rank, e.title, e.artists])).toEqual([
      [1, 'Red Box', ['Red Axes']],
      [2, 'When I See Your Smile', ['STEFANO TIRELLI', 'FISSA']],
    ]);
    expect(read[0]?.released).toBe('2026-11-20');
    const day = build(read);
    expect(day.genres.indiedance[0]?.links.bandcamp).toBe(
      'https://2020vision.bandcamp.com/track/red-box',
    );
  });
});
