import { BULLETIN_SLOTS } from '@cspnews/core';

/**
 * The edition hour: each bulletin has its own colour, used flat for the top edge and the
 * current station on the day line (docs/design/system.md, "Colour").
 */
export type EditionHour = 'dawn' | 'noon' | 'dusk' | 'night';

type SlotId = (typeof BULLETIN_SLOTS)[number]['id'];

const HOUR_BY_SLOT: Record<SlotId, EditionHour> = {
  morning: 'dawn',
  midday: 'noon',
  evening: 'dusk',
  late: 'night',
};

function isSlotId(value: string): value is SlotId {
  return Object.hasOwn(HOUR_BY_SLOT, value);
}

/** The edition hour for a bulletin slot id; unknown slots fall back to the morning edition. */
export function editionHourFor(slotId: string): EditionHour {
  return isSlotId(slotId) ? HOUR_BY_SLOT[slotId] : 'dawn';
}
