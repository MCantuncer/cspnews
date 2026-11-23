import { z } from 'zod';

import { GENRES, type Genre } from './edition.js';

/**
 * Can's taste (data/taste.json), a smaller weight in the ranking that never outweighs the evidence
 * (docs/music.md, "Ranking"). Can can edit the file; a change takes effect at the next edition.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const TASTE_WEIGHT_MAX = 0.2;

const GenreTasteSchema = z
  .object({
    /** Artists whose new releases are watched and who rank higher. */
    favouriteArtists: z.array(text(80)).max(100),
    /** What a good pick sounds like, in Can's words where he gave them. */
    likes: z.array(text(160)).max(20),
    /** What to leave out even when it charts. */
    avoid: z.array(text(160)).max(20),
  })
  .strict();

export const TasteSchema = z
  .object({
    /** Share of the ranking score that taste may move, 0 to 0.2. */
    weight: z.number().min(0).max(TASTE_WEIGHT_MAX),
    genres: z.object(
      Object.fromEntries(GENRES.map((genre) => [genre, GenreTasteSchema])) as Record<
        Genre,
        typeof GenreTasteSchema
      >,
    ),
  })
  .strict();
export type Taste = z.infer<typeof TasteSchema>;

export function parseTaste(input: unknown): Taste {
  return TasteSchema.parse(input);
}
