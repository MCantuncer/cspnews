import { z } from 'zod';

import { AndFinallySchema, TRANSFERS_MAX, TransferMoveSchema } from './extras.js';
import { LANGUAGES, type Language } from './language.js';
import { SECTIONS } from './sections.js';

/**
 * A written story, as the Verify and Write run produces it and the website shows it.
 *
 * Every story is written twice, in English and in Turkish (`versions`), each written natively
 * from the sources rather than translated line by line. Facts that don't depend on language
 * (sources, timeline, photo, label) are shared. The reader sees the version in their
 * interface language (`storyIn`).
 *
 * Each version has two layers:
 * - for scanning: `shortTitle`, `title` and a three-line `summary`;
 * - for reading: a full `body` of 300 to 700 words in 3 or 4 sections with subheads.
 * The summary never replaces the body.
 *
 * Optional fields add facts, a timeline and visuals only when the news has them.
 */

export const EVIDENCE_LABEL_VALUES = [
  'confirmed',
  'reported',
  'single-source',
  'disputed',
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;
const isoDateTime = z.iso.datetime({ offset: true });

/** A number that matters, with where it comes from. */
export const FactSchema = z
  .object({
    label: text(60),
    value: text(40),
    source: text(80),
  })
  .strict();

/** An earlier related event, for the timeline (for example the last rate decisions). */
export const SeriesPointSchema = z
  .object({
    date: z.iso.date(),
    value: text(40),
    label: text(80),
  })
  .strict();

/** Before and after values for a small chart, when the story is about a change in a number. */
export const KeyNumberSchema = z
  .object({
    label: text(60),
    unit: text(16),
    before: z.number(),
    after: z.number(),
    source: text(80),
  })
  .strict();

/** Where the story happened, for a locator map. */
export const PlaceSchema = z
  .object({
    name: text(80),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    region: text(80),
  })
  .strict();

/**
 * A quote, always with who said it and the outlet that reported it. `translated` marks a quote
 * given in another language than the speaker used, so the page can say so.
 */
export const QuoteSchema = z
  .object({
    quote: text(400),
    speaker: text(80),
    sourceId: text(64),
    translated: z.literal(true).optional(),
  })
  .strict();

export const ParagraphSchema = z.object({ text: text(2_000) }).strict();

/** One part of the story body under a short subhead. */
export const BodySectionSchema = z
  .object({
    subhead: text(60),
    blocks: z
      .array(z.union([ParagraphSchema, QuoteSchema]))
      .min(1)
      .max(8),
  })
  .strict();

/**
 * How long the full story is, in words. Turkish says the same in about a fifth fewer words
 * (suffixes do the work of English prepositions and articles), so its range is scaled down.
 */
export const BODY_WORDS: Record<Language, { min: number; max: number }> = {
  en: { min: 300, max: 700 },
  tr: { min: 240, max: 560 },
};

/** The outlet photo, always credited. */
export const StoryImageSchema = z
  .object({
    url: z.url(),
    sourceId: text(64),
    sourceName: text(80),
    articleUrl: z.url(),
  })
  .strict();

/**
 * The story's own life, for stories without a key number: first report, outlets joining,
 * primary source, fact-checks and label changes come from the bulletin candidates.
 * `updated` is added by the Write run when a published story gets new material facts
 * ("the company will appeal"), with a short note in both languages and, when known, the source.
 */
const timelineEvent = <Note extends z.ZodType>(note: Note) =>
  z
    .object({
      kind: z.enum([
        'first-reported',
        'outlet-joined',
        'primary-source',
        'fact-check',
        'label-changed',
        'updated',
      ]),
      at: isoDateTime,
      sourceId: text(64).optional(),
      note: note.optional(),
      from: z.enum(EVIDENCE_LABEL_VALUES).optional(),
      to: z.enum(EVIDENCE_LABEL_VALUES).optional(),
    })
    .strict()
    .refine((event) => {
      if (event.kind === 'label-changed') {
        return event.from !== undefined && event.to !== undefined && event.note === undefined;
      }
      if (event.kind === 'updated') {
        return event.note !== undefined && event.from === undefined && event.to === undefined;
      }
      return event.sourceId !== undefined && event.note === undefined;
    }, 'A label change needs from and to, an update needs a note, every other event a source');

/** A timeline event in one language, as Hot News (rules only) and the reader's page use it. */
export const TimelineEventSchema = timelineEvent(text(140));

/** A bulletin story's timeline event: an update's note is written in both languages. */
export const StoryTimelineEventSchema = timelineEvent(
  z.object({ en: text(140), tr: text(140) }).strict(),
);

export const StorySourceSchema = z
  .object({
    sourceId: text(64),
    url: z.url(),
    /** False for outlets that only republished another outlet's text. */
    confirms: z.boolean(),
  })
  .strict();

const wordsIn = (body: readonly BodySection[]) =>
  wordCount(
    body
      .flatMap((section) =>
        section.blocks.map((block) => ('text' in block ? block.text : block.quote)),
      )
      .join(' '),
  );

/** The story in one language: everything a reader reads. */
export const StoryVersionSchema = z
  .object({
    /** 3 to 6 words with the key fact, for the Contents list. */
    shortTitle: text(60).refine(
      (value) => wordCount(value) >= 3 && wordCount(value) <= 6,
      'Use 3 to 6 words',
    ),
    title: text(140),
    /** Three short lines for scanning: what happened, why it matters, what's next. */
    summary: z
      .object({
        what: text(200),
        why: text(200),
        next: text(200),
      })
      .strict(),
    /**
     * The full story the page reads: 3 or 4 sections, each with a short subhead, and
     * `BODY_WORDS` long. Written from the confirming sources, with context, reactions from
     * different sides where they exist, and background. Quotes are always attributed.
     */
    body: z.array(BodySectionSchema).min(3).max(4),

    facts: z.array(FactSchema).max(5).optional(),
    series: z.array(SeriesPointSchema).max(12).optional(),
    keyNumber: KeyNumberSchema.optional(),
    place: PlaceSchema.optional(),
  })
  .strict();

export type StoryVersion = z.infer<typeof StoryVersionSchema>;

/**
 * The checks that keep the two versions the same story: the same optional parts, the same
 * number of facts and earlier values, the same dates, numbers and coordinates, and the same
 * quoted outlets. Wording, units and number formats may differ; facts may not.
 */
export function versionMismatches(en: StoryVersion, tr: StoryVersion): string[] {
  const problems: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  for (const part of ['facts', 'series', 'keyNumber', 'place'] as const) {
    if ((en[part] === undefined) !== (tr[part] === undefined)) {
      problems.push(`Both versions need ${part}, or neither`);
    }
  }
  if ((en.facts?.length ?? 0) !== (tr.facts?.length ?? 0)) {
    problems.push('Both versions need the same number of facts');
  }
  if (
    !same(
      en.series?.map((point) => point.date),
      tr.series?.map((point) => point.date),
    )
  ) {
    problems.push('Both versions need the same series dates');
  }
  if (en.keyNumber && tr.keyNumber) {
    const { before, after } = en.keyNumber;
    if (before !== tr.keyNumber.before || after !== tr.keyNumber.after) {
      problems.push('Both versions need the same key number');
    }
  }
  if (en.place && tr.place) {
    if (en.place.lat !== tr.place.lat || en.place.lon !== tr.place.lon) {
      problems.push('Both versions need the same place');
    }
  }
  const quoted = (version: StoryVersion) =>
    version.body
      .flatMap((section) => section.blocks)
      .flatMap((block) => ('sourceId' in block ? [block.sourceId] : []))
      .sort();
  if (!same(quoted(en), quoted(tr))) {
    problems.push('Both versions need the same quotes from the same outlets');
  }
  return problems;
}

export const WrittenStorySchema = z
  .object({
    id: text(64),
    section: z.enum(SECTIONS),
    /** The language most of the sources were written in, so quotes in the other one are translations. */
    sourceLanguage: z.enum(LANGUAGES),
    label: z.enum(EVIDENCE_LABEL_VALUES),
    developing: z.boolean(),

    versions: z.object({ en: StoryVersionSchema, tr: StoryVersionSchema }).strict(),

    timeline: z.array(StoryTimelineEventSchema).max(40).optional(),
    /** Organisation the story is about, for a logo when there is no photo. */
    orgId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    image: StoryImageSchema.optional(),

    sources: z.array(StorySourceSchema).min(1),
    publishedAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict()
  .superRefine((story, context) => {
    for (const language of LANGUAGES) {
      const { min, max } = BODY_WORDS[language];
      const words = wordsIn(story.versions[language].body);
      if (words < min || words > max) {
        context.addIssue({
          code: 'custom',
          message: `Write ${String(min)} to ${String(max)} words`,
          path: ['versions', language, 'body'],
        });
      }
    }
    for (const message of versionMismatches(story.versions.en, story.versions.tr)) {
      context.addIssue({ code: 'custom', message, path: ['versions'] });
    }
  });

export type Quote = z.infer<typeof QuoteSchema>;
export type BodySection = z.infer<typeof BodySectionSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type SeriesPoint = z.infer<typeof SeriesPointSchema>;
export type KeyNumber = z.infer<typeof KeyNumberSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type StoryImage = z.infer<typeof StoryImageSchema>;
export type StorySource = z.infer<typeof StorySourceSchema>;
export type TimelineEntry = z.infer<typeof TimelineEventSchema>;
export type WrittenStory = z.infer<typeof WrittenStorySchema>;

/** A story as one reader reads it: the shared facts plus the version in their language. */
export type LocalStory = Omit<WrittenStory, 'versions' | 'timeline'> &
  StoryVersion & { language: Language; timeline?: TimelineEntry[] };

/** The story in the reader's language, with timeline notes in that language too. */
export function storyIn(story: WrittenStory, language: Language): LocalStory {
  const { versions, timeline, ...shared } = story;
  return {
    ...shared,
    ...versions[language],
    language,
    ...(timeline && {
      timeline: timeline.map(({ note, ...event }) => ({
        ...event,
        ...(note && { note: note[language] }),
      })),
    }),
  };
}

/** A published bulletin: its slot and its stories, in reading order. */
export const BulletinSchema = z
  .object({
    /** 2: every story in English and Turkish. */
    version: z.literal(2),
    slot: text(32),
    publishAt: isoDateTime,
    writtenAt: isoDateTime,
    stories: z.array(WrittenStorySchema).min(1),
    /** The light close after the news, when there is something worth it (extras.ts). */
    andFinally: AndFinallySchema.optional(),
    /** Football moves that went forward since the last bulletin (extras.ts). */
    transfers: z.array(TransferMoveSchema).min(1).max(TRANSFERS_MAX).optional(),
  })
  .strict()
  .refine((bulletin) => {
    const ids = [
      ...bulletin.stories,
      ...(bulletin.andFinally?.light ?? []),
      ...(bulletin.andFinally?.rumours ?? []),
      ...(bulletin.transfers ?? []),
    ].map((item) => item.id);
    return new Set(ids).size === ids.length;
  }, 'Story ids must be unique');

export type Bulletin = z.infer<typeof BulletinSchema>;

/** Validates a bulletin written by the Verify and Write run; throws with every problem listed. */
export function parseBulletin(input: unknown): Bulletin {
  return BulletinSchema.parse(input);
}
