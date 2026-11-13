import { DESKS, SECTIONS } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { SOURCES } from './sources.js';

describe('source registry', () => {
  it('covers every section', () => {
    for (const section of SECTIONS) {
      expect(SOURCES.some((source) => source.sections.includes(section))).toBe(true);
    }
  });

  it('feeds every desk from Turkish and English sources', () => {
    for (const desk of DESKS) {
      const feeding = SOURCES.filter((source) => source.enabled && source.desks?.includes(desk));
      expect(new Set(feeding.map((source) => source.language))).toEqual(new Set(['tr', 'en']));
    }
  });

  it('keeps desk sources out of the news sections', () => {
    for (const source of SOURCES.filter((s) => (s.desks?.length ?? 0) > 0)) {
      expect(source.sections, source.id).toEqual([]);
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
