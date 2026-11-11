import { describe, expect, it } from 'vitest';

import { parseHotFeed } from './hot.js';

const story = {
  id: 'crete-quake',
  section: 'world',
  language: 'en',
  shortTitle: 'Crete quake 6.1',
  title: 'Strong earthquake reported off the coast of Crete',
  label: 'reported',
  firstSeenAt: '2026-11-11T17:52:00+03:00',
  updatedAt: '2026-11-11T18:04:00+03:00',
  sources: [
    { sourceId: 'bbc-world', url: 'https://example.com/a', confirms: true },
    { sourceId: 'al-jazeera', url: 'https://example.com/b', confirms: true },
  ],
  timeline: [{ kind: 'first-reported', at: '2026-11-11T17:52:00+03:00', sourceId: 'bbc-world' }],
};

describe('parseHotFeed', () => {
  it('accepts a feed of confirmed or reported stories', () => {
    const feed = parseHotFeed({ version: 1, generatedAt: story.updatedAt, stories: [story] });
    expect(feed.stories[0]?.shortTitle).toBe('Crete quake 6.1');
  });

  it('holds back single-source and disputed stories', () => {
    for (const label of ['single-source', 'disputed']) {
      expect(() =>
        parseHotFeed({ version: 1, generatedAt: story.updatedAt, stories: [{ ...story, label }] }),
      ).toThrow();
    }
  });

  it('needs at least two outlets', () => {
    expect(() =>
      parseHotFeed({
        version: 1,
        generatedAt: story.updatedAt,
        stories: [{ ...story, sources: story.sources.slice(0, 1) }],
      }),
    ).toThrow();
  });
});
