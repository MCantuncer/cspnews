import { z } from 'zod';

import { SECTIONS } from './sections.js';

/**
 * Source registry types (US-50).
 *
 * Every outlet, wire, fact-checker and primary feed is described once, in typed config.
 * Verification uses `ownerGroup`, `camp` and `tier` to decide whether sources are independent
 * and how much weight each one carries.
 */

/** How a source is read. */
export const SOURCE_KINDS = ['rss', 'gdelt', 'fact-check', 'primary'] as const;

/**
 * Editorial camp. For Turkish outlets this records political alignment, so a story confirmed
 * across camps can be told apart from one confirmed several times inside one camp.
 */
export const CAMPS = [
  'pro-government',
  'opposition',
  'mainstream',
  'independent',
  'state-wire',
  'international',
  'specialist',
] as const;

/** Reliability tier, strongest first. */
export const TIERS = ['wire', 'established', 'partisan', 'low'] as const;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SourceSchema = z
  .object({
    id: z.string().regex(idPattern, 'Use lowercase words joined by hyphens'),
    name: z.string().min(1),
    kind: z.enum(SOURCE_KINDS),
    url: z.url(),
    /** Sections this source feeds. */
    sections: z.array(z.enum(SECTIONS)).min(1),
    /** ISO 639-1 language code of the source's articles. */
    language: z.string().regex(/^[a-z]{2}$/),
    /** Sources with the same owner group never count as independent confirmations. */
    ownerGroup: z.string().regex(idPattern),
    camp: z.enum(CAMPS),
    tier: z.enum(TIERS),
    /** Set to false to keep a source in the registry without reading it. */
    enabled: z.boolean().default(true),
  })
  .strict();

export type SourceInput = z.input<typeof SourceSchema>;
export type Source = z.output<typeof SourceSchema>;
export type SourceKind = Source['kind'];
export type Camp = Source['camp'];
export type Tier = Source['tier'];

/**
 * Validates a source registry. Throws with every problem listed, so a bad config fails
 * at startup and in CI rather than during a bulletin run.
 */
export function defineSources(input: readonly SourceInput[]): Source[] {
  const sources = z.array(SourceSchema).parse(input);

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.id)) {
      duplicates.add(source.id);
    }
    seen.add(source.id);
  }
  if (duplicates.size > 0) {
    throw new Error(`Duplicate source ids: ${[...duplicates].join(', ')}`);
  }

  return sources;
}

/** Kinds whose `url` is an RSS, RDF or Atom feed. */
export const FEED_KINDS: readonly SourceKind[] = ['rss', 'primary', 'fact-check'];

/** True for sources read as a feed (as opposed to an API such as GDELT). */
export function isFeedSource(source: Source): boolean {
  return FEED_KINDS.includes(source.kind);
}
