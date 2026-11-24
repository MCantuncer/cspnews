import { defineSources, type Article } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { buildHotFeed, buildHotFeedWithPhotos, cleanSummary, shortHeadline } from './monitor.js';

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
/** A description with real news in it, as an outlet's feed gives it. */
const NEWS =
  'Malatya’nın Pütürge ilçesinde öğle saatlerinde meydana gelen deprem çevre illerden de hissedildi; ekipler bölgede inceleme yapıyor.';

const article = (sourceId: string, minutesAgo: number, title: string, summary = ''): Article => ({
  id: `${sourceId}${String(minutesAgo)}`,
  sourceId,
  url: `https://${sourceId}.example/${String(minutesAgo)}`,
  title,
  summary,
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
        article('aa-tr', 20, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem', NEWS),
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

  it('never publishes a story without a few lines of real news', () => {
    const headlinesOnly = buildHotFeed({
      now: NOW,
      sources: SOURCES,
      articles: [
        article('aa-tr', 20, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'),
        article('ntv', 15, 'Malatya’da 5,8 büyüklüğünde deprem'),
        article('sozcu', 10, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
      ],
    });
    expect(headlinesOnly.stories).toEqual([]);
  });

  it('never publishes the daily "deprem mi oldu?" pages (2026-11-24)', () => {
    const teaser =
      'Son depremler 24 Kasım 2026 Salı günü vatandaşlar tarafından yakından takip ediliyor. AFAD ve Kandilli Rasathanesi’nin deprem listelerinde Konya, Kütahya ve Manisa başta olmak üzere farklı bölgelerde meydana gelen sarsıntılar yer aldı. Peki, az önce deprem mi oldu?';
    const feed = buildHotFeed({
      now: NOW,
      sources: SOURCES,
      articles: [
        article('aa-tr', 50, 'Az önce deprem nerede oldu?', teaser),
        article(
          'ntv',
          30,
          'depremler! Deprem mi oldu? 24 Kasım 2026 nerede, ne zaman deprem oldu?',
        ),
        article(
          'sozcu',
          10,
          'Son dakika deprem: İstanbul, Ankara, İzmir ve il il AFAD son depremler 24 Kasım 2026',
        ),
      ],
    });
    expect(feed.stories).toEqual([]);
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

describe('richer hot stories', () => {
  const quake = (summary: string): Article[] => [
    { ...article('aa-tr', 20, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'), summary },
    {
      ...article('ntv', 15, 'Malatya’da 5,8 büyüklüğünde deprem', NEWS),
      imageUrl: 'https://ntv.example/photo.jpg',
    },
    article('sozcu', 10, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
  ];

  it('quotes the first outlet’s own description, under its name', () => {
    const text =
      'AFAD, Malatya’nın Pütürge ilçesinde 5,8 büyüklüğünde deprem meydana geldiğini duyurdu. Deprem çevre illerden de hissedildi.';
    const [story] = buildHotFeed({ now: NOW, sources: SOURCES, articles: quake(text) }).stories;
    expect(story?.summary).toEqual({ text, sourceId: 'aa-tr' });
  });

  it('skips a teaser and quotes the next outlet with real news', () => {
    const [story] = buildHotFeed({
      now: NOW,
      sources: SOURCES,
      articles: quake(
        'Malatya’da korkutan deprem! Deprem nerede oldu, kaç büyüklüğünde? İşte detaylar.',
      ),
    }).stories;
    expect(story?.summary).toEqual({ text: NEWS, sourceId: 'ntv' });
  });

  it('gives each outlet its own headline and time', () => {
    const [story] = buildHotFeed({ now: NOW, sources: SOURCES, articles: quake('') }).stories;
    expect(story?.sources[1]).toMatchObject({
      sourceId: 'ntv',
      title: 'Malatya’da 5,8 büyüklüğünde deprem',
      publishedAt: '2026-11-11T11:45:00.000Z',
    });
  });

  it('hands back the photo the picker chose, without naming it in the feed', () => {
    const { feed, photos } = buildHotFeedWithPhotos({
      now: NOW,
      sources: SOURCES,
      articles: quake(''),
      pickPhoto: (story) => {
        const member = story.articles.find(({ article: a }) => a.imageUrl);
        return member?.article.imageUrl
          ? {
              url: member.article.imageUrl,
              sourceId: member.article.sourceId,
              sourceName: member.article.sourceId,
              articleUrl: member.article.url,
            }
          : undefined;
      },
    });
    const [story] = feed.stories;
    expect(story?.image).toBeUndefined();
    expect(photos.get(story?.id ?? '')?.url).toBe('https://ntv.example/photo.jpg');
  });
});

describe('cleanSummary', () => {
  it('drops a repeated headline, a date stamp, the outlet name and WordPress lines', () => {
    expect(
      cleanSummary(
        'YENİ Parti kurultayı: 160 kişilik PM listesi 15.11.2026 Diken YENİ Parti 1’inci olağan kurultayında 160 kişilik parti meclisi listesi açıklandı. The post YENİ Parti kurultayı appeared first on Diken.',
        'YENİ Parti kurultayı: 160 kişilik PM listesi',
        'Diken',
      ),
    ).toBe('YENİ Parti 1’inci olağan kurultayında 160 kişilik parti meclisi listesi açıklandı.');
  });

  it('cuts a long description after whole sentences', () => {
    const sentence = 'Kurtarma ekipleri enkaz altındaki kişilere ulaşmak için çalışıyor. ';
    const text = cleanSummary(sentence.repeat(8), 'Başlık', 'NTV') ?? '';
    expect(text.length).toBeLessThanOrEqual(320);
    expect(text.endsWith('çalışıyor.')).toBe(true);
  });

  it('gives nothing for a description that is too short', () => {
    expect(cleanSummary('Detaylar geliyor.', 'Başlık', 'NTV')).toBeUndefined();
  });

  it('gives nothing for a teaser', () => {
    expect(
      cleanSummary(
        'Son depremler 24 Kasım 2026 Salı günü vatandaşlar tarafından yakından takip ediliyor. AFAD ve Kandilli listelerinde farklı bölgelerde sarsıntılar yer aldı.',
        'Az önce deprem nerede oldu?',
        'NTV',
      ),
    ).toBeUndefined();
  });
});
