import { describe, expect, it } from 'vitest';

import { SECTIONS } from './sections.js';

describe('sections', () => {
  it('keeps the bulletin order: Turkey, Tech, World', () => {
    expect(SECTIONS).toEqual(['turkey', 'tech', 'world']);
  });
});
