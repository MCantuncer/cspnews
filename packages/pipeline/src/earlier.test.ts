import { describe, expect, it } from 'vitest';

import { continuesHint, normalizeUrl, type EarlierStory } from './earlier.js';

const article = (url: string) => ({ articles: [{ url }] }) as never;

const story = (
  id: string,
  publishAt: string,
  urls: string[],
  continues?: string,
): EarlierStory => ({
  id,
  bulletin: `2026-11-14-${id}`,
  publishAt,
  title: `Story ${id}`,
  urls: new Set(urls.map(normalizeUrl)),
  ...(continues === undefined ? {} : { continues }),
});

describe('normalizeUrl', () => {
  it('ignores the host case, a trailing slash, a fragment and tracking parameters', () => {
    expect(normalizeUrl('https://WWW.Example.com/a/b/?utm_source=x#top')).toBe(
      'www.example.com/a/b',
    );
    expect(normalizeUrl('https://example.com/a?id=2')).toBe('example.com/a?id=2');
  });
});

describe('continuesHint', () => {
  const first = story('one', '2026-11-14T07:30:00+03:00', [
    'https://a.example/x',
    'https://b.example/y',
  ]);

  it('names the earlier story a candidate shares an article with', () => {
    const hint = continuesHint(
      { articles: [{ url: 'https://a.example/x/' }, { url: 'https://c.example/z' }] } as never,
      [first],
    );
    expect(hint).toMatchObject({ storyId: 'one', sharedArticles: 1, title: 'Story one' });
  });

  it('says nothing when no article is shared', () => {
    expect(continuesHint(article('https://c.example/z'), [first])).toBeUndefined();
  });

  it('points at the newest report of the story, never at one that was already continued', () => {
    const second = story('two', '2026-11-14T12:30:00+03:00', ['https://a.example/x'], 'one');
    const hint = continuesHint(article('https://b.example/y'), [first, second]);
    expect(hint?.storyId).toBe('two');
  });

  it('prefers the story that shares more articles, then the newer one', () => {
    const other = story('other', '2026-11-14T09:30:00+03:00', ['https://a.example/x']);
    const hint = continuesHint(
      { articles: [{ url: 'https://a.example/x' }, { url: 'https://b.example/y' }] } as never,
      [other, first],
    );
    expect(hint?.storyId).toBe('one');
  });
});
