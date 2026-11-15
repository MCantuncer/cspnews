import { defineSources, type Article } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { buildHotFeed, shortHeadline } from './monitor.js';

const SOURCES = new Map(
  defineSources(
    (
      [
        ['aa-tr', 'anadolu', 'state-wire', 'wire'],
        ['ntv', 'dogus', 'mainstream', 'established'],
        ['sozcu', 'sozcu', 'opposition', 'partisan'],
      ] as const
    ).map(([id, ownerGroup, camp, tier]) => ({
      id,
      name: id,
      kind: 'rss' as const,
      url: `https://${id}.example/feed`,
      homepage: `https://${id}.example`,
      sections: ['turkey' as const],
      language: 'tr' as const,
      ownerGroup,
      camp,
      tier,
    })),
  ).map((source) => [source.id, source]),
);

const NOW = new Date('2026-11-11T12:00:00Z');
const article = (sourceId: string, minutesAgo: number, title: string): Article => ({
  id: `${sourceId}${String(minutesAgo)}`,
  sourceId,
  url: `https://${sourceId}.example/${String(minutesAgo)}`,
  title,
  summary: '',
  publishedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
  language: 'tr',
  sections: ['turkey'],
});

describe('buildHotFeed', () => {
  it('publishes a promoted story with its outlets and its own timeline', () => {
    const feed = buildHotFeed({
      now: NOW,
      sources: SOURCES,
      articles: [
        article('aa-tr', 20, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'),
        article('ntv', 15, 'Malatya’da 5,8 büyüklüğünde deprem'),
        article('sozcu', 10, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
      ],
    });
    expect(feed.generatedAt).toBe('2026-11-11T12:00:00.000Z');
    expect(feed.stories).toHaveLength(1);
    const [story] = feed.stories;
    expect(story).toMatchObject({
      section: 'turkey',
      language: 'tr',
      shortTitle: 'Malatya’da 5,8 büyüklüğünde deprem',
      label: 'confirmed',
    });
    expect(story?.sources.map((s) => s.sourceId)).toEqual(['aa-tr', 'ntv', 'sozcu']);
    expect(story?.timeline[0]).toMatchObject({ kind: 'first-reported', sourceId: 'aa-tr' });
  });

  it('is empty when nothing is hot, and never publishes a single-outlet story', () => {
    expect(buildHotFeed({ now: NOW, sources: SOURCES, articles: [] }).stories).toEqual([]);
    const calm = buildHotFeed({
      now: NOW,
      sources: SOURCES,
      articles: [
        article('aa-tr', 40, 'Merkez Bankası politika faizini yüzde 35’te sabit tuttu'),
        article('ntv', 30, 'Merkez Bankası faizi yüzde 35’te sabit tuttu'),
      ],
    });
    expect(calm.stories).toEqual([]);
  });
});

describe('shortHeadline', () => {
  it('drops a breaking lead-in and keeps at most eight words and 60 characters', () => {
    expect(shortHeadline('SON DAKİKA | Merkez Bankası faizi yüzde 35’te sabit tuttu')).toBe(
      'Merkez Bankası faizi yüzde 35’te sabit tuttu',
    );
    expect(shortHeadline('Breaking: one two three four five six seven eight nine ten')).toBe(
      'one two three four five six seven eight',
    );
    expect(
      shortHeadline('Extraordinarily-long-compound-words '.repeat(4)).length,
    ).toBeLessThanOrEqual(60);
  });
});
