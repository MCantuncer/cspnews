import { z } from 'zod';

import { SECTIONS } from './sections.js';

/**
 * A written story, as the Verify and Write run produces it and the website shows it.
 *
 * Every story has two layers:
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

/** A quote, always with who said it and the outlet that reported it. */
export const QuoteSchema = z
  .object({
    quote: text(400),
    speaker: text(80),
    sourceId: text(64),
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

export const MIN_BODY_WORDS = 300;
export const MAX_BODY_WORDS = 700;

/** The outlet photo, always credited. */
export const StoryImageSchema = z
  .object({
    url: z.url(),
    sourceId: text(64),
    sourceName: text(80),
    articleUrl: z.url(),
  })
  .strict();

export const StorySourceSchema = z
  .object({
    sourceId: text(64),
    url: z.url(),
    /** False for outlets that only republished another outlet's text. */
    confirms: z.boolean(),
  })
  .strict();

export const WrittenStorySchema = z
  .object({
    id: text(64),
    section: z.enum(SECTIONS),
    /** Turkish for Turkey stories, English for Tech and World. */
    language: z.enum(['tr', 'en']),
    label: z.enum(EVIDENCE_LABEL_VALUES),
    developing: z.boolean(),

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
     * The full story the page reads: 300 to 700 words in 3 or 4 sections, each with a short
     * subhead. Written from the confirming sources, with context, reactions from different
     * sides where they exist, and background. Quotes are always attributed.
     */
    body: z
      .array(BodySectionSchema)
      .min(3)
      .max(4)
      .refine(
        (sections) => {
          const words = wordCount(
            sections
              .flatMap((section) =>
                section.blocks.map((block) => ('text' in block ? block.text : block.quote)),
              )
              .join(' '),
          );
          return words >= MIN_BODY_WORDS && words <= MAX_BODY_WORDS;
        },
        `Write ${String(MIN_BODY_WORDS)} to ${String(MAX_BODY_WORDS)} words`,
      ),

    facts: z.array(FactSchema).max(5).optional(),
    series: z.array(SeriesPointSchema).max(12).optional(),
    keyNumber: KeyNumberSchema.optional(),
    place: PlaceSchema.optional(),
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
  .strict();

export type Quote = z.infer<typeof QuoteSchema>;
export type BodySection = z.infer<typeof BodySectionSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type SeriesPoint = z.infer<typeof SeriesPointSchema>;
export type KeyNumber = z.infer<typeof KeyNumberSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type StoryImage = z.infer<typeof StoryImageSchema>;
export type StorySource = z.infer<typeof StorySourceSchema>;
export type WrittenStory = z.infer<typeof WrittenStorySchema>;

/** A published bulletin: its slot and its stories, in reading order. */
export const BulletinSchema = z
  .object({
    version: z.literal(1),
    slot: text(32),
    publishAt: isoDateTime,
    writtenAt: isoDateTime,
    stories: z.array(WrittenStorySchema).min(1),
  })
  .strict()
  .refine(
    (bulletin) =>
      new Set(bulletin.stories.map((story) => story.id)).size === bulletin.stories.length,
    'Story ids must be unique',
  );

export type Bulletin = z.infer<typeof BulletinSchema>;

/** Validates a bulletin written by the Verify and Write run; throws with every problem listed. */
export function parseBulletin(input: unknown): Bulletin {
  return BulletinSchema.parse(input);
}
