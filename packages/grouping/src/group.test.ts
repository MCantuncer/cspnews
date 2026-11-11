import type { Article } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { groupStories, reportingSourceIds } from './group.js';

let counter = 0;
function article(
  sourceId: string,
  time: string,
  title: string,
  summary = '',
  language = 'tr',
): Article {
  counter += 1;
  return {
    id: `a${String(counter).padStart(2, '0')}`,
    sourceId,
    url: `https://${sourceId}.example/${String(counter)}`,
    title,
    summary,
    publishedAt: new Date(`2026-11-11T${time}:00Z`),
    language,
    sections: language === 'tr' ? ['turkey'] : ['world'],
  };
}

const AA_RATE =
  'Türkiye Cumhuriyet Merkez Bankası Para Politikası Kurulu, politika faizini yüzde 35 seviyesinde sabit tuttu.';

const turkish = [
  article('aa-tr', '11:00', 'Merkez Bankası politika faizini yüzde 35’te sabit tuttu', AA_RATE),
  article(
    'sabah',
    '11:05',
    'Merkez Bankası faiz kararını açıkladı: Faiz yüzde 35’te sabit',
    AA_RATE,
  ),
  article(
    'sozcu',
    '11:20',
    'Merkez Bankası faizi değiştirmedi',
    'TCMB politika faizini yüzde 35’te bıraktı. Ekonomistler kararın beklentilerle uyumlu olduğunu söyledi.',
  ),
  article(
    'ntv',
    '09:10',
    'Malatya’da 4,6 büyüklüğünde deprem',
    'AFAD, Malatya’nın Pütürge ilçesinde 4,6 büyüklüğünde deprem meydana geldiğini duyurdu.',
  ),
  article(
    'haberturk',
    '09:25',
    'Malatya Pütürge’de 4,6’lık deprem korkuttu',
    'Kandilli ve AFAD verilerine göre deprem 7 kilometre derinlikte gerçekleşti.',
  ),
  article(
    'cumhuriyet',
    '10:00',
    'Meclis’te bütçe görüşmeleri başladı',
    'TBMM Plan ve Bütçe Komisyonu’nda 2027 bütçesinin görüşmelerine başlandı.',
  ),
];

describe('groupStories', () => {
  const stories = groupStories(turkish);
  const byFirstSource = new Map(
    stories.map((story) => [story.articles[0]?.article.sourceId, story]),
  );

  it('puts each event in its own story', () => {
    expect(stories).toHaveLength(3);
    expect(byFirstSource.get('aa-tr')?.articles.map((m) => m.article.sourceId)).toEqual([
      'aa-tr',
      'sabah',
      'sozcu',
    ]);
    expect(byFirstSource.get('ntv')?.articles.map((m) => m.article.sourceId)).toEqual([
      'ntv',
      'haberturk',
    ]);
    expect(byFirstSource.get('cumhuriyet')?.articles).toHaveLength(1);
  });

  it('sorts stories by latest update and dates them', () => {
    const [latest] = stories;
    expect(latest?.articles[0]?.article.sourceId).toBe('aa-tr');
    expect(latest?.firstSeenAt.toISOString()).toBe('2026-11-11T11:00:00.000Z');
    expect(latest?.lastUpdatedAt.toISOString()).toBe('2026-11-11T11:20:00.000Z');
    expect(latest?.id).toBe(latest?.articles[0]?.article.id);
  });

  it('marks a republished wire text as a copy, not independent reporting', () => {
    const rate = byFirstSource.get('aa-tr');
    const [aa, sabah, sozcu] = rate?.articles ?? [];
    expect(sabah?.copyOf).toBe(aa?.article.id);
    expect(sozcu?.copyOf).toBeUndefined();
    expect(rate && reportingSourceIds(rate)).toEqual(['aa-tr', 'sozcu']);
  });

  it('does not merge stories across languages', () => {
    const mixed = groupStories([
      article('bbc-world', '08:00', 'Earthquake of magnitude 4.6 hits Malatya', '', 'en'),
      article('ntv', '08:05', 'Malatya’da 4,6 büyüklüğünde deprem'),
    ]);
    expect(mixed).toHaveLength(2);
  });

  it('starts a new story after a long silence', () => {
    const late = groupStories(
      [
        article('ntv', '01:00', 'Malatya’da 4,6 büyüklüğünde deprem'),
        article('haberturk', '09:00', 'Malatya’da 4,6 büyüklüğünde deprem'),
      ],
      { maxGapHours: 6 },
    );
    expect(late).toHaveLength(2);
  });

  it('groups English stories from different outlets', () => {
    const world = groupStories([
      article(
        'bbc-world',
        '06:00',
        'Leaders agree to hold ceasefire talks in Geneva',
        'The talks are due to start next week.',
        'en',
      ),
      article(
        'guardian-world',
        '06:40',
        'Ceasefire talks to open in Geneva next week, leaders say',
        '',
        'en',
      ),
      article(
        'al-jazeera',
        '07:00',
        'Floods force thousands from homes in Bangladesh',
        'Heavy monsoon rain has flooded villages.',
        'en',
      ),
    ]);
    expect(world.map((story) => story.articles.length).sort()).toEqual([1, 2]);
  });

  it('returns nothing for no articles', () => {
    expect(groupStories([])).toEqual([]);
  });
});
