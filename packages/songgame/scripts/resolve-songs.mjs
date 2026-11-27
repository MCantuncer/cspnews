// Finds each hand-picked song's 30-second Apple preview and a clean starting point for the clips.
//
//   node packages/songgame/scripts/resolve-songs.mjs
//
// Reads data/picks/<genre>.txt ("Artist | Title" per line) and writes data/songs/<genre>.json in
// play order: songs already in the file keep their place, so a published day never changes its
// song; newly found songs are shuffled with a fixed seed and appended. Songs Apple does not have
// are listed in data/songs/missing.txt. data/songs/catalog.json is every name the guess box
// suggests: the answers plus other well-known songs by the same artists.
//
// Needs network access to itunes.apple.com and audio-ssl.itunes.apple.com, and ffmpeg. Runs in
// the Song Pool workflow (.github/workflows/song-pool.yml).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../data/', import.meta.url).pathname;
const GENRES = ['pop-tr', 'rap', 'rock'];
/** The longest clip the game plays, in seconds; the start must leave room for it. */
const LONGEST_CLIP = 16;
const PAUSE_MS = 3200; // iTunes allows about 20 calls a minute.
const UNWANTED =
  /\b(live|karaoke|instrumental|remix|cover|acoustic|akustik|canlı|tribute|sped up|slowed|re-?recorded|demo|edit\)|mixed)\b/i;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let lastCall = 0;

async function itunes(path) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const wait = lastCall + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const response = await fetch(`https://itunes.apple.com/${path}`);
    if (response.ok) return (await response.json()).results ?? [];
    console.warn(`iTunes ${String(response.status)} on ${path}, waiting`);
    await sleep(20_000 * attempt);
  }
  throw new Error(`iTunes keeps refusing ${path}`);
}

/** Lower case, no accents or punctuation, no "(feat. …)" or " - Remastered" tails. */
export function plain(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+[-–]\s+.*$/, '')
    .replace(/[([](feat|ft|with|from|remaster|\d{4}).*?[)\]]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function readPicks(genre) {
  return readFileSync(join(ROOT, 'picks', `${genre}.txt`), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [artist, title] = line.split('|').map((part) => part.trim());
      return { pick: `${artist} | ${title}`, artist, title };
    });
}

function matches(result, pick) {
  const artist = plain(result.artistName ?? '');
  const firstArtist = plain(pick.artist.split(/\s+(&|x|feat\.?)\s+/i)[0]);
  if (!artist.includes(firstArtist) && !firstArtist.includes(artist)) return false;
  if (plain(result.trackName ?? '') !== plain(pick.title)) return false;
  if (!result.previewUrl) return false;
  const names = `${result.trackName} ${result.collectionName ?? ''}`;
  return !UNWANTED.test(names) || UNWANTED.test(pick.title);
}

async function findSong(pick) {
  for (const country of ['us', 'tr']) {
    const term = encodeURIComponent(`${pick.artist} ${pick.title}`);
    const results = await itunes(
      `search?term=${term}&media=music&entity=song&limit=25&country=${country}`,
    );
    const found = results
      .filter((result) => matches(result, pick))
      .sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate)));
    if (found.length > 0) return found[0];
  }
  return undefined;
}

/** Loudness per 50 ms window, in dB. */
function loudness(file) {
  const output = execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-nostats', '-i', file, '-ac', '1', '-af',
      'aresample=22050,asetnsamples=n=1102:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-',
      '-f', 'null', '-',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  return [...output.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) =>
    m[1] === '-inf' ? -120 : Number(m[1]),
  );
}

/**
 * Where the clips start, in seconds into the preview: past Apple's fade-in, at the first moment
 * the music is at its usual level and stays there, so even 0.1 s is real sound.
 */
export function cleanStart(levels, windowSeconds = 0.05) {
  const sorted = [...levels].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? -120;
  const latest = Math.floor((levels.length * windowSeconds - LONGEST_CLIP - 0.5) / windowSeconds);
  for (let index = Math.round(1 / windowSeconds); index <= latest; index += 1) {
    const steady = levels.slice(index, index + 6).every((level) => level >= median - 4);
    if (steady) return Math.round(index * windowSeconds * 100) / 100;
  }
  return 1.5;
}

async function measureStart(preview, folder) {
  const response = await fetch(preview);
  if (!response.ok) throw new Error(`Preview ${String(response.status)}: ${preview}`);
  const file = join(folder, 'preview.m4a');
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  const levels = loudness(file);
  const seconds = levels.length * 0.05;
  return { start: cleanStart(levels), previewSeconds: Math.round(seconds * 10) / 10 };
}

/** A fixed shuffle (FNV-1a seed, mulberry32), so a rerun appends the same order. */
function shuffled(items, seed) {
  let hash = 0x811c9dc5;
  for (const char of seed) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193);
  let state = hash >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;

async function main() {
  const folder = mkdtempSync(join(tmpdir(), 'songs-'));
  const missing = [];
  const catalog = new Map(
    readJson(join(ROOT, 'songs', 'catalog.json'), []).map((song) => [
      plain(`${song.artist} ${song.title}`),
      song,
    ]),
  );
  const artistIds = new Map();

  for (const genre of GENRES) {
    const file = join(ROOT, 'songs', `${genre}.json`);
    const kept = readJson(file, []);
    const known = new Set(kept.map((song) => song.pick));
    const fresh = [];
    for (const pick of readPicks(genre)) {
      if (known.has(pick.pick)) continue;
      const found = await findSong(pick);
      if (!found) {
        missing.push(`${genre}: ${pick.pick}`);
        console.log(`missing  ${genre}: ${pick.pick}`);
        continue;
      }
      try {
        const { start, previewSeconds } = await measureStart(found.previewUrl, folder);
        fresh.push({
          pick: pick.pick,
          artist: pick.artist,
          title: pick.title,
          year: Number(String(found.releaseDate).slice(0, 4)) || undefined,
          apple: String(found.trackId),
          preview: found.previewUrl,
          link: String(found.trackViewUrl).split('&uo=')[0],
          artwork: String(found.artworkUrl100).replace(/\/\d+x\d+bb\./, '/600x600bb.'),
          start,
          previewSeconds,
        });
        artistIds.set(found.artistId, pick.artist);
        console.log(`found    ${genre}: ${pick.pick} (start ${String(start)} s)`);
      } catch (error) {
        missing.push(`${genre}: ${pick.pick} (${error.message})`);
      }
    }
    const songs = [...kept, ...shuffled(fresh, `cspnews-song-${genre}-${String(kept.length)}`)];
    writeFileSync(file, `${JSON.stringify(songs, null, 2)}\n`);
    for (const song of songs) {
      catalog.set(plain(`${song.artist} ${song.title}`), { artist: song.artist, title: song.title });
    }
  }

  // Other well-known songs by the same artists, so the answer is not the only name to pick from.
  for (const [artistId, artist] of artistIds) {
    const results = await itunes(`lookup?id=${String(artistId)}&entity=song&limit=12`);
    for (const result of results) {
      if (result.wrapperType !== 'track' || UNWANTED.test(String(result.trackName))) continue;
      const title = String(result.trackName)
        .replace(/\s+[-–]\s+(\d{4}\s+)?remaster.*$/i, '')
        .replace(/\s*\((\d{4}\s+)?remaster.*?\)/i, '')
        .trim();
      const key = plain(`${artist} ${title}`);
      if (!catalog.has(key)) catalog.set(key, { artist, title });
    }
  }
  const sortedCatalog = [...catalog.values()].sort((a, b) =>
    `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`, 'tr'),
  );
  writeFileSync(join(ROOT, 'songs', 'catalog.json'), `${JSON.stringify(sortedCatalog)}\n`);
  writeFileSync(join(ROOT, 'songs', 'missing.txt'), missing.length ? `${missing.join('\n')}\n` : '');
  console.log(`\n${String(missing.length)} missing, ${String(sortedCatalog.length)} names in the catalog`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) await main();
