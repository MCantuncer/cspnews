import { DEEZER, DEEZER_RAP } from './deezer.js';
import { itunesGenreChartUrl } from './itunes.js';
import type { Chart } from './types.js';

/**
 * The charts the music Collect reads every day (docs/music.md, "Sources"). Hard Techno is left
 * out on purpose: most of it is above the 134 BPM cap.
 */

const kworb = (country: 'global' | 'us' | 'tr', name: string): Chart => ({
  id: `spotify-${country}-daily`,
  source: 'spotify',
  name,
  url: `https://kworb.net/spotify/country/${country}_daily.html`,
  genre: undefined,
  country,
});

const apple = (country: 'us' | 'tr', name: string): Chart => ({
  id: `apple-${country}-most-played`,
  source: 'apple',
  name,
  url: `https://rss.marketingtools.apple.com/api/v2/${country}/music/most-played/100/songs.json`,
  genre: undefined,
  country,
});

const beatport = (slug: string, id: number, list: 'top-100' | 'hype-100', name: string): Chart => ({
  id: `beatport-${String(id)}-${list}`,
  source: 'beatport',
  name,
  url: `https://www.beatport.com/genre/${slug}/${String(id)}/${list}`,
  genre: 'techno',
});

export const CHARTS: readonly Chart[] = [
  kworb('global', 'Spotify Global daily'),
  kworb('us', 'Spotify US daily'),
  kworb('tr', 'Spotify Türkiye daily'),
  apple('us', 'Apple Music US most played'),
  apple('tr', 'Apple Music Türkiye most played'),
  {
    id: 'itunes-us-rap',
    source: 'apple',
    name: 'Apple Music US Hip-Hop/Rap',
    url: itunesGenreChartUrl('us'),
    genre: 'rap',
    country: 'us',
  },
  {
    id: 'itunes-tr-rap',
    source: 'apple',
    name: 'Apple Music Türkiye Hip-Hop/Rap',
    url: itunesGenreChartUrl('tr'),
    genre: 'rap',
    country: 'tr',
  },
  {
    id: 'deezer-rap',
    source: 'deezer',
    name: 'Deezer Rap/Hip Hop chart',
    url: `${DEEZER}/chart/${String(DEEZER_RAP)}/tracks?limit=100`,
    genre: 'rap',
  },
  beatport('techno-peak-time-driving', 6, 'top-100', 'Beatport Peak Time / Driving Top 100'),
  beatport('techno-peak-time-driving', 6, 'hype-100', 'Beatport Peak Time / Driving Hype Top 100'),
  beatport('techno-raw-deep-hypnotic', 92, 'top-100', 'Beatport Raw / Deep / Hypnotic Top 100'),
  beatport(
    'techno-raw-deep-hypnotic',
    92,
    'hype-100',
    'Beatport Raw / Deep / Hypnotic Hype Top 100',
  ),
];
