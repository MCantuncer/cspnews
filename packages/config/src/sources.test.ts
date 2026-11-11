import { SECTIONS } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { SOURCES } from './sources.js';

describe('source registry', () => {
  it('covers every section', () => {
    for (const section of SECTIONS) {
      expect(SOURCES.some((source) => source.sections.includes(section))).toBe(true);
    }
  });

  it('gives Turkish news at least two enabled sources from each political camp', () => {
    const turkish = SOURCES.filter(
      (source) => source.enabled && source.sections.includes('turkey'),
    );
    for (const camp of ['pro-government', 'opposition', 'mainstream', 'independent'] as const) {
      expect(turkish.filter((source) => source.camp === camp).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('only uses https', () => {
    expect(SOURCES.every((source) => source.url.startsWith('https://'))).toBe(true);
  });
});
