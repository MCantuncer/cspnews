import { z } from 'zod';

import { ExtraSourceSchema } from './extras.js';
import { StoryImageSchema } from './image.js';
import { LANGUAGES, type Language } from './language.js';

/**
 * Turks abroad (Dünyadaki Türkler): Turkish people making news in other countries, mostly
 * athletes in foreign leagues (docs/design/decisions/turks-abroad.md). One item is one person and
 * what they did since the last bulletin: a game, a record, an injury, a move. Like Transfers it is
 * not a story: no evidence drawer or day-line timeline, and it never counts towards reading time,
 * the one-minute brief or "three things to remember".
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const id = text(64);
const isoDateTime = z.iso.datetime({ offset: true });

/** What a person is known for. Sport comes first; the others are for the rare big moment. */
export const ABROAD_FIELDS = ['sport', 'science', 'arts', 'business', 'other'] as const;

/** Items carry only these two evidence labels: we never run a single-source claim about a person. */
export const ABROAD_LABEL_VALUES = ['confirmed', 'reported'] as const;

/** How one of the person's recent games ended for their side. */
export const ABROAD_RESULTS = ['win', 'draw', 'loss'] as const;

/** One recent game, oldest first in `form`: the result and the person's own number in it. */
export const AbroadGameSchema = z
  .object({ result: z.enum(ABROAD_RESULTS), value: text(8).optional() })
  .strict();

/** A number worth showing large on the person's page (points, a ranking, a record). */
export const AbroadFactSchema = z.object({ value: text(24), label: text(60) }).strict();

/** The item in one language. Names of people, clubs, leagues and nicknames are never translated. */
export const AbroadVersionSchema = z
  .object({
    /** Club and league, or sport and tour: "Houston Rockets, NBA", "Tenis, WTA turu". */
    where: text(80),
    /** One line for Contents, with the result first: "28 points as the Rockets beat the Lakers". */
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
  })
  .strict();

export const AbroadItemSchema = z
  .object({
    id,
    /** The person's name, as they write it: "Alperen Şengün". */
    person: text(60),
    field: z.enum(ABROAD_FIELDS),
    label: z.enum(ABROAD_LABEL_VALUES),
    versions: z.object({ en: AbroadVersionSchema, tr: AbroadVersionSchema }).strict(),
    /** The final score of the game the item is about: "Rockets 118, Lakers 109". */
    score: text(60).optional(),
    /** When that game was played; the site shows it in Istanbul time. */
    playedAt: isoDateTime.optional(),
    /** When the next game starts, with `next` saying where. */
    nextAt: isoDateTime.optional(),
    /** Up to the last five games, oldest first. */
    form: z.array(AbroadGameSchema).min(2).max(5).optional(),
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
    for (const language of LANGUAGES) {
      const version = item.versions[language];
      if ((item.nextAt === undefined) !== (version.next === undefined)) {
        issue('Give the next game both a time and a place', ['versions', language, 'next']);
      }
      const counted = item.form?.some((game) => game.value !== undefined) ?? false;
      if (counted !== (version.formOf !== undefined)) {
        issue('Say what the numbers under the last games count', ['versions', language, 'formOf']);
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
    field: z.enum(ABROAD_FIELDS),
    /** The sport, or what they do: "basketball", "football", "science". */
    what: text(40),
  })
  .strict();

export type AbroadField = (typeof ABROAD_FIELDS)[number];
export type AbroadGame = z.infer<typeof AbroadGameSchema>;
export type AbroadItem = z.infer<typeof AbroadItemSchema>;
export type AbroadVersion = z.infer<typeof AbroadVersionSchema>;
export type AbroadPersonInput = z.input<typeof AbroadPersonSchema>;
export type AbroadPerson = z.output<typeof AbroadPersonSchema>;

/** An item as one reader reads it. */
export type LocalAbroadItem = Omit<AbroadItem, 'versions'> & AbroadVersion & { language: Language };

export function abroadIn(item: AbroadItem, language: Language): LocalAbroadItem {
  const { versions, ...shared } = item;
  return { ...shared, ...versions[language], language };
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

/** The people on the list that a piece of text names, by full name or alias, as whole words. */
export function peopleNamedIn(value: string, people: readonly AbroadPerson[]): AbroadPerson[] {
  const folded = ` ${foldName(value).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return people.filter((person) =>
    [person.name, ...person.aliases].some((name) => {
      const needle = foldName(name)
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
      return needle.length > 0 && folded.includes(` ${needle} `);
    }),
  );
}
