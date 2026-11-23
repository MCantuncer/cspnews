import { z } from 'zod';

import { GENRES } from './edition.js';
import { songKey } from './song.js';

/**
 * The all-time list (data/canon.json): the songs an `alltime` pick is drawn from. Each entry says
 * where its standing comes from: a published best-of list (`list`, with its address), Can's own
 * favourite (`can`, picked first), or the editors (`editor`, before a list has been checked).
 *
 * A techno entry needs a verified `bpm` before it can be picked; entries waiting for one stay on
 * the list, and the music Collect fills the tempo from Beatport.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const STANDINGS = ['list', 'can', 'editor'] as const;

export const CanonEntrySchema = z
  .object({
    genre: z.enum(GENRES),
    title: text(120),
    artists: z.array(text(80)).min(1).max(6),
    /** Year of first release; the Collect checks it against MusicBrainz. */
    year: z.number().int().min(1970).max(2100),
    standing: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('list'), name: text(120), url: z.url() }).strict(),
      z.object({ kind: z.literal('can') }).strict(),
      z.object({ kind: z.literal('editor'), note: text(200) }).strict(),
    ]),
    /** Verified tempo, techno only. */
    bpm: z.number().min(40).max(220).optional(),
  })
  .strict();
export type CanonEntry = z.infer<typeof CanonEntrySchema>;

export const CanonSchema = z.array(CanonEntrySchema);

export function parseCanon(input: unknown): CanonEntry[] {
  const entries = CanonSchema.parse(input);
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = canonKey(entry);
    if (seen.has(key)) throw new Error(`The all-time list has ${key} twice.`);
    seen.add(key);
  }
  return entries;
}

export function canonKey(entry: Pick<CanonEntry, 'artists' | 'title'>): string {
  return songKey(entry.artists[0] ?? '', entry.title);
}
