import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);

/** The outlet photo, always credited. */
export const StoryImageSchema = z
  .object({
    url: z.url(),
    sourceId: text(64),
    sourceName: text(80),
    articleUrl: z.url(),
  })
  .strict();
