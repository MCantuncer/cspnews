import { defineSources, type Article } from '@cspnews/core';
import { groupStories } from '@cspnews/grouping';
import { describe, expect, it } from 'vitest';

import { assessHotNews, isUrgentTitle } from './heat.js';

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
function article(sourceId: string, minutesAgo: number, title: string): Article {
  counter += 1;
  return {
    id: `h${String(counter)}`,
    sourceId,
    url: `https://${sourceId}.example/${String(counter)}`,
    title,
    summary: '',
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
});

describe('isUrgentTitle', () => {
  it('matches word starts and whole words as listed', () => {
    expect(isUrgentTitle('Erzurum’da 3,6 büyüklüğünde deprem', 'tr')).toBe(true);
    expect(isUrgentTitle('Depremde 3 kişi yaralandı', 'tr')).toBe(true);
    expect(isUrgentTitle('Sel felaketi: köprü yıkıldı', 'tr')).toBe(true);
    expect(isUrgentTitle('Selahattin Demirtaş açıklama yaptı', 'tr')).toBe(false);
    expect(isUrgentTitle('Shophouse fire kills at least 11', 'en')).toBe(true);
    expect(isUrgentTitle('Deadline for the budget moves to Friday', 'en')).toBe(false);
  });

  it('ignores search pages that ask a question', () => {
    expect(isUrgentTitle('Erzurum’da deprem mi oldu?', 'tr')).toBe(false);
  });
});
