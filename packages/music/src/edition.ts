import type { Language } from '@cspnews/core';
import { z } from 'zod';

/**
 * A day's music edition: five songs in each of three genres, every one with the reason it is
 * there and the measured numbers behind that reason (docs/music.md). One file per day,
 * `data/music/<date>.json`, published with the evening bulletin.
 */

export const GENRES = ['global', 'turkey', 'techno'] as const;
export type Genre = (typeof GENRES)[number];

export const PICKS_PER_GENRE = 5;

/** The highest tempo a techno pick may have (Can, 2026-11-23: "not over 134 BPM"). */
export const TECHNO_MAX_BPM = 134;

/**
 * Why a song is in today's five.
 * - `new`: out in the last 7 days, with a measured reaction (a chart entry, first-day plays).
 * - `climbing`: out in the last year, and moving up a chart.
 * - `back`: first released 2+ years ago, and played far above its own usual level again.
 * - `alltime`: on the all-time list (data/canon.json).
 */
export const REASON_KINDS = ['new', 'climbing', 'back', 'alltime'] as const;
export type ReasonKind = (typeof REASON_KINDS)[number];

/** Where a measured number comes from. Spotify chart numbers are read through kworb. */
export const EVIDENCE_SOURCES = [
  'spotify',
  'apple',
  'deezer',
  'beatport',
  'youtube',
  'soundcloud',
  'lastfm',
  'musicbrainz',
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

/**
 * What a number measures.
 * - `rank` / `rankBefore`: place on `chart` today, and on an earlier day (`before`).
 * - `plays`: plays, streams or views in the window `chart` names (a day, the first 18 hours).
 * - `usualPlays`: the song's own usual daily plays (median of the last 28 days in our history).
 * - `surge`: plays today divided by `usualPlays`.
 * - `daysOffChart`: how long an old song was off `chart` before it came back.
 * - `daysOnChart`: days in a row on `chart`.
 * - `charts`: how many of the charts we read have the song today.
 */
export const METRICS = [
  'rank',
  'rankBefore',
  'plays',
  'usualPlays',
  'surge',
  'daysOffChart',
  'daysOnChart',
  'charts',
] as const;
export type Metric = (typeof METRICS)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const bilingual = (max: number) => z.object({ en: text(max), tr: text(max) }).strict();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.iso.datetime({ offset: true });
const https = z.url({ protocol: /^https$/ });
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

export const EvidenceSchema = z
  .object({
    source: z.enum(EVIDENCE_SOURCES),
    metric: z.enum(METRICS),
    value: z.number().nonnegative(),
    /** The chart or window, as its source names it: "Spotify Türkiye daily", "Beatport Peak Time Top 100". */
    chart: text(80),
    /** When the number was read. */
    at: isoTime,
    /** For `rankBefore`: the day it was read on. */
    before: isoDate.optional(),
    url: https,
  })
  .strict();
export type Evidence = z.infer<typeof EvidenceSchema>;

/** A tempo with where it was read. Beatport is the source of record; a second source may confirm. */
export const BpmSchema = z
  .object({
    value: z.number().min(40).max(220),
    source: z.enum(['beatport', 'deezer']),
    url: https,
    /** A second source's reading, when there is one. */
    confirmedBy: z
      .object({ source: z.enum(['beatport', 'deezer']), value: z.number().min(40).max(220) })
      .strict()
      .optional(),
  })
  .strict();
export type Bpm = z.infer<typeof BpmSchema>;

/**
 * Where the song plays. The page uses SoundCloud's official player when `soundcloud` is set
 * (checked to embed, from the artist's or label's own account), and otherwise Apple's free
 * 30-second `preview`, with links out to the full song.
 */
export const PlaySchema = z
  .object({
    soundcloud: z
      .object({
        url: z.url({ protocol: /^https$/, hostname: /^(www\.)?soundcloud\.com$/ }),
        /** The SoundCloud account that uploaded it, as oEmbed names it. */
        uploader: text(80),
      })
      .strict()
      .optional(),
    preview: z.url({ protocol: /^https$/, hostname: /\.(apple|mzstatic)\.com$/ }).optional(),
    spotify: z.url({ protocol: /^https$/, hostname: /^open\.spotify\.com$/ }).optional(),
    youtube: z
      .url({ protocol: /^https$/, hostname: /^(www\.|music\.)?youtube\.com$|^youtu\.be$/ })
      .optional(),
    appleMusic: z.url({ protocol: /^https$/, hostname: /^music\.apple\.com$/ }).optional(),
    beatport: z.url({ protocol: /^https$/, hostname: /^(www\.)?beatport\.com$/ }).optional(),
  })
  .strict();
export type Play = z.infer<typeof PlaySchema>;

export const PickSchema = z
  .object({
    /** Stable across days: `<lead artist>-<title>`, folded (see songKey). */
    id: slug,
    title: text(120),
    /** Lead artist first, then featured artists. Names keep their own spelling. */
    artists: z.array(text(80)).min(1).max(6),
    /** International Standard Recording Code, when a source gives it: the best key for one song. */
    isrc: z
      .string()
      .regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/)
      .optional(),
    /** First release anywhere, the earliest date our sources give, so a reissue is not "new". */
    released: isoDate,
    kind: z.enum(REASON_KINDS),
    /** One line on why it is here, using only numbers from `evidence`. */
    reason: bilingual(200),
    evidence: z.array(EvidenceSchema).max(8),
    bpm: BpmSchema.optional(),
    /** Length in seconds. */
    duration: z.number().int().min(30).max(1800).optional(),
    /** Saved cover art, `media/music/<file>`. */
    cover: z
      .string()
      .regex(/^[a-z0-9-]+\.(jpg|png|webp)$/)
      .optional(),
    play: PlaySchema,
  })
  .strict();
export type Pick = z.infer<typeof PickSchema>;

export const MusicEditionSchema = z
  .object({
    date: isoDate,
    publishAt: isoTime,
    genres: z
      .object({
        global: z.array(PickSchema),
        turkey: z.array(PickSchema),
        techno: z.array(PickSchema),
      })
      .strict(),
  })
  .strict();
export type MusicEdition = z.infer<typeof MusicEditionSchema>;

export function parseMusicEdition(input: unknown): MusicEdition {
  return MusicEditionSchema.parse(input);
}

/** A pick as one reader sees it: the reason in their language. */
export type LocalPick = Omit<Pick, 'reason'> & { reason: string };

export function pickIn(pick: Pick, lang: Language): LocalPick {
  return { ...pick, reason: pick.reason[lang] };
}

/** Every pick of an edition with its genre, in page order. */
export function picksOf(edition: MusicEdition): { genre: Genre; pick: Pick }[] {
  return GENRES.flatMap((genre) => edition.genres[genre].map((pick) => ({ genre, pick })));
}
