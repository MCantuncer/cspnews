/**
 * The two languages CSPNews is read in (F-02, F-09). Every story is written in both, and the
 * reader sees the one their interface uses.
 */
export const LANGUAGES = ['en', 'tr'] as const;

export type Language = (typeof LANGUAGES)[number];
