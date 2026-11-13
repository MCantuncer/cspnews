/**
 * The bulletin sections, in the order they appear (F-02, US-01).
 */
export const SECTIONS = ['turkey', 'tech', 'world'] as const;

export type Section = (typeof SECTIONS)[number];

/**
 * Desks outside the news sections: their sources feed the bulletin's light close (And finally)
 * and football Transfers, never a news section.
 */
export const DESKS = ['light', 'transfers'] as const;

export type Desk = (typeof DESKS)[number];
