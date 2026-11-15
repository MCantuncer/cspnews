import { SOURCES } from '@cspnews/config';
import { describe, expect, it } from 'vitest';

import { hotSources } from './hot-sources.js';

describe('hotSources', () => {
  const hot = hotSources(SOURCES);

  it('reads only reliable Turkish and world news outlets', () => {
    expect(hot.length).toBeGreaterThan(10);
    for (const source of hot) {
      expect(['wire', 'established']).toContain(source.tier);
      expect(source.sections.some((s) => s === 'turkey' || s === 'world')).toBe(true);
    }
  });

  it('keeps the count small enough for a quick run', () => {
    expect(hot.length).toBeLessThanOrEqual(40);
    expect(new Set(hot.map((s) => s.id)).size).toBe(hot.length);
  });
});
