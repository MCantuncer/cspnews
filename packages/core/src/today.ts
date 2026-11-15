import { z } from 'zod';

import type { Language } from './language.js';
import { LiveSchema, type Live } from './tonight.js';

/**
 * The Today line (docs/design/decisions/today-line.md): a few plain facts for the reader's day,
 * written into each bulletin by the Write run from a page it read: the lira against the dollar
 * and the euro, gold, the weather in Istanbul, and the day's match. They are not stories: no
 * body, no evidence mark, no timeline. Each says where it was read and when.
 */
export const TODAY_MAX = 5;
export const TODAY_KINDS = ['fx', 'gold', 'weather', 'match'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const bilingual = (max: number) => z.object({ en: text(max), tr: text(max) }).strict();

export const TodayItemSchema = z
  .object({
    kind: z.enum(TODAY_KINDS),
    /** What it is: "US dollar", "Gold, per gram", "Istanbul", "Türkiye – France". */
    label: bilingual(40),
    /** The figure as written for reading, the same in both languages: "34.21 ₺", "14°C", "22:45". */
    value: text(20),
    /** One short line of detail, when it helps: "Light rain", "UEFA Nations League". */
    note: bilingual(60).optional(),
    /** Who published it: "TCMB", "Open-Meteo", "UEFA". */
    source: text(40),
    /** When the figure was read. */
    asOf: z.iso.datetime({ offset: true }),
    /**
     * A match's live score address, filled by the rules when they find the fixture in a score
     * source (packages/scores), so the page can show the score while it is played.
     */
    live: LiveSchema.optional(),
  })
  .strict()
  .refine((item) => item.kind === 'match' || item.live === undefined, {
    message: 'Only a match has a live score',
    path: ['live'],
  });

export type TodayItem = z.infer<typeof TodayItemSchema>;

export interface LocalTodayItem {
  readonly kind: TodayItem['kind'];
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly source: string;
  readonly asOf: string;
  readonly live?: Live;
}

/** An item in the reader's language. */
export function todayIn(item: TodayItem, language: Language): LocalTodayItem {
  const { kind, value, source, asOf, live } = item;
  return {
    kind,
    label: item.label[language],
    value,
    ...(item.note && { note: item.note[language] }),
    source,
    asOf,
    ...(live && { live }),
  };
}
