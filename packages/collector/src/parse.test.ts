import { describe, expect, it } from 'vitest';

import { ATOM_FEED, HTML_PAGE, RDF_FEED, RSS_FEED } from './__fixtures__/feeds.js';
import { parseFeed } from './parse.js';

describe('parseFeed', () => {
  it('reads RSS 2.0 items with CDATA, media and enclosure images', () => {
    const [first, second] = parseFeed(RSS_FEED);
    expect(first).toMatchObject({
      title: 'Merkez Bankası faizi sabit tuttu',
      link: 'https://example.com.tr/ekonomi/faiz?utm_source=rss&utm_medium=feed#top',
      published: 'Wed, 11 Nov 2026 11:00:00 +0300',
      imageUrl: 'https://cdn.example.com.tr/faiz.jpg',
    });
    expect(first?.summary).toContain('<b>%35</b>');
    expect(second).toMatchObject({
      published: '2026-11-11T07:15:00Z',
      imageUrl: 'https://cdn.example.com.tr/deprem.jpg',
    });
  });

  it('reads Atom entries and prefers the alternate link', () => {
    const [entry] = parseFeed(ATOM_FEED);
    expect(entry).toMatchObject({
      link: 'https://tech.example.com/model',
      published: '2026-11-10T18:30:00Z',
      summary: 'A lab released weights for a model that leads several benchmarks.',
    });
    expect(entry?.title).toContain('<em>reasoning</em>');
  });

  it('reads RSS 1.0 (RDF) items', () => {
    expect(parseFeed(RDF_FEED)).toEqual([
      {
        title: 'Leaders agree on ceasefire talks',
        link: 'https://world.example.org/summit',
        summary: 'Talks start next week.',
        published: '2026-11-11T06:00:00Z',
      },
    ]);
  });

  it('rejects documents that are not feeds', () => {
    expect(() => parseFeed(HTML_PAGE)).toThrow(/Not an RSS, RDF or Atom feed/);
  });
});
