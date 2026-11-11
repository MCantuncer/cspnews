/**
 * The bulletin sections, in the order they appear (F-02, US-01).
 */
export const SECTIONS = ['turkey', 'tech', 'world'] as const;

export type Section = (typeof SECTIONS)[number];
