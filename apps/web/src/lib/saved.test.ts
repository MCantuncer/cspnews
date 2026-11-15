import { describe, expect, it } from 'vitest';

import { isStorySaved, savedStories, saveStory, unsaveStory, type SavedStory } from './saved';

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set('cspnews:saved', initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const story = (id: string): SavedStory => ({
  id,
  section: 'turkey',
  date: '2026-11-15',
  savedAt: '2026-11-15T10:00:00Z',
  en: { title: `English ${id}`, href: `/2026-11-15/midday/${id}` },
  tr: { title: `Türkçe ${id}`, href: `/tr/2026-11-15/midday/${id}` },
});

describe('saved stories', () => {
  it('keeps the newest first, and a story only once', () => {
    const storage = memory();
    saveStory(storage, story('a'));
    saveStory(storage, story('b'));
    saveStory(storage, story('a'));
    expect(savedStories(storage).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('removes a story', () => {
    const storage = memory();
    saveStory(storage, story('a'));
    expect(isStorySaved(storage, 'a')).toBe(true);
    unsaveStory(storage, 'a');
    expect(isStorySaved(storage, 'a')).toBe(false);
  });

  it('ignores damaged storage and works without any', () => {
    expect(savedStories(memory('not json'))).toEqual([]);
    expect(savedStories(memory('[{"id":1}]'))).toEqual([]);
    expect(savedStories(undefined)).toEqual([]);
    expect(() => {
      saveStory(undefined, story('a'));
    }).not.toThrow();
  });
});
