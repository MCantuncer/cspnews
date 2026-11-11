import { bulletinsOn, defineSources } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { bulletinKey, prepareBulletin } from './prepare.js';

function source(
  id: string,
  ownerGroup: string,
  camp: 'state-wire' | 'opposition' | 'international',
) {
  return {
    id,
    name: id.toUpperCase(),
    kind: 'rss' as const,
    url: `https://${id}.example/rss`,
    homepage: `https://${id}.example`,
    sections: ['turkey' as const],
    language: 'tr',
    ownerGroup,
    camp,
    tier: camp === 'state-wire' ? ('wire' as const) : ('established' as const),
  };
}

const SOURCES = defineSources([
  source('aa', 'anadolu', 'state-wire'),
  source('cumhuriyet', 'cumhuriyet', 'opposition'),
  source('bbc', 'bbc', 'international'),
  source('down', 'down', 'international'),
]);

function rss(items: readonly [title: string, link: string, date: string][]): string {
  const body = items
    .map(
      ([title, link, date]) =>
        `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`,
    )
    .join('');
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${body}</channel></rss>`;
}

const FEEDS: Record<string, string> = {
  'https://aa.example/rss': rss([
    [
      'Merkez Bankası politika faizini yüzde 35’te sabit tuttu',
      'https://aa.example/faiz',
      '2026-11-11T08:00:00Z',
    ],
    ['Malatya’da 4,6 büyüklüğünde deprem', 'https://aa.example/deprem', '2026-11-11T06:00:00Z'],
    ['Dün akşamki maçın özeti', 'https://aa.example/eski', '2026-11-10T10:00:00Z'],
  ]),
  'https://cumhuriyet.example/rss': rss([
    [
      'Merkez Bankası faizi yüzde 35’te sabit bıraktı',
      'https://cumhuriyet.example/faiz',
      '2026-11-11T08:20:00Z',
    ],
  ]),
  'https://bbc.example/rss': rss([
    [
      'Merkez Bankası faiz kararı: yüzde 35 sabit',
      'https://bbc.example/faiz',
      '2026-11-11T08:40:00Z',
    ],
  ]),
};

const MIDDAY = bulletinsOn({ year: 2026, month: 11, day: 11 }).find((b) => b.slot.id === 'midday');
if (!MIDDAY) {
  throw new Error('Midday bulletin missing from the schedule');
}

describe('prepareBulletin', async () => {
  const file = await prepareBulletin({
    sources: SOURCES,
    bulletin: MIDDAY,
    fetchText: (url) => {
      const body = FEEDS[url];
      return body ? Promise.resolve(body) : Promise.reject(new Error('HTTP 503'));
    },
    now: new Date('2026-11-11T09:00:00Z'),
  });

  it('describes the bulletin and the window it read', () => {
    expect(file.bulletin).toEqual({ slot: 'midday', publishAt: '2026-11-11T09:30:00.000Z' });
    expect(file.window).toEqual({
      since: '2026-11-10T19:00:00.000Z',
      until: '2026-11-11T09:00:00.000Z',
    });
  });

  it('ranks the confirmed multi-source story first', () => {
    const [top, second] = file.sections.turkey;
    expect(top?.label).toBe('confirmed');
    expect(top?.sources.map((s) => s.id)).toEqual(['aa', 'cumhuriyet', 'bbc']);
    expect(top?.sources.every((s) => s.confirms)).toBe(true);
    expect(second?.label).toBe('single-source');
    expect(file.sections.turkey).toHaveLength(2);
    expect(file.sections.tech).toEqual([]);
  });

  it('includes the story timeline', () => {
    const [top] = file.sections.turkey;
    expect(top?.timeline.map((event) => event.kind)).toEqual([
      'first-reported',
      'outlet-joined',
      'label-changed',
      'outlet-joined',
    ]);
  });

  it('keeps articles outside the window out', () => {
    const titles = file.sections.turkey.flatMap((c) => c.articles.map((a) => a.title));
    expect(titles).not.toContain('Dün akşamki maçın özeti');
  });

  it('reports feeds that failed', () => {
    expect(file.failures).toEqual([{ sourceId: 'down', reason: 'HTTP 503' }]);
  });

  it('serialises to plain JSON without losing anything', () => {
    expect(JSON.parse(JSON.stringify(file))).toEqual(file);
  });
});

describe('bulletinKey', () => {
  it('uses the Istanbul date', () => {
    const late = bulletinsOn({ year: 2026, month: 11, day: 11 }).find((b) => b.slot.id === 'late');
    expect(late && bulletinKey(late)).toBe('2026-11-11-late');
    expect(bulletinKey(MIDDAY)).toBe('2026-11-11-midday');
  });
});
