import { BULLETIN_SLOTS } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { editionHourFor } from './edition.js';

describe('editionHourFor', () => {
  it('gives each bulletin slot its own hour colour', () => {
    expect(BULLETIN_SLOTS.map((slot) => editionHourFor(slot.id))).toEqual([
      'dawn',
      'noon',
      'dusk',
      'night',
    ]);
  });

  it('falls back to the morning edition for an unknown slot', () => {
    expect(editionHourFor('brunch')).toBe('dawn');
  });
});
