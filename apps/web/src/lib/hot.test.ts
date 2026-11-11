import { readFileSync } from 'node:fs';

import { parseHotFeed, type HotFeed, type HotStory } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { dismiss, isHotFeed, pickHotStory, readDismissed, safeUrl } from './hot.js';

const story = (id: string, updatedAt: string) => ({ id, updatedAt }) as HotStory;
const feed = (stories: HotStory[]) => ({ version: 1, generatedAt: '', stories }) as HotFeed;

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

describe('Hot News line', () => {
  const a = story('a', '2026-11-11T18:00:00+03:00');
  const b = story('b', '2026-11-11T18:04:00+03:00');

  it('shows the newest story', () => {
    expect(pickHotStory(feed([a, b]), {})?.id).toBe('b');
  });

  it('keeps a dismissed story hidden until it is updated', () => {
    const storage = memory();
    dismiss(storage, b, feed([a, b]));
    expect(pickHotStory(feed([a, b]), readDismissed(storage))?.id).toBe('a');
    const updated = story('b', '2026-11-11T18:10:00+03:00');
    expect(pickHotStory(feed([a, updated]), readDismissed(storage))?.id).toBe('b');
  });

  it('forgets dismissals of stories that left the feed', () => {
    const storage = memory();
    dismiss(storage, a, feed([a]));
    dismiss(storage, b, feed([b]));
    expect(Object.keys(readDismissed(storage))).toEqual(['b']);
  });

  it('ignores broken storage and follows only https links', () => {
    expect(readDismissed({ getItem: () => '[1,2]' })).toEqual({});
    expect(readDismissed(undefined)).toEqual({});
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
  });
});

describe('isHotFeed', () => {
  const sample: unknown = JSON.parse(
    readFileSync(new URL('../../fixtures/bulletins/hot.json', import.meta.url), 'utf8'),
  );

  it('accepts the sample feed, which the full schema also accepts', () => {
    expect(() => parseHotFeed(sample)).not.toThrow();
    expect(isHotFeed(sample)).toBe(true);
  });

  it('rejects feeds the page could not show', () => {
    expect(isHotFeed(null)).toBe(false);
    expect(isHotFeed({ version: 2, stories: [] })).toBe(false);
    const feed = parseHotFeed(sample);
    const [story] = feed.stories;
    expect(isHotFeed({ ...feed, stories: [{ ...story, label: 'disputed' }] })).toBe(false);
    expect(
      isHotFeed({ ...feed, stories: [{ ...story, sources: story?.sources.slice(0, 1) }] }),
    ).toBe(false);
  });
});
