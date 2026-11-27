/**
 * The daily song game's words and small helpers (docs/song-game.md). The rules live in
 * @cspnews/songgame; this file holds what the page shows, in both interface languages.
 */
import { CLIP_SECONDS, MAX_POINTS, type Genre } from '@cspnews/songgame';
import type { GameDay } from '@cspnews/wordgame';

import type { InterfaceLanguage } from './evidence';
import { localePath } from './locale';

const WORDS = {
  en: {
    name: 'Daily Song',
    games: 'Games',
    word: 'Word',
    song: 'Song',
    genres: { 'pop-tr': 'Turkish pop', rap: 'Hip-hop', rock: 'Rock', hits: 'Global hit' } as Record<
      Genre,
      string
    >,
    play: (seconds: string) => `Play ${seconds}`,
    roundOf: (n: number, total: number) => `${String(n)} of ${String(total)}`,
    pointsWord: 'points',
    missedShort: 'missed',
    streakLine: (n: number, best: number) =>
      `${String(n)} ${n === 1 ? 'day' : 'days'} in a row. Best run ${String(best)}.`,
    streakNow: 'Days in a row',
    dayScore: (n: number) => `Song set ${String(n)}`,
    stop: 'Stop',
    loading: 'Loading the song…',
    placeholder: 'Artist or song',
    noMatch: 'No song by that name in the list',
    skip: (seconds: string) => `Skip, +${seconds}`,
    skipName: 'Skip',
    giveUp: 'Give up',
    submit: 'Guess',
    skipped: 'Skipped',
    tryN: (n: number) => `Try ${String(n)}`,
    namedIn: (seconds: string) => `Named in ${seconds}`,
    notNamed: 'Not this time',
    points: (n: number) => `${String(n)} pts`,
    nextRound: 'Next song',
    seeResult: 'See the score',
    listen: 'Listen',
    appleMusic: 'Apple Music',
    youtube: 'YouTube',
    fullSong: 'The full song',
    total: `of ${String(MAX_POINTS)}`,
    scoreLine: [
      'Not today. The songs win this one.',
      'A start.',
      'Good ears.',
      'Sharp ears.',
      'Barely needed to listen.',
    ],
    share: 'Send to a friend',
    copied: 'Link copied',
    shareText: (n: number, points: number) =>
      `CSPNews Daily Song ${String(n)}: ${String(points)} of ${String(MAX_POINTS)}. Can you beat it?`,
    friend: 'Your friend',
    you: 'You',
    friendScored: (points: number) =>
      `A friend scored ${String(points)} on today’s songs. Your turn.`,
    friendOtherDay: (points: number, date: string) =>
      `Your friend scored ${String(points)} on ${date}’s songs. Today’s are new; play them and send yours back.`,
    youWin: 'You win.',
    friendWins: 'Your friend wins this one.',
    tie: 'A tie.',
    nextSet: 'New songs',
    streak: 'day streak',
    best: (n: number) => `Best ${String(n)}`,
    stats: 'Stats',
    played: 'Played',
    average: 'Average',
    bestScore: 'Best score',
    namedOn: 'Songs named at',
    missed: 'missed',
    noStatsYet: 'Your stats start with your first finished day.',
    howToPlay: 'How to play',
    helpTitle: 'Name the song with as little listening as you can',
    helpLede:
      'Four songs a day: Turkish pop, hip-hop, rock and a global hit. Each starts with a 0.1 second clip.',
    helpHeard: 'You hear',
    helpPoints: 'Points',
    helpLadder:
      'A wrong guess or a skip opens the next clip. On 16 s, keep guessing until you get it or give up.',
    helpFriend: 'Send your score to a friend: the link opens the same songs for them.',
    helpNote: 'New songs every day at midnight, Istanbul time. Clips are Apple Music previews.',
    start: 'Play',
    close: 'Close',
    unavailable: 'Today’s songs are on their way. Check back soon.',
    soundOff: 'Can’t hear it? Check that the phone isn’t on silent.',
    loadFailed: 'The song did not load. Try again.',
  },
  tr: {
    name: 'Günün Şarkısı',
    games: 'Oyunlar',
    word: 'Kelime',
    song: 'Şarkı',
    genres: { 'pop-tr': 'Türkçe pop', rap: 'Hip-hop', rock: 'Rock', hits: 'Global hit' } as Record<
      Genre,
      string
    >,
    play: (seconds: string) => `${seconds} dinle`,
    roundOf: (n: number, total: number) => `${String(n)} / ${String(total)}`,
    pointsWord: 'puan',
    missedShort: 'bilinemedi',
    streakLine: (n: number, best: number) =>
      `Üst üste ${String(n)} gün. En uzun seri ${String(best)}.`,
    streakNow: 'Üst üste gün',
    dayScore: (n: number) => `${String(n)}. set`,
    stop: 'Durdur',
    loading: 'Şarkı yükleniyor…',
    placeholder: 'Sanatçı ya da şarkı',
    noMatch: 'Listede bu adla şarkı yok',
    skip: (seconds: string) => `Geç, +${seconds}`,
    skipName: 'Geç',
    giveUp: 'Pes et',
    submit: 'Tahmin et',
    skipped: 'Geçildi',
    tryN: (n: number) => `${String(n)}. hak`,
    namedIn: (seconds: string) => `${seconds} dinleyip bildin`,
    notNamed: 'Bu sefer olmadı',
    points: (n: number) => `${String(n)} puan`,
    nextRound: 'Sıradaki şarkı',
    seeResult: 'Puanı gör',
    listen: 'Dinle',
    appleMusic: 'Apple Music',
    youtube: 'YouTube',
    fullSong: 'Şarkının tamamı',
    total: `/ ${String(MAX_POINTS)}`,
    scoreLine: [
      'Bugün şarkılar kazandı.',
      'Bir başlangıç.',
      'Kulağın iyi.',
      'Kulağın keskin.',
      'Dinlemene gerek kalmadı.',
    ],
    share: 'Arkadaşına gönder',
    copied: 'Bağlantı kopyalandı',
    shareText: (n: number, points: number) =>
      `CSPNews Günün Şarkısı ${String(n)}: ${String(MAX_POINTS)} üzerinden ${String(points)}. Geçebilir misin?`,
    friend: 'Arkadaşın',
    you: 'Sen',
    friendScored: (points: number) =>
      `Arkadaşın bugünün şarkılarından ${String(points)} puan aldı. Sıra sende.`,
    friendOtherDay: (points: number, date: string) =>
      `Arkadaşın ${date} şarkılarından ${String(points)} puan aldı. Bugünküler yeni; oyna ve puanını geri gönder.`,
    youWin: 'Sen kazandın.',
    friendWins: 'Bu sefer arkadaşın kazandı.',
    tie: 'Berabere.',
    nextSet: 'Yeni şarkılar',
    streak: 'günlük seri',
    best: (n: number) => `En iyi ${String(n)}`,
    stats: 'İstatistik',
    played: 'Oynanan',
    average: 'Ortalama',
    bestScore: 'En iyi puan',
    namedOn: 'Bilinen şarkılar',
    missed: 'bilinemedi',
    noStatsYet: 'İstatistiklerin ilk bitirdiğin günle başlar.',
    howToPlay: 'Nasıl oynanır',
    helpTitle: 'Şarkıyı olabildiğince az dinleyerek bil',
    helpLede:
      'Her gün dört şarkı: Türkçe pop, hip-hop, rock ve bir dünya hiti. Her biri 0,1 saniyelik bir parçayla başlar.',
    helpHeard: 'Dinlediğin',
    helpPoints: 'Puan',
    helpLadder:
      'Yanlış tahmin ya da geçmek sıradaki parçayı açar. 16 saniyede bilene ya da pes edene kadar tahmin edebilirsin.',
    helpFriend: 'Puanını arkadaşına gönder: bağlantı ona aynı şarkıları açar.',
    helpNote:
      'Her gün gece yarısı, İstanbul saatiyle yeni şarkılar. Parçalar Apple Music önizlemeleridir.',
    start: 'Oyna',
    close: 'Kapat',
    unavailable: 'Bugünün şarkıları yolda. Birazdan yeniden bak.',
    soundOff: 'Ses gelmiyor mu? Telefonun sessizde olmadığına bak.',
    loadFailed: 'Şarkı yüklenemedi. Yeniden dene.',
  },
};

export type SongWords = (typeof WORDS)['en'];

export const songWordsFor = (lang: InterfaceLanguage): SongWords => WORDS[lang];

/** "0.1 s" / "0,1 sn", for clip lengths. */
export function secondsLabel(seconds: number, lang: InterfaceLanguage): string {
  const number = new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', {
    maximumFractionDigits: 1,
  }).format(seconds);
  return lang === 'tr' ? `${number} sn` : `${number} s`;
}

/** The calm line over the final score, from 0 points up to a near-perfect day. */
export function scoreLineFor(points: number, lang: InterfaceLanguage): string {
  const lines = WORDS[lang].scoreLine;
  const share = points / MAX_POINTS;
  const index = points <= 0 ? 0 : share < 0.34 ? 1 : share < 0.6 ? 2 : share < 0.85 ? 3 : 4;
  return lines[index] ?? '';
}

const LONGEST_CLIP = CLIP_SECONDS[CLIP_SECONDS.length - 1] ?? 16;

/** Where a clip length sits on the clip bar, 0..1: a square-root scale, so 0.1 s is a visible sliver. */
export const barPosition = (seconds: number): number =>
  Math.sqrt(Math.min(Math.max(seconds, 0), LONGEST_CLIP) / LONGEST_CLIP);

export const songPath = (lang: InterfaceLanguage): string => localePath('/song', lang);

/** Where the browser keeps the day in progress and the finished days. */
export const SONG_GAME_KEY = 'cspnews:song:game';
export const SONG_RESULTS_KEY = 'cspnews:song:results';

/** One day's set as the page receives it: per genre, the clip source and the scrambled answer. */
export interface WindowSong {
  readonly genre: Genre;
  readonly preview: string;
  readonly start: number;
  /** JSON of `RevealedSong`, scrambled with `hideText` for the day and genre. */
  readonly answer: string;
}

export interface WindowSet {
  readonly day: GameDay;
  readonly number: number;
  readonly songs: readonly WindowSong[];
}

/** What the reader learns when a round ends. */
export interface RevealedSong {
  readonly artist: string;
  readonly title: string;
  readonly year?: number;
  readonly artwork: string;
  readonly link: string;
}
