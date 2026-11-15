import { bulletinsOn, definePeople, defineSources } from '@cspnews/core';
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
  { ...source('kelebek', 'kelebek', 'international'), sections: [], desks: ['light' as const] },
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

FEEDS['https://kelebek.example/rss'] = rss([]);

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
      // A magazine story that one news owner's general feed also ran.
      [
        'Ünlü oyuncu ile futbolcu aşk iddialarını doğruladı',
        'https://aa.example/ask',
        '2026-11-11T07:05:00Z',
      ],
    ]),
    'https://cumhuriyet.example/rss': rss([
      [
        'Microsoft 365 hizmetlerinde küresel kesinti sürüyor',
        'https://cumhuriyet.example/kesinti',
        '2026-11-11T08:05:00Z',
      ],
    ]),
    'https://bbc.example/rss': rss([
      [
        'Microsoft 365 hizmetlerinde küresel kesinti: hizmetler durdu',
        'https://bbc.example/kesinti',
        '2026-11-11T08:15:00Z',
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
      [
        'Ünlü oyuncunun kızı apar topar hastaneye kaldırıldı',
        'https://magazin.example/hastane',
        '2026-11-11T06:10:00Z',
      ],
    ]),
    'https://kelebek.example/rss': rss(
      [
        'Kuzey Ege’nin saklı tadı: fasulye',
        'Kışa hazır eller için öneriler',
        'Bir kitap, bir kahve, bir pazar',
        'Şehrin en sakin kafeleri',
        'Sonbaharda gezilecek beş köy',
        'Evde ekmek yapmanın püf noktaları',
      ].map((title, index) => [
        title,
        `https://kelebek.example/${String(index)}`,
        `2026-11-11T08:${String(30 + index)}:00Z`,
      ]),
    ),
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

  const lightUrls = file.desks.light.flatMap((c) => c.articles.map((a) => a.url));

  it('leaves out stories that three or more news owners carry', () => {
    expect(file.sections.turkey.length).toBeGreaterThan(0);
    expect(lightUrls).not.toContain('https://magazin.example/kesinti');
  });

  it('keeps a magazine story that one news feed also ran', () => {
    expect(lightUrls).toContain('https://magazin.example/ask');
    expect(lightUrls).toContain('https://aa.example/ask');
  });

  it('leaves out accidents, crime, illness and other heavy topics', () => {
    expect(light).not.toContain('https://magazin.example/kaza');
    expect(light).not.toContain('https://magazin.example/police');
    expect(light).not.toContain('https://magazin.example/hastane');
  });

  it('keeps the magazine stories', () => {
    expect(lightUrls.filter((url) => url.startsWith('https://magazin.')).sort()).toEqual([
      'https://magazin.example/ask',
      'https://magazin.example/saat',
    ]);
  });

  it('takes at most four stories from one busy outlet', () => {
    expect(light.filter((url) => url?.startsWith('https://kelebek.'))).toHaveLength(4);
  });
});

describe('bulletinKey', () => {
  it('uses the Istanbul date', () => {
    const late = bulletinsOn({ year: 2026, month: 11, day: 11 }).find((b) => b.slot.id === 'late');
    expect(late && bulletinKey(late)).toBe('2026-11-11-late');
    expect(bulletinKey(MIDDAY)).toBe('2026-11-11-midday');
  });
});

describe('prepareBulletin, Turks abroad candidates', async () => {
  const people = definePeople([
    {
      id: 'alperen-sengun',
      name: 'Alperen Şengün',
      aliases: ['Alperen Sengun', 'Şengün'],
      kind: 'basketball',
    },
  ]);
  const sources = defineSources([
    { ...source('nba', 'nba', 'international'), sections: [], desks: ['abroad' as const] },
    { ...source('haber', 'haber', 'opposition'), sections: ['turkey' as const] },
  ]);
  const feeds: Record<string, string> = {
    'https://nba.example/rss': rss([
      [
        'Sengun scores 28 as Rockets beat Lakers',
        'https://nba.example/rockets',
        '2026-11-11T05:00:00Z',
      ],
      ['Celtics win in overtime', 'https://nba.example/celtics', '2026-11-11T04:00:00Z'],
    ]),
    'https://haber.example/rss': rss([
      ['ŞENGÜN’DEN 28 SAYI', 'https://haber.example/sengun', '2026-11-11T06:00:00Z'],
      ['Belediye meclisi toplandı', 'https://haber.example/meclis', '2026-11-11T06:30:00Z'],
      [
        'Türk bilim insanına Avrupa’dan genç araştırmacı ödülü',
        'https://haber.example/odul',
        '2026-11-11T07:00:00Z',
      ],
    ]),
  };
  const file = await prepareBulletin({
    sources,
    bulletin: MIDDAY,
    people,
    phrases: ['Türk bilim insan'],
    fetchText: (url) => Promise.resolve(feeds[url] ?? rss([])),
    now: new Date('2026-11-11T09:00:00Z'),
  });
  const urls = file.desks.abroad.flatMap((c) => c.articles.map((a) => a.url));

  it('takes only stories that name someone it watches, from any source', () => {
    expect(urls).toContain('https://nba.example/rockets');
    expect(urls).toContain('https://haber.example/sengun');
    expect(urls).not.toContain('https://nba.example/celtics');
    expect(urls).not.toContain('https://haber.example/meclis');
  });

  it('also takes stories with a phrase that points at a Turk abroad', () => {
    expect(urls).toContain('https://haber.example/odul');
  });

  it('says who each candidate names', () => {
    const sengun = file.desks.abroad.filter((c) =>
      c.articles.some((a) => a.url.includes('sengun')),
    );
    expect(sengun.every((c) => c.people?.includes('alperen-sengun'))).toBe(true);
  });
});
