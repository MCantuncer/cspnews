/**
 * The music Collect (docs/music.md): reads every chart, saves the day's snapshot to the history,
 * and writes the ranked candidates the evening writer picks from.
 *
 *   node dist/collect/cli.js <history dir> <out file> [date]
 *
 * `history dir` holds `<date>.json` snapshots (the `music/history` folder of the candidates
 * branch); today's is added to it. A chart that cannot be read is listed under `failures` and
 * the rest still run.
 *
 * The candidates file also lists the all-time songs (`alltime`, per genre) with their preview,
 * cover and links, so the writer can pick one without a lookup of its own.
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { canonKey } from '../canon.js';
import { GENRES, type Genre } from '../edition.js';
import { readCanon, readTaste } from '../files.js';
import { songKey } from '../song.js';
import { parseAppleChart, itunesSearchUrl, parseITunesSearch } from './apple.js';
import { parseBeatportChart } from './beatport.js';
import { buildCandidates, snapshotOf, technoTempo, type Candidate } from './candidates.js';
import { CHARTS } from './charts.js';
import {
  deezerPlaylistTracksUrl,
  deezerSearchUrl,
  editorsPlaylist,
  deezerTrackUrl,
  parseDeezerChart,
  parseDeezerSearch,
  parseDeezerTrack,
} from './deezer.js';
import { History, SnapshotSchema, type Snapshot } from './history.js';
import { BANDCAMP_DISCOVER, bandcampDiscoverBody, parseBandcampDiscover } from './bandcamp.js';
import { httpFetchText, httpPostJson } from './http.js';
import { parseITunesGenreChart } from './itunes.js';
import { parseKworbChart } from './kworb.js';
import { MIN_TEMPO_CONFIDENCE, TEMPO_RATE, estimateTempo } from './tempo.js';
import type { Chart, ChartEntry, FetchText, Failure } from './types.js';

function parserFor(chart: Chart): (body: string, chart: Chart) => ChartEntry[] {
  if (chart.id.startsWith('itunes-')) return parseITunesGenreChart;
  switch (chart.source) {
    case 'spotify':
      return parseKworbChart;
    case 'apple':
      return parseAppleChart;
    case 'deezer':
      return parseDeezerChart;
    case 'beatport':
      return parseBeatportChart;
    default:
      throw new Error(`No reader for ${chart.id}`);
  }
}

/** Adds Apple's preview, cover, length and store link to a candidate that has none. */
async function enrich(candidate: Candidate, fetchText: FetchText): Promise<void> {
  if (candidate.preview && candidate.artwork) return;
  const country = candidate.genre === 'turkey' ? 'tr' : 'us';
  const songs = parseITunesSearch(
    await fetchText(itunesSearchUrl(candidate.artists[0] ?? '', candidate.title, country)),
  );
  const wanted = songKey(candidate.artists[0] ?? '', candidate.title);
  const match = songs.find((song) => songKey(song.artistName, song.trackName) === wanted);
  if (!match) return;
  if (match.previewUrl) candidate.preview ??= match.previewUrl;
  if (match.artworkUrl100) candidate.artwork ??= match.artworkUrl100.replace('100x100', '600x600');
  if (match.trackTimeMillis) candidate.durationSec ??= Math.round(match.trackTimeMillis / 1000);
  if (match.trackViewUrl)
    candidate.links.appleMusic ??= match.trackViewUrl.split('&uo=')[0] ?? match.trackViewUrl;
  if (match.primaryGenreName) {
    candidate.genreTags = [...new Set([...candidate.genreTags, match.primaryGenreName])];
  }
  const released = match.releaseDate?.slice(0, 10);
  if (released && (!candidate.released || released < candidate.released))
    candidate.released = released;
}

/** Reads a techno song's tempo from Deezer when no chart gave one; 0 there means unknown. */
async function addTempo(candidate: Candidate, fetchText: FetchText): Promise<void> {
  if (candidate.bpm !== undefined) return;
  let id = /deezer\.com\/(?:\w+\/)?track\/(\d+)/.exec(candidate.links.deezer ?? '')?.[1];
  if (!id) {
    const wanted = songKey(candidate.artists[0] ?? '', candidate.title);
    const found = parseDeezerSearch(
      await fetchText(deezerSearchUrl(candidate.artists[0] ?? '', candidate.title)),
    ).find((song) => songKey(song.artist, song.title) === wanted);
    if (!found) return;
    id = String(found.id);
  }
  const track = parseDeezerTrack(await fetchText(deezerTrackUrl(id)));
  candidate.links.deezer ??= track.link ?? `https://www.deezer.com/track/${id}`;
  if (track.isrc) candidate.isrc ??= track.isrc;
  if (track.bpm) {
    candidate.bpm = Math.round(track.bpm * 10) / 10;
    candidate.bpmSource = 'deezer';
    candidate.bpmFrom = track.link ?? `https://www.deezer.com/track/${id}`;
  }
}

/**
 * Decodes a preview to mono samples with ffmpeg (installed by the workflow). The audio goes through
 * a file, not a pipe: an .m4a may keep its index at the end, which a pipe cannot seek to.
 */
function decode(audio: Buffer): Promise<Float32Array> {
  const file = join(tmpdir(), `cspnews-preview-${String(process.pid)}`);
  writeFileSync(file, audio);
  return new Promise((done, fail) => {
    execFile(
      'ffmpeg',
      ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(TEMPO_RATE), '-f', 'f32le', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        rmSync(file, { force: true });
        if (error) {
          fail(new Error(error.message));
          return;
        }
        const bytes = Uint8Array.from(stdout);
        done(new Float32Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 4)));
      },
    );
  });
}

/** Measures the tempo from the 30-second preview when no source gave one. */
async function measureTempo(candidate: Candidate): Promise<void> {
  if (candidate.bpm !== undefined || !candidate.preview) return;
  const response = await fetch(candidate.preview, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${String(response.status)} from ${candidate.preview}`);
  const reading = estimateTempo(await decode(Buffer.from(await response.arrayBuffer())));
  console.log(
    `Tempo of ${candidate.artists[0] ?? ''} - ${candidate.title}: ${reading ? `${String(reading.bpm)} BPM, sure ${String(reading.confidence)}` : 'too short'}`,
  );
  if (!reading || reading.confidence < MIN_TEMPO_CONFIDENCE) return;
  candidate.bpm = reading.bpm;
  candidate.bpmSource = 'preview';
  candidate.bpmFrom = candidate.preview;
}

function readHistory(directory: string): Snapshot[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .map((file) => SnapshotSchema.parse(JSON.parse(readFileSync(join(directory, file), 'utf8'))));
}

const istanbulDate = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now);

async function main(): Promise<void> {
  const [historyDir, outFile, dateArg] = process.argv.slice(2);
  if (!historyDir || !outFile) {
    throw new Error('Usage: collect-music <history dir> <out file> [date]');
  }
  const now = new Date();
  const date = dateArg ?? istanbulDate(now);
  const readAt = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const fetchText = httpFetchText();

  const entries: ChartEntry[] = [];
  const failures: Failure[] = [];
  for (const chart of CHARTS) {
    try {
      if (chart.source === 'bandcamp') {
        const read = parseBandcampDiscover(
          await httpPostJson(BANDCAMP_DISCOVER, bandcampDiscoverBody('indie-dance')),
          chart,
          date,
        );
        entries.push(...read);
        console.log(`${chart.name}: ${String(read.length)} songs`);
        continue;
      }
      let body = await fetchText(chart.url);
      if (chart.url.includes('/search/playlist')) {
        // A search for an editors' playlist: read the playlist it finds.
        const list = editorsPlaylist(body, /indie[- ]?dance/i);
        if (!list) throw new Error(`No Deezer editors' playlist found by ${chart.url}`);
        console.log(`${chart.name}: reading "${list.title}" (${String(list.id)})`);
        body = await fetchText(deezerPlaylistTracksUrl(list.id));
      }
      const read = parserFor(chart)(body, chart);
      entries.push(...read);
      console.log(`${chart.name}: ${String(read.length)} songs`);
    } catch (error) {
      failures.push({ source: chart.id, reason: String(error) });
      console.error(`${chart.name}: ${String(error)}`);
    }
  }
  if (entries.length === 0) throw new Error('No chart could be read.');

  const snapshots = readHistory(historyDir).filter((snapshot) => snapshot.date !== date);
  const day = buildCandidates(date, readAt, entries, new History(snapshots), readTaste());

  for (const candidates of Object.values(day.genres)) {
    for (const candidate of candidates) {
      try {
        await enrich(candidate, fetchText);
      } catch (error) {
        failures.push({ source: `itunes ${candidate.key}`, reason: String(error) });
      }
    }
  }
  for (const candidate of day.genres.techno) {
    try {
      await addTempo(candidate, fetchText);
    } catch (error) {
      failures.push({ source: `deezer ${candidate.key}`, reason: String(error) });
    }
    try {
      await measureTempo(candidate);
    } catch (error) {
      failures.push({ source: `tempo ${candidate.key}`, reason: String(error) });
    }
  }
  // Techno is only for 120 to 134 BPM, so a song whose tempo is still unknown is left out.
  day.genres.techno = day.genres.techno.filter(
    (candidate) => candidate.bpm !== undefined && technoTempo(candidate.bpm),
  );

  const alltime = Object.fromEntries(GENRES.map((genre) => [genre, [] as Candidate[]])) as Record<
    Genre,
    Candidate[]
  >;
  for (const entry of readCanon()) {
    const song: Candidate = {
      key: canonKey(entry),
      genre: entry.genre,
      title: entry.title,
      artists: entry.artists,
      ...(entry.bpm === undefined ? {} : { bpm: entry.bpm }),
      genreTags: [],
      links: {},
      evidence: [],
      notes: [`all-time list (${entry.standing.kind}), first out ${String(entry.year)}`],
      score: 0,
    };
    try {
      await enrich(song, fetchText);
    } catch (error) {
      failures.push({ source: `itunes ${song.key}`, reason: String(error) });
    }
    alltime[entry.genre].push(song);
  }

  mkdirSync(historyDir, { recursive: true });
  writeFileSync(join(historyDir, `${date}.json`), `${JSON.stringify(snapshotOf(date, entries))}\n`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify({ ...day, alltime, failures }, null, 2)}\n`);
  const counts = Object.entries(day.genres).map(
    ([genre, list]) => `${genre} ${String(list.length)}`,
  );
  console.log(`Candidates for ${date}: ${counts.join(', ')}; ${String(failures.length)} failures.`);
}

await main();
