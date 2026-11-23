import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  GENRES,
  parseMusicEdition,
  picksOf,
  type Genre,
  type MusicEdition,
  type Pick,
  type ReasonKind,
} from '@cspnews/music';

import type { InterfaceLanguage } from './evidence.js';
import { localePath } from './locale.js';

/**
 * The music editions (docs/design/decisions/music.md), read at build time from
 * `data/music/<yyyy-mm-dd>.json`. A file that fails the format stops the build, like a bulletin.
 */

const FILE_NAME = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** Where editions are read from: `CSPNEWS_MUSIC`, or `data/music` at the repository root. */
export function musicDirectory(): string {
  const { CSPNEWS_MUSIC } = process.env;
  return resolve(CSPNEWS_MUSIC ?? resolve(process.cwd(), '../../data/music'));
}

export function readMusicFile(fileName: string, contents: string): MusicEdition {
  const match = FILE_NAME.exec(fileName);
  if (!match?.[1]) throw new Error(`${fileName}: music files are named <yyyy-mm-dd>.json`);
  const edition = parseMusicEdition(JSON.parse(contents));
  if (edition.date !== match[1]) {
    throw new Error(
      `${fileName}: the file name says ${match[1]} but the edition is ${edition.date}`,
    );
  }
  return edition;
}

/** Every edition, newest first. A missing directory means nothing is published yet. */
export function loadMusic(directory = musicDirectory()): MusicEdition[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readMusicFile(name, readFileSync(join(directory, name), 'utf8')))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function musicPath(lang: InterfaceLanguage, date?: string): string {
  return localePath(date ? `/music/${date}` : '/music', lang);
}

export function cratePath(lang: InterfaceLanguage): string {
  return localePath('/music/crate', lang);
}

/** Full length of the day's songs, in minutes, rounded to the nearest five. */
export function editionMinutes(edition: MusicEdition): number {
  const seconds = picksOf(edition).reduce((sum, { pick }) => sum + (pick.duration ?? 0), 0);
  return Math.max(5, Math.round(seconds / 300) * 5);
}

/** "3:12". */
export function formatLength(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The Spotify track id, when the link is to one track (not a search). */
export function spotifyTrack(pick: Pick): string | undefined {
  return /open\.spotify\.com\/track\/([A-Za-z0-9]{22})/.exec(pick.play.spotify ?? '')?.[1];
}

/** What the player needs for one song; the page writes it into the song's row. */
export interface PlayerTrack {
  id: string;
  genre: Genre;
  title: string;
  artists: string;
  artwork?: string | undefined;
  preview?: string | undefined;
  soundcloud?: string | undefined;
}

export function playerTrack(genre: Genre, pick: Pick): PlayerTrack {
  return {
    id: pick.id,
    genre,
    title: pick.title,
    artists: pick.artists.join(', '),
    artwork: pick.artwork,
    preview: pick.play.preview,
    soundcloud: pick.play.soundcloud?.url,
  };
}

/** One row of the Crate: a pick with the day it was picked. */
export interface CrateEntry {
  date: string;
  genre: Genre;
  pick: Pick;
}

/** Every pick ever made, newest day first, page order within a day; a song picked twice shows once, on its latest day. */
export function crateDays(
  editions: readonly MusicEdition[],
): { date: string; entries: CrateEntry[] }[] {
  const seen = new Set<string>();
  return [...editions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((edition) => ({
      date: edition.date,
      entries: picksOf(edition)
        .filter(({ pick }) => !seen.has(pick.id) && Boolean(seen.add(pick.id)))
        .map(({ genre, pick }) => ({ date: edition.date, genre, pick })),
    }))
    .filter((day) => day.entries.length > 0);
}

const WORDS = {
  en: {
    title: 'Music for the curious',
    short: 'Music',
    intro: 'Five songs a day in each of three genres, each with the reason it is here.',
    meta: (count: number, minutes: number) =>
      `${String(count)} songs in three genres, about ${String(minutes)} minutes.`,
    playAll: (count: number) => `Play all ${String(count)}.`,
    playAllHint: 'One after another, genre by genre.',
    previews: 'Each song plays a 30-second preview here; the links under it open the full song.',
    genre: { global: 'Hip-hop, global', turkey: 'Türkçe rap', techno: 'Techno' } as Record<
      Genre,
      string
    >,
    fiveSongs: '5 songs',
    bpmRule: 'up to 134 BPM',
    kind: {
      new: 'New',
      climbing: 'Climbing',
      back: 'Old song, big again',
      alltime: 'All-time favourite',
    } as Record<ReasonKind, string>,
    preview: '30-second preview',
    fullSong: 'Full song',
    soundcloud: (length: string) => `Full song on SoundCloud, ${length}`,
    end: 'End of today’s music.',
    endNext: 'A new five in each genre every evening.',
    play: (title: string) => `Play ${title}`,
    pause: 'Pause',
    previous: 'Previous song',
    next: 'Next song',
    keep: (title: string) => `Keep ${title} in your Crate`,
    crate: 'Crate',
    crateIntro: 'Every song we have picked, kept for good. Fifteen more each day.',
    crateLink: 'Crate: every song so far',
    crateCount: (n: number) => (n === 1 ? '1 song' : `${String(n)} songs`),
    all: 'All',
    kept: 'Kept by you',
    keptEmpty: 'Nothing kept yet. Press the bookmark beside a song to keep it here.',
    today: 'Today’s music',
    todayHint: (n: number) => `${String(n)} songs in hip-hop, Türkçe rap and techno.`,
    noMusic: 'The first music edition appears here as soon as it is published.',
    earlier: 'Earlier days',
    sources: 'Where the numbers come from',
    menu: 'Music for the curious',
  },
  tr: {
    title: 'Meraklısına müzik',
    short: 'Müzik',
    intro: 'Üç türde her gün beşer şarkı, her biri neden burada olduğuyla.',
    meta: (count: number, minutes: number) =>
      `Üç türde ${String(count)} şarkı, yaklaşık ${String(minutes)} dakika.`,
    playAll: (count: number) => `${String(count)}’ini de çal.`,
    playAllHint: 'Tür tür, art arda.',
    previews:
      'Her şarkının burada 30 saniyelik ön dinlemesi çalar; altındaki bağlantılar şarkının tamamını açar.',
    genre: { global: 'Hip-hop, dünya', turkey: 'Türkçe rap', techno: 'Techno' } as Record<
      Genre,
      string
    >,
    fiveSongs: '5 şarkı',
    bpmRule: 'en fazla 134 BPM',
    kind: {
      new: 'Yeni',
      climbing: 'Yükselişte',
      back: 'Eski şarkı, yeniden gündemde',
      alltime: 'Tüm zamanların favorisi',
    } as Record<ReasonKind, string>,
    preview: '30 saniyelik ön dinleme',
    fullSong: 'Tamamı',
    soundcloud: (length: string) => `Şarkının tamamı SoundCloud’da, ${length}`,
    end: 'Bugünün müziği bu kadar.',
    endNext: 'Her akşam her türde yeni beş şarkı.',
    play: (title: string) => `${title} çal`,
    pause: 'Duraklat',
    previous: 'Önceki şarkı',
    next: 'Sonraki şarkı',
    keep: (title: string) => `${title} plak kutuna eklensin`,
    crate: 'Plak kutusu',
    crateIntro: 'Seçtiğimiz her şarkı, kalıcı olarak burada. Her gün on beş yenisi.',
    crateLink: 'Plak kutusu: bugüne kadarki her şarkı',
    crateCount: (n: number) => `${String(n)} şarkı`,
    all: 'Hepsi',
    kept: 'Sakladıkların',
    keptEmpty: 'Henüz bir şey saklamadın. Bir şarkının yanındaki işarete basınca burada kalır.',
    today: 'Günün müziği',
    todayHint: (n: number) => `Hip-hop, Türkçe rap ve techno'da ${String(n)} şarkı.`,
    noMusic: 'İlk müzik sayısı yayımlanır yayımlanmaz burada.',
    earlier: 'Önceki günler',
    sources: 'Sayılar nereden',
    menu: 'Meraklısına müzik',
  },
};

export type MusicWords = (typeof WORDS)['en'];

export function musicWords(lang: InterfaceLanguage): MusicWords {
  return WORDS[lang];
}

export { GENRES };
