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
  { ...source('spor', 'spor', 'international'), sections: [], desks: ['transfers' as const] },
  { ...source('magazin', 'magazin', 'international'), sections: [], desks: ['light' as const] },
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

FEEDS['https://spor.example/rss'] = rss([
  [
    'Fenerbahçe, Napoli ile orta saha için bonservis konusunda anlaştı',
    'https://spor.example/transfer',
    '2026-11-11T07:00:00Z',
  ],
]);
FEEDS['https://magazin.example/rss'] = rss([
  [
    'Kadıköy vapurunun kedisine onursal mürettebat kartı verildi',
    'https://magazin.example/kedi',
    '2026-11-11T07:30:00Z',
  ],
]);

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

  it('keeps desk-only sources out of the news sections', () => {
    const news = Object.values(file.sections).flat();
    expect(news.flatMap((c) => c.sources.map((s) => s.id))).not.toContain('spor');
    expect(news.flatMap((c) => c.sources.map((s) => s.id))).not.toContain('magazin');
  });

  it('collects candidates for each desk from the sources that feed it', () => {
    expect(file.desks.transfers.map((c) => c.articles[0]?.url)).toEqual([
      'https://spor.example/transfer',
    ]);
    expect(file.desks.light.map((c) => c.articles[0]?.url)).toEqual([
      'https://magazin.example/kedi',
    ]);
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

describe('prepareBulletin, Spotlight candidates', async () => {
  const feeds: Record<string, string> = {
    'https://aa.example/rss': rss([
      [
        'Microsoft 365 hizmetlerinde küresel kesinti',
        'https://aa.example/kesinti',
        '2026-11-11T08:00:00Z',
      ],
    ]),
    'https://magazin.example/rss': rss([
      [
        'Microsoft 365 hizmetlerinde küresel kesinti yaşanıyor',
        'https://magazin.example/kesinti',
        '2026-11-11T08:10:00Z',
      ],
      [
        'Ünlü oyuncu ile futbolcu aşk iddialarını doğruladı',
        'https://magazin.example/ask',
        '2026-11-11T07:00:00Z',
      ],
      [
        'Teknik direktörün kolundaki saat servet değerinde',
        'https://magazin.example/saat',
        '2026-11-11T07:20:00Z',
      ],
      [
        'Ünlü şarkıcı trafik kazasında yaralandı',
        'https://magazin.example/kaza',
        '2026-11-11T06:40:00Z',
      ],
      [
        'Comedian investigated by police over allegations',
        'https://magazin.example/police',
        '2026-11-11T06:20:00Z',
      ],
    ]),
  };
  const file = await prepareBulletin({
    sources: SOURCES,
    bulletin: MIDDAY,
    fetchText: (url) => {
      const body = feeds[url];
      return body ? Promise.resolve(body) : Promise.reject(new Error('HTTP 503'));
    },
    now: new Date('2026-11-11T09:00:00Z'),
  });
  const light = file.desks.light.map((c) => c.articles[0]?.url);

  it('leaves out stories the news outlets also carry', () => {
    expect(file.sections.turkey.length).toBeGreaterThan(0);
    expect(light).not.toContain('https://magazin.example/kesinti');
  });

  it('leaves out accidents, crime and other heavy topics', () => {
    expect(light).not.toContain('https://magazin.example/kaza');
    expect(light).not.toContain('https://magazin.example/police');
  });

  it('keeps the magazine stories', () => {
    expect(light.sort()).toEqual(['https://magazin.example/ask', 'https://magazin.example/saat']);
  });
});

describe('bulletinKey', () => {
  it('uses the Istanbul date', () => {
    const late = bulletinsOn({ year: 2026, month: 11, day: 11 }).find((b) => b.slot.id === 'late');
    expect(late && bulletinKey(late)).toBe('2026-11-11-late');
    expect(bulletinKey(MIDDAY)).toBe('2026-11-11-midday');
  });
});
