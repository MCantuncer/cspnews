import { defineSources, type Article } from '@cspnews/core';
import { groupStories } from '@cspnews/grouping';
import { describe, expect, it } from 'vitest';

import { assessHotNews, isSearchPageTitle, isUrgentTitle, magnitudeIn } from './heat.js';

const SOURCES = new Map(
  defineSources(
    (
      [
        ['aa-tr', 'anadolu', 'state-wire', 'wire', 'rss'],
        ['ntv', 'dogus', 'mainstream', 'established', 'rss'],
        ['sozcu', 'sozcu', 'opposition', 'partisan', 'rss'],
        ['sabah', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['a-haber', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['teyit', 'teyit', 'specialist', 'established', 'fact-check'],
      ] as const
    ).map(([id, ownerGroup, camp, tier, kind]) => ({
      id,
      name: id,
      kind,
      url: `https://${id}.example/feed`,
      homepage: `https://${id}.example`,
      sections: ['turkey'],
      language: 'tr',
      ownerGroup,
      camp,
      tier,
    })),
  ).map((source) => [source.id, source]),
);

const NOW = new Date('2026-11-11T12:00:00Z');
let counter = 0;
function article(sourceId: string, minutesAgo: number, title: string, summary = ''): Article {
  counter += 1;
  return {
    id: `h${String(counter)}`,
    sourceId,
    url: `https://${sourceId}.example/${String(counter)}`,
    title,
    summary,
    publishedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
    language: 'tr',
    sections: ['turkey'],
  };
}

function assess(articles: Article[], alreadyAlerted?: ReadonlySet<string>) {
  return assessHotNews(groupStories(articles), SOURCES, {
    now: NOW,
    ...(alreadyAlerted ? { alreadyAlerted } : {}),
  });
}

const QUAKE = [
  article('aa-tr', 20, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'),
  article('ntv', 15, 'Malatya’da 5,8 büyüklüğünde deprem'),
  article('sozcu', 10, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
];

describe('assessHotNews', () => {
  it('promotes an urgent story several owners report within the hour', () => {
    const [quake] = assess(QUAKE);
    expect(quake).toMatchObject({
      heat: 13,
      components: { recentOwners: 3, owners: 3, urgent: true, wire: true },
      promoted: true,
      reason: 'promoted',
    });
  });

  it('keeps a scheduled, calm story for the bulletin', () => {
    const [rate] = assess([
      article('aa-tr', 40, 'Merkez Bankası politika faizini yüzde 35’te sabit tuttu'),
      article('ntv', 30, 'Merkez Bankası faizi yüzde 35’te sabit tuttu'),
    ]);
    expect(rate).toMatchObject({ heat: 7, promoted: false, reason: 'below-threshold' });
  });

  it('holds back an urgent story from a single owner (US-31)', () => {
    const [claim] = assess([
      article('sabah', 10, 'Son dakika: İstanbul’da patlama'),
      article('a-haber', 5, 'İstanbul’da patlama: son dakika gelişmesi'),
    ]);
    expect(claim).toMatchObject({ promoted: false, reason: 'single-source' });
  });

  it('holds back a story a fact-checker covers', () => {
    const [claim] = assess([
      ...QUAKE.map((a) => ({ ...a, id: `${a.id}-d` })),
      article('teyit', 5, 'Malatya’da 5,8 büyüklüğünde deprem iddiası'),
    ]);
    expect(claim).toMatchObject({ promoted: false, reason: 'disputed' });
  });

  it('never alerts the same story twice', () => {
    const first = assess(QUAKE)[0];
    const [again] = assess(QUAKE, new Set([first?.storyId ?? '']));
    expect(again).toMatchObject({ promoted: false, reason: 'already-alerted' });
  });

  it('does not treat news older than six hours as breaking', () => {
    const [old] = assess([
      article('aa-tr', 400, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'),
      article('ntv', 10, 'Malatya’da 5,8 büyüklüğünde deprem'),
      article('sozcu', 5, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
    ]);
    expect(old).toMatchObject({ promoted: false, reason: 'too-old' });
  });

  it('does not match urgent words inside other words', () => {
    // "Kesel" contains "sel" (flood), but not at the start of a word.
    const [calm] = assess([
      article('aa-tr', 20, 'Bakan Kesel yeni projeyi tanıttı'),
      article('ntv', 15, 'Bakan Kesel yeni projeyi tanıttı'),
    ]);
    expect(calm?.components.urgent).toBe(false);
  });

  it('keeps a story that was breaking for six hours after its reports slow down', () => {
    // Three outlets within twenty minutes, two hours ago: heat now is low, but it peaked.
    const [quake] = assess([
      article('aa-tr', 140, 'Son dakika: Malatya’da 5,8 büyüklüğünde deprem'),
      article('ntv', 130, 'Malatya’da 5,8 büyüklüğünde deprem'),
      article('sozcu', 120, 'Malatya 5,8 büyüklüğünde depremle sarsıldı'),
    ]);
    expect(quake?.heat).toBeLessThan(8);
    expect(quake).toMatchObject({ peakHeat: 13, promoted: true, reason: 'promoted' });
  });

  it('asks more of a story without an urgent headline', () => {
    const [meeting] = assess([
      article('aa-tr', 30, 'Parti meclisi yeni yönetimi belirledi'),
      article('ntv', 25, 'Parti meclisi yeni yönetimi belirledi'),
      article('sozcu', 20, 'Parti meclisi yeni yönetimi belirledi'),
    ]);
    expect(meeting).toMatchObject({ heat: 10, promoted: false, reason: 'below-threshold' });
  });

  it('never promotes the daily "deprem mi oldu?" pages, however many outlets have them', () => {
    const [pages] = assess([
      article('aa-tr', 50, 'Az önce deprem nerede oldu?'),
      article('ntv', 30, 'depremler! Deprem mi oldu? 24 Kasım 2026 nerede, ne zaman deprem oldu?'),
      article('sozcu', 20, 'Son dakika deprem: il il AFAD son depremler 24 Kasım 2026'),
      article('sabah', 10, 'Deprem mi oldu? AFAD ve Kandilli son depremler listesi'),
    ]);
    expect(pages).toMatchObject({ promoted: false, reason: 'search-page' });
  });

  it('leaves a quake below magnitude 4.5 that did no harm to the bulletins', () => {
    const [small] = assess([
      article('aa-tr', 20, 'Son dakika: Van Gölü’nde 4,3 büyüklüğünde deprem'),
      article(
        'ntv',
        15,
        'AFAD duyurdu: Van’da korkutan deprem',
        'Van Gevaş’ta 4.3 büyüklüğünde deprem.',
      ),
      article('sozcu', 10, 'Van 4,3 büyüklüğünde depremle sarsıldı'),
      article('sabah', 5, 'Van’da deprem paniği'),
    ]);
    expect(small).toMatchObject({ promoted: false, reason: 'minor-quake' });
  });

  it('promotes a small quake that did harm', () => {
    const [harm] = assess([
      article('aa-tr', 20, 'Son dakika: Malatya’da 4,2 büyüklüğünde deprem'),
      article('ntv', 15, 'Malatya’da 4,2 büyüklüğündeki depremde 3 kişi yaralandı'),
      article('sozcu', 10, 'Malatya depremi: 3 yaralı'),
    ]);
    expect(harm).toMatchObject({ promoted: true, reason: 'promoted' });
  });

  it('does not take a figure of speech for an urgent word', () => {
    // "Fırtına gibi esiyor": storms through the league.
    const [football] = assess([
      article('aa-tr', 30, 'Trabzonspor, Thomas Reis ile durdurulamıyor'),
      article('ntv', 20, 'Trabzonspor, Thomas Reis ile fırtına gibi esiyor!'),
      article('sozcu', 10, 'Trabzonspor, Thomas Reis ile son 5 sezonun en iyisi'),
    ]);
    expect(football).toMatchObject({ promoted: false, reason: 'below-threshold' });
    expect(football?.components.urgent).toBe(false);
  });
});

describe('isUrgentTitle', () => {
  it('matches word starts and whole words as listed', () => {
    expect(isUrgentTitle('Erzurum’da 5,6 büyüklüğünde deprem', 'tr')).toBe(true);
    expect(isUrgentTitle('Depremde 3 kişi yaralandı', 'tr')).toBe(true);
    expect(isUrgentTitle('Sel felaketi: köprü yıkıldı', 'tr')).toBe(true);
    expect(isUrgentTitle('Selahattin Demirtaş açıklama yaptı', 'tr')).toBe(false);
    expect(isUrgentTitle('Shophouse fire kills at least 11', 'en')).toBe(true);
    expect(isUrgentTitle('Deadline for the budget moves to Friday', 'en')).toBe(false);
  });

  it('ignores search pages that ask a question', () => {
    expect(isUrgentTitle('Erzurum’da deprem mi oldu?', 'tr')).toBe(false);
    expect(isUrgentTitle('Deprem mi oldu? 24 Kasım 2026 nerede deprem oldu', 'tr')).toBe(false);
    expect(isUrgentTitle('Son dakika deprem: il il AFAD son depremler 24 Kasım 2026', 'tr')).toBe(
      false,
    );
  });

  it('takes an earthquake headline as urgent only from magnitude 4.5, or with another word', () => {
    expect(isUrgentTitle('Erzurum’da 3,6 büyüklüğünde deprem', 'tr')).toBe(false);
    expect(isUrgentTitle('Malatya’da 5,8 büyüklüğünde deprem', 'tr')).toBe(true);
    expect(isUrgentTitle('Depremde 3 kişi yaralandı', 'tr')).toBe(true);
    expect(isUrgentTitle('Magnitude 6.1 earthquake strikes off Japan', 'en')).toBe(true);
    expect(isUrgentTitle('Small earthquake felt in Athens', 'en')).toBe(false);
  });
});

describe('isSearchPageTitle', () => {
  it('knows the pages outlets publish every day to answer searches', () => {
    expect(isSearchPageTitle('Az önce deprem nerede oldu?', 'tr')).toBe(true);
    expect(isSearchPageTitle('İzmir deprem Kandilli ve AFAD son depremler listesi', 'tr')).toBe(
      true,
    );
    expect(isSearchPageTitle('Galatasaray maçı hangi kanalda', 'tr')).toBe(true);
    expect(isSearchPageTitle('Malatya’da 5,8 büyüklüğünde deprem', 'tr')).toBe(false);
    expect(isSearchPageTitle('Kartal Belediyesi’ne operasyon: 10 gözaltı', 'tr')).toBe(false);
  });
});

describe('magnitudeIn', () => {
  it('reads a magnitude however outlets write it', () => {
    expect(magnitudeIn('Malatya’da 5,8 büyüklüğünde deprem')).toBe(5.8);
    expect(magnitudeIn('Van Gevaş’ta 4.3 büyüklüğünde bir deprem')).toBe(4.3);
    expect(magnitudeIn('M4.6 earthquake off Crete')).toBe(4.6);
    expect(magnitudeIn('A 6.2-magnitude quake hit the coast')).toBe(6.2);
    expect(magnitudeIn('Magnitude 7.1 earthquake strikes Japan')).toBe(7.1);
    expect(magnitudeIn('Deprem mi oldu? Son depremler listesi')).toBeUndefined();
  });
});
