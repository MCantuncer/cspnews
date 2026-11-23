import { readFileSync } from 'node:fs';

import { parseHotFeed, type HotFeed, type HotStory } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import {
  dismiss,
  hotPageStory,
  hotPhotoUrl,
  hotStoryIn,
  isHotFeed,
  otherHotStories,
  pickHotStory,
  readDismissed,
  safeUrl,
} from './hot.js';

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

describe('hotPageStory', () => {
  const a = story('a', '2026-11-11T18:00:00+03:00');
  const b = story('b', '2026-11-11T18:04:00+03:00');

  it('shows the story the page was opened for', () => {
    expect(hotPageStory(feed([a, b]), 'a')).toEqual({ state: 'story', story: a });
  });

  it('says a story has gone when it left the feed', () => {
    expect(hotPageStory(feed([a]), 'b')).toEqual({ state: 'gone' });
  });

  it('shows the newest story when no story is named', () => {
    expect(hotPageStory(feed([a, b]), null)).toEqual({ state: 'story', story: b });
  });

  it('is quiet when nothing is breaking', () => {
    expect(hotPageStory(feed([]), null)).toEqual({ state: 'quiet' });
  });
});

describe('Hot News page extras', () => {
  it('lists the other stories, newest first', () => {
    const a = story('a', '2026-11-11T18:00:00+03:00');
    const b = story('b', '2026-11-11T18:04:00+03:00');
    const c = story('c', '2026-11-11T18:02:00+03:00');
    expect(otherHotStories(feed([a, b, c]), 'b').map((s) => s.id)).toEqual(['c', 'a']);
  });

  it('finds a story photo next to the feed, and only a plain photo name', () => {
    const url = 'https://raw.githubusercontent.com/o/r/hot-feed/hot.json';
    expect(hotPhotoUrl('0a7b31be.webp', url)).toBe(
      'https://raw.githubusercontent.com/o/r/hot-feed/media/0a7b31be.webp',
    );
    expect(hotPhotoUrl('../evil.jpg', url)).toBeUndefined();
    expect(hotPhotoUrl('x.svg', url)).toBeUndefined();
  });
});

describe('hotStoryIn', () => {
  const english = {
    id: 'libya-ships',
    section: 'world',
    language: 'en',
    shortTitle: 'Ukraine behind ship strikes',
    title: 'Ukraine behind ship strikes, Zelenskyy says',
    label: 'confirmed',
    firstSeenAt: '2026-11-23T10:00:00Z',
    updatedAt: '2026-11-23T10:30:00Z',
    sources: [
      {
        sourceId: 'bbc',
        url: 'https://example.com/a',
        confirms: true,
        title: 'Ships hit',
        language: 'en',
        translatedTitle: 'Gemiler vuruldu',
      },
      {
        sourceId: 'aa',
        url: 'https://example.com/b',
        confirms: true,
        title: 'Gemiler vuruldu',
        language: 'tr',
        translatedTitle: 'Ships were hit',
      },
    ],
    timeline: [],
    summary: { text: 'The attacks came after a drone hit.', sourceId: 'bbc' },
    translation: {
      language: 'tr',
      shortTitle: 'Zelenskiy: Saldırıları Ukrayna yaptı',
      title: 'Zelenskiy: Gemi saldırılarını Ukrayna yaptı',
      summary: 'Saldırılar bir İHA saldırısının ardından geldi.',
    },
  } as HotStory;

  it('gives a Turkish reader the translation, marked as one', () => {
    const local = hotStoryIn(english, 'tr');
    expect(local.title).toBe('Zelenskiy: Gemi saldırılarını Ukrayna yaptı');
    expect(local.summary?.text).toBe('Saldırılar bir İHA saldırısının ardından geldi.');
    expect(local).toMatchObject({
      textLanguage: 'tr',
      summaryLanguage: 'tr',
      machineTranslated: true,
    });
    expect(local.sources.map((s) => [s.title, s.machineTranslated])).toEqual([
      ['Gemiler vuruldu', true],
      ['Gemiler vuruldu', false],
    ]);
  });

  it('keeps the outlets’ own words for their language, or when asked', () => {
    expect(hotStoryIn(english, 'en')).toMatchObject({
      title: english.title,
      machineTranslated: false,
    });
    const original = hotStoryIn(english, 'tr', { original: true });
    expect(original).toMatchObject({
      title: english.title,
      textLanguage: 'en',
      machineTranslated: false,
    });
    expect(original.sources[0]?.title).toBe('Ships hit');
  });

  it('falls back to the original without a translation', () => {
    const untranslated = { ...english, translation: undefined };
    expect(hotStoryIn(untranslated, 'tr')).toMatchObject({
      title: english.title,
      textLanguage: 'en',
    });
  });
});
