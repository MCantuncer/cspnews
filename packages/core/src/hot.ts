import { z } from 'zod';

import { SECTIONS } from './sections.js';
import { PlaceSchema, StorySourceSchema, TimelineEventSchema } from './story.js';

/**
 * Hot News, as the monitor publishes it between bulletins (F-11, US-30, US-31).
 *
 * The monitor runs on rules only, so a hot story carries what the rules know: the lead
 * outlet's headline, the outlets reporting it, its own timeline and, when known, the place.
 * Only Confirmed and Reported stories are published: single-source and disputed stories are
 * held back. The site reads the feed from `/hot.json` and shows the newest story as one line.
 */
export const HOT_LABEL_VALUES = ['confirmed', 'reported'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const isoDateTime = z.iso.datetime({ offset: true });

export const HotStorySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    section: z.enum(SECTIONS),
    /** The headline's language, from the lead outlet. */
    language: z.enum(['tr', 'en']),
    /** 3 to 8 words with the key fact, for the Hot News line. */
    shortTitle: text(60),
    title: text(160),
    label: z.enum(HOT_LABEL_VALUES),
    firstSeenAt: isoDateTime,
    updatedAt: isoDateTime,
    sources: z.array(StorySourceSchema).min(2),
    timeline: z.array(TimelineEventSchema).max(40),
    place: PlaceSchema.optional(),
  })
  .strict();

export const HotFeedSchema = z
  .object({
    version: z.literal(1),
    generatedAt: isoDateTime,
    /** Newest first; empty when nothing is hot. */
    stories: z.array(HotStorySchema).max(10),
  })
  .strict();

export type HotStory = z.infer<typeof HotStorySchema>;
export type HotFeed = z.infer<typeof HotFeedSchema>;

/** Validates the Hot News feed; throws with every problem listed. */
export function parseHotFeed(input: unknown): HotFeed {
  return HotFeedSchema.parse(input);
}
