import { describe, expect, it } from 'vitest';

import { parseBulletin, WrittenStorySchema, type WrittenStory } from './story.js';

const paragraph = (words: number) =>
  Array.from({ length: words }, (_, index) => `söz${String(index % 10)}`).join(' ');

const STORY: WrittenStory = {
  id: 'a1b2c3d4e5f60718',
  section: 'turkey',
  language: 'tr',
  label: 'confirmed',
  developing: false,
  shortTitle: 'Faiz yüzde 35’te kaldı',
  title: 'Merkez Bankası politika faizini yüzde 35’te sabit tuttu',
  summary: {
    what: 'Merkez Bankası faizi yüzde 35’te bıraktı.',
    why: 'Kredi ve mevduat faizleri bir süre daha yüksek kalacak.',
    next: 'Bir sonraki karar 18 Aralık’ta açıklanacak.',
  },
  body: [
    { subhead: 'Karar', blocks: [{ text: paragraph(120) }] },
    {
      subhead: 'Tepkiler',
      blocks: [
        { text: paragraph(60) },
        { quote: 'Karar beklentilerle uyumlu.', speaker: 'Bir ekonomist', sourceId: 'bbc-turkce' },
      ],
    },
    { subhead: 'Arka plan', blocks: [{ text: paragraph(140) }] },
  ],
  facts: [{ label: 'Politika faizi', value: '%35', source: 'TCMB' }],
  series: [{ date: '2026-10-23', value: '%35', label: 'Ekim kararı' }],
  keyNumber: { label: 'Politika faizi', unit: '%', before: 35, after: 35, source: 'TCMB' },
  place: { name: 'Ankara', lat: 39.93, lon: 32.85, region: 'Türkiye' },
  orgId: 'tcmb',
  sources: [{ sourceId: 'aa-tr', url: 'https://aa.example/faiz', confirms: true }],
  publishedAt: '2026-11-11T09:30:00+03:00',
  updatedAt: '2026-11-11T09:30:00+03:00',
};

const issues = (story: unknown) =>
  WrittenStorySchema.safeParse(story).error?.issues.map((issue) => issue.message) ?? [];

describe('WrittenStorySchema', () => {
  it('accepts a full story', () => {
    expect(issues(STORY)).toEqual([]);
  });

  it('needs a full body, not just the summary', () => {
    expect(issues({ ...STORY, body: [] })).not.toEqual([]);
    const short = STORY.body.map((section) => ({ ...section, blocks: [{ text: paragraph(20) }] }));
    expect(issues({ ...STORY, body: short })).toContain('Write 300 to 700 words');
  });

  it('caps the body at 700 words', () => {
    const long = STORY.body.map((section) => ({ ...section, blocks: [{ text: paragraph(250) }] }));
    expect(issues({ ...STORY, body: long })).toContain('Write 300 to 700 words');
  });

  it('keeps the short title to 3 to 6 words', () => {
    expect(issues({ ...STORY, shortTitle: 'Faiz' })).toContain('Use 3 to 6 words');
    expect(issues({ ...STORY, shortTitle: 'Faiz yüzde otuz beşte sabit kaldı bugün' })).toContain(
      'Use 3 to 6 words',
    );
  });

  it('requires an attributed quote', () => {
    const unattributed = [
      ...STORY.body.slice(0, 2),
      { subhead: 'Tepki', blocks: [{ quote: 'Çok iyi.' }] },
    ];
    expect(issues({ ...STORY, body: unattributed })).not.toEqual([]);
  });

  it('allows at most 5 facts and rejects unknown fields', () => {
    const fact = { label: 'x', value: '1', source: 'y' };
    expect(issues({ ...STORY, facts: Array(6).fill(fact) })).not.toEqual([]);
    expect(issues({ ...STORY, teaser: 'x' })).not.toEqual([]);
  });

  it('accepts a story timeline and checks each event', () => {
    const timeline = [
      { kind: 'first-reported', at: '2026-11-11T08:00:00Z', sourceId: 'aa-tr' },
      { kind: 'label-changed', at: '2026-11-11T08:30:00Z', from: 'single-source', to: 'confirmed' },
    ];
    expect(issues({ ...STORY, timeline })).toEqual([]);
    expect(
      issues({ ...STORY, timeline: [{ kind: 'label-changed', at: '2026-11-11T08:30:00Z' }] }),
    ).toContain('A label change needs from and to; every other event needs a source');
  });

  it('treats the visual and timeline fields as optional', () => {
    const { facts, series, keyNumber, place, orgId, ...bare } = STORY;
    expect([facts, series, keyNumber, place, orgId].every(Boolean)).toBe(true);
    expect(issues(bare)).toEqual([]);
  });
});

describe('parseBulletin', () => {
  const bulletin = {
    version: 1,
    slot: 'morning',
    publishAt: '2026-11-11T07:30:00+03:00',
    writtenAt: '2026-11-11T07:20:00+03:00',
    stories: [STORY],
  };

  it('accepts a valid bulletin', () => {
    expect(parseBulletin(bulletin).stories).toHaveLength(1);
  });

  it('rejects duplicate stories', () => {
    expect(() => parseBulletin({ ...bulletin, stories: [STORY, STORY] })).toThrow(
      /Story ids must be unique/,
    );
  });
});
