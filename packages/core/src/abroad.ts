import { z } from 'zod';

import { ExtraSourceSchema } from './extras.js';
import { StoryImageSchema } from './image.js';
import { LANGUAGES, type Language } from './language.js';

/**
 * Turks abroad (Dünyadaki Türkler): Turkish people making news in other countries: athletes in
 * foreign leagues, and scientists, artists, founders and young talents (docs/design/decisions/
 * turks-abroad.md). One item is one person and what they did since the last bulletin. Like
 * Transfers it is not a story: no evidence drawer or day-line timeline, and it never counts towards
 * reading time, the one-minute brief or "three things to remember".
 *
 * Each kind of person gets the numbers that fit it: a box score for a basketball player, match
 * stats for a footballer, the sets for a tennis player, the finishing place for a racer, and for
 * everyone else a milestone (an award, a paper, a first).
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const id = text(64);
const isoDateTime = z.iso.datetime({ offset: true });
const count = z.number().int().min(0).max(999);

/** What the person does. The sports have their own stat layouts; the rest show a milestone. */
export const ABROAD_KINDS = [
  'basketball',
  'football',
  'volleyball',
  'tennis',
  'motorsport',
  'sport',
  'science',
  'tech',
  'arts',
  'business',
] as const;

/** Kinds with a stat line of their own. */
export const STAT_SPORTS = [
  'basketball',
  'football',
  'volleyball',
  'tennis',
  'motorsport',
] as const;

/** Items carry only these two evidence labels: we never run a single-source claim about a person. */
export const ABROAD_LABEL_VALUES = ['confirmed', 'reported'] as const;

/** How one of the person's recent games ended for their side. */
export const ABROAD_RESULTS = ['win', 'draw', 'loss'] as const;

/** One recent game, oldest first in `form`: the result and the person's own number in it. */
export const AbroadGameSchema = z
  .object({ result: z.enum(ABROAD_RESULTS), value: text(8).optional() })
  .strict();

/** Made of tried, such as field goals 11 of 18. */
export const MadeSchema = z
  .object({ made: count, tried: count })
  .strict()
  .refine((shots) => shots.made <= shots.tried, 'Made cannot be more than tried');

/** A basketball box score line. */
export const BasketballLineSchema = z
  .object({
    sport: z.literal('basketball'),
    minutes: count.optional(),
    points: count,
    rebounds: count,
    assists: count,
    steals: count.optional(),
    blocks: count.optional(),
    fieldGoals: MadeSchema.optional(),
    threes: MadeSchema.optional(),
    freeThrows: MadeSchema.optional(),
    plusMinus: z.number().int().min(-99).max(99).optional(),
  })
  .strict();

/** A footballer's match: goals and assists first, then what the stats providers give. */
export const FootballLineSchema = z
  .object({
    sport: z.literal('football'),
    minutes: z.number().int().min(0).max(130).optional(),
    goals: count,
    assists: count,
    shots: count.optional(),
    shotsOnTarget: count.optional(),
    keyPasses: count.optional(),
    /** Pass accuracy in per cent. */
    passAccuracy: z.number().int().min(0).max(100).optional(),
    /** A goalkeeper's saves. */
    saves: count.optional(),
    /** A match rating out of 10, from the outlet that gave it. */
    rating: z.number().min(0).max(10).optional(),
  })
  .strict();

/** One set of a tennis match, from the person's side. */
export const TennisSetSchema = z
  .object({
    us: z.number().int().min(0).max(7),
    them: z.number().int().min(0).max(7),
    /** The loser's points in a tie-break, shown small as on a scoreboard. */
    tiebreak: count.optional(),
  })
  .strict();

export const TennisLineSchema = z
  .object({
    sport: z.literal('tennis'),
    /** The opponent's name, as they write it. */
    opponent: text(60),
    sets: z.array(TennisSetSchema).min(1).max(5),
    aces: count.optional(),
    doubleFaults: count.optional(),
  })
  .strict();

export const VolleyballLineSchema = z
  .object({
    sport: z.literal('volleyball'),
    points: count,
    attacks: count.optional(),
    blocks: count.optional(),
    aces: count.optional(),
    /** Sets won by each side. */
    sets: z
      .object({ us: z.number().int().min(0).max(3), them: z.number().int().min(0).max(3) })
      .strict()
      .optional(),
  })
  .strict();

export const MotorsportLineSchema = z
  .object({
    sport: z.literal('motorsport'),
    /** Where they finished; left out when they did not finish. */
    position: z.number().int().min(1).max(60).optional(),
    /** Where they started. */
    grid: z.number().int().min(1).max(60).optional(),
    /** The gap to the winner as the timing sheet gives it: "+4.217s". */
    gap: text(20).optional(),
    /** Points scored in the race, and their place in the championship after it. */
    points: z.number().min(0).max(100).optional(),
    standing: z.number().int().min(1).max(60).optional(),
  })
  .strict();

/** The numbers of the game or race the item is about, laid out for its sport. */
export const StatLineSchema = z.discriminatedUnion('sport', [
  BasketballLineSchema,
  FootballLineSchema,
  TennisLineSchema,
  VolleyballLineSchema,
  MotorsportLineSchema,
]);

/** What a non-sport milestone is, for its mark. */
export const MILESTONE_TYPES = ['award', 'paper', 'record', 'first', 'role', 'work'] as const;

/** A number worth showing large on the person's page (a season high, a ranking). */
export const AbroadFactSchema = z.object({ value: text(24), label: text(60) }).strict();

/** The item in one language. Names of people, clubs, leagues and nicknames are never translated. */
export const AbroadVersionSchema = z
  .object({
    /** Club and league, sport and tour, or institution: "Houston Rockets, NBA", "MIT". */
    where: text(80),
    /** One line for Contents with the news first: "28 points as the Rockets beat the Lakers". */
    title: text(110),
    /** The headline of the person's page. */
    headline: text(140),
    /** One to four short paragraphs: what happened, what was said (attributed), what it means. */
    story: z.array(text(600)).min(1).max(4),
    facts: z.array(AbroadFactSchema).max(2).optional(),
    /** What the numbers under `form` count: "Points" / "Sayı". */
    formOf: text(40).optional(),
    /** The next game, without the time: "At Denver" / "Denver deplasmanında". */
    next: text(80).optional(),
    /** The competition stage, for tennis and racing: "Quarter-final", "Japanese Grand Prix". */
    event: text(60).optional(),
    /** A milestone's name and one line on it: the prize, the paper's title, the record. */
    milestone: z
      .object({ name: text(140), detail: text(200).optional() })
      .strict()
      .optional(),
  })
  .strict();

export const AbroadItemSchema = z
  .object({
    id,
    /** The person's name, as they write it: "Alperen Şengün". */
    person: text(60),
    kind: z.enum(ABROAD_KINDS),
    /** A young talent on the way up, shown as such. */
    rising: z.boolean().optional(),
    /** Their age, when the story makes it matter (a young talent, a record). */
    age: z.number().int().min(10).max(110).optional(),
    label: z.enum(ABROAD_LABEL_VALUES),
    versions: z.object({ en: AbroadVersionSchema, tr: AbroadVersionSchema }).strict(),
    /** The final score of the game the item is about: "Rockets 118, Lakers 109". */
    score: text(60).optional(),
    /** When that game was played; the site shows it in Istanbul time. */
    playedAt: isoDateTime.optional(),
    /** When the next game starts, with `next` saying where. */
    nextAt: isoDateTime.optional(),
    /** The person's own numbers in that game, laid out for the sport. */
    stats: StatLineSchema.optional(),
    /** Up to the last five games, oldest first. */
    form: z.array(AbroadGameSchema).min(2).max(5).optional(),
    /** For people outside sport: what kind of milestone the item is about. */
    milestone: z.enum(MILESTONE_TYPES).optional(),
    sources: z.array(ExtraSourceSchema).min(1).max(5),
    /** The outlet photo of the person, saved like a story's. */
    image: StoryImageSchema.optional(),
    updatedAt: isoDateTime,
  })
  .strict()
  .superRefine((item, context) => {
    const issue = (message: string, path: (string | number)[] = []) => {
      context.addIssue({ code: 'custom', message, path });
    };
    const { en, tr } = item.versions;
    if (en.story.length !== tr.story.length) {
      issue('Both versions need the same number of story paragraphs', ['versions']);
    }
    if ((en.facts?.length ?? 0) !== (tr.facts?.length ?? 0)) {
      issue('Both versions need the same number of facts', ['versions']);
    }
    if (item.stats && item.stats.sport !== item.kind) {
      issue('The stat line must be for the person’s own sport', ['stats', 'sport']);
    }
    for (const language of LANGUAGES) {
      const version = item.versions[language];
      if ((item.nextAt === undefined) !== (version.next === undefined)) {
        issue('Give the next game both a time and a place', ['versions', language, 'next']);
      }
      const counted = item.form?.some((game) => game.value !== undefined) ?? false;
      if (counted !== (version.formOf !== undefined)) {
        issue('Say what the numbers under the last games count', ['versions', language, 'formOf']);
      }
      if ((item.milestone === undefined) !== (version.milestone === undefined)) {
        issue('Give a milestone both its type and its name', ['versions', language, 'milestone']);
      }
    }
    if (item.score !== undefined && item.playedAt === undefined) {
      issue('A score needs the time the game was played', ['playedAt']);
    }
  });

/** At most six people a bulletin: the ones with news since the last one. */
export const ABROAD_MAX = 6;

/**
 * Someone the abroad desk watches for (packages/config/src/abroad.ts). The desk picks up any
 * story that names one of them; the writer may still add someone who is not on the list.
 */
export const AbroadPersonSchema = z
  .object({
    id,
    name: text(60),
    /** Other ways outlets write the name, such as without Turkish letters ("Alperen Sengun"). */
    aliases: z.array(text(60)).max(6).default([]),
    kind: z.enum(ABROAD_KINDS),
  })
  .strict();

export type AbroadKind = (typeof ABROAD_KINDS)[number];
export type StatSport = (typeof STAT_SPORTS)[number];
export type MilestoneType = (typeof MILESTONE_TYPES)[number];
export type AbroadGame = z.infer<typeof AbroadGameSchema>;
export type StatLine = z.infer<typeof StatLineSchema>;
export type BasketballLine = z.infer<typeof BasketballLineSchema>;
export type FootballLine = z.infer<typeof FootballLineSchema>;
export type TennisLine = z.infer<typeof TennisLineSchema>;
export type VolleyballLine = z.infer<typeof VolleyballLineSchema>;
export type MotorsportLine = z.infer<typeof MotorsportLineSchema>;
export type AbroadItem = z.infer<typeof AbroadItemSchema>;
export type AbroadVersion = z.infer<typeof AbroadVersionSchema>;
export type AbroadPersonInput = z.input<typeof AbroadPersonSchema>;
export type AbroadPerson = z.output<typeof AbroadPersonSchema>;

/** An item as one reader reads it. The item's milestone type is `milestoneType` here. */
export type LocalAbroadItem = Omit<AbroadItem, 'versions' | 'milestone'> &
  AbroadVersion & { milestoneType?: MilestoneType; language: Language };

export function abroadIn(item: AbroadItem, language: Language): LocalAbroadItem {
  const { versions, milestone, ...shared } = item;
  return {
    ...shared,
    ...versions[language],
    ...(milestone && { milestoneType: milestone }),
    language,
  };
}

/** Validates the watch list; throws on a bad entry or a repeated id. */
export function definePeople(input: readonly AbroadPersonInput[]): AbroadPerson[] {
  const people = z.array(AbroadPersonSchema).parse(input);
  const ids = people.map((person) => person.id);
  const repeated = ids.filter((value, index) => ids.indexOf(value) !== index);
  if (repeated.length > 0) throw new Error(`Repeated person ids: ${repeated.join(', ')}`);
  return people;
}

/** Folds case and Turkish letters, so "ŞENGÜN", "Şengün" and "Sengun" read the same. */
export function foldName(value: string): string {
  return value.toLocaleLowerCase('tr').replaceAll('ı', 'i').normalize('NFD').replace(/\p{M}/gu, '');
}

const words = (value: string) =>
  ` ${foldName(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;

/** The people on the list that a piece of text names, by full name or alias, as whole words. */
export function peopleNamedIn(value: string, people: readonly AbroadPerson[]): AbroadPerson[] {
  const haystack = words(value);
  return people.filter((person) =>
    [person.name, ...person.aliases].some((name) => {
      const needle = words(name);
      return needle.trim().length > 0 && haystack.includes(needle);
    }),
  );
}

/**
 * True when a piece of text uses one of the phrases that point at a Turkish person abroad who
 * is not on the list yet ("Türk asıllı", "Turkish-born scientist"). Each phrase is matched from
 * the start of a word, so "Türk bilim insan" also finds "Türk bilim insanı".
 */
export function mentionsTurkAbroad(value: string, phrases: readonly string[]): boolean {
  const haystack = words(value);
  return phrases.some((phrase) => {
    const needle = words(phrase).trimEnd();
    return needle.trim().length > 0 && haystack.includes(needle);
  });
}
