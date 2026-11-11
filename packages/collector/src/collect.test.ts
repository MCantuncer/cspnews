import { defineSources } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { ATOM_FEED, HTML_PAGE, RSS_FEED } from './__fixtures__/feeds.js';
import { collect, type FetchText } from './collect.js';

const SOURCES = defineSources([
  {
    id: 'ornek',
    name: 'Örnek',
    kind: 'rss',
    url: 'https://example.com.tr/rss',
    homepage: 'https://example.com.tr',
    sections: ['turkey'],
    language: 'tr',
    ownerGroup: 'ornek',
    camp: 'mainstream',
    tier: 'established',
  },
  {
    id: 'ornek-mirror',
    name: 'Örnek mirror',
    kind: 'rss',
    url: 'https://mirror.example.com.tr/rss',
    homepage: 'https://mirror.example.com.tr',
    sections: ['turkey'],
    language: 'tr',
    ownerGroup: 'ornek',
    camp: 'mainstream',
    tier: 'established',
  },
  {
    id: 'tech',
    name: 'Example Tech',
    kind: 'rss',
    url: 'https://tech.example.com/atom',
    homepage: 'https://tech.example.com',
    sections: ['tech'],
    language: 'en',
    ownerGroup: 'tech',
    camp: 'specialist',
    tier: 'established',
  },
  {
    id: 'broken',
    name: 'Broken',
    kind: 'rss',
    url: 'https://broken.example.com/rss',
    homepage: 'https://broken.example.com',
    sections: ['world'],
    language: 'en',
    ownerGroup: 'broken',
    camp: 'international',
    tier: 'established',
  },
  {
    id: 'disabled',
    name: 'Disabled',
    kind: 'rss',
    url: 'https://disabled.example.com/rss',
    homepage: 'https://disabled.example.com',
    sections: ['world'],
    language: 'en',
    ownerGroup: 'disabled',
    camp: 'international',
    tier: 'established',
    enabled: false,
  },
  {
    id: 'gdelt',
    name: 'GDELT',
    kind: 'gdelt',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    homepage: 'https://api.gdeltproject.org',
    sections: ['world'],
    language: 'en',
    ownerGroup: 'gdelt',
    camp: 'international',
    tier: 'low',
  },
]);

const BODIES: Record<string, string> = {
  'https://example.com.tr/rss': RSS_FEED,
  'https://mirror.example.com.tr/rss': RSS_FEED,
  'https://tech.example.com/atom': ATOM_FEED,
  'https://broken.example.com/rss': HTML_PAGE,
};

const requested: string[] = [];
const fetchText: FetchText = (url) => {
  requested.push(url);
  const body = BODIES[url];
  return body === undefined ? Promise.reject(new Error('HTTP 404')) : Promise.resolve(body);
};

const NOW = new Date('2026-11-11T09:00:00Z');

describe('collect', () => {
  it('normalises articles from every working feed, newest first', async () => {
    const { articles } = await collect(SOURCES, { fetchText, now: NOW });
    expect(articles.map((a) => a.title)).toEqual([
      'Merkez Bankası faizi sabit tuttu',
      'Deprem: Kandilli 4,6 büyüklüğünde sarsıntı kaydetti',
      'New open model tops reasoning benchmark',
    ]);

    const [rate, quake] = articles;
    expect(rate).toMatchObject({
      sourceId: 'ornek',
      url: 'https://example.com.tr/ekonomi/faiz',
      summary: 'Para Politikası Kurulu politika faizini %35 seviyesinde sabit tuttu.',
      publishedAt: new Date('2026-11-11T08:00:00Z'),
      language: 'tr',
      sections: ['turkey'],
      imageUrl: 'https://cdn.example.com.tr/faiz.jpg',
    });
    expect(quake?.summary).toBe('Sarsıntı "hafif" olarak hissedildi – can kaybı yok.');
  });

  it('keeps one article per URL, credited to the first source', async () => {
    const { articles } = await collect(SOURCES, { fetchText, now: NOW });
    const rate = articles.filter((a) => a.url === 'https://example.com.tr/ekonomi/faiz');
    expect(rate).toHaveLength(1);
    expect(rate[0]?.sourceId).toBe('ornek');
  });

  it('reports a failing source without stopping the others', async () => {
    const { failures } = await collect(SOURCES, { fetchText, now: NOW });
    expect(failures).toEqual([{ sourceId: 'broken', reason: 'Not an RSS, RDF or Atom feed' }]);
  });

  it('skips disabled sources and non-feed sources', async () => {
    requested.length = 0;
    await collect(SOURCES, { fetchText, now: NOW });
    expect(requested).not.toContain('https://disabled.example.com/rss');
    expect(requested).not.toContain('https://api.gdeltproject.org/api/v2/doc/doc');
  });

  it('keeps only articles published since the given instant', async () => {
    const { articles } = await collect(SOURCES, {
      fetchText,
      now: NOW,
      since: new Date('2026-11-11T07:30:00Z'),
    });
    expect(articles.map((a) => a.title)).toEqual(['Merkez Bankası faizi sabit tuttu']);
  });

  it('clamps future dates to the collection time', async () => {
    const { articles } = await collect(SOURCES, {
      fetchText,
      now: new Date('2026-11-11T07:00:00Z'),
    });
    const rate = articles.find((a) => a.sourceId === 'ornek' && a.title.startsWith('Merkez'));
    expect(rate?.publishedAt).toEqual(new Date('2026-11-11T07:00:00Z'));
  });
});
