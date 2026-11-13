import { describe, expect, it } from 'vitest';

import {
  parseBulletin,
  storyIn,
  WrittenStorySchema,
  type StoryVersion,
  type WrittenStory,
} from './story.js';

const paragraph = (words: number) =>
  Array.from({ length: words }, (_, index) => `söz${String(index % 10)}`).join(' ');

const TR: StoryVersion = {
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
};

const EN: StoryVersion = {
  shortTitle: 'Rate held at 35%',
  title: 'The central bank holds its policy rate at 35%',
  summary: {
    what: 'The central bank left its rate at 35%.',
    why: 'Loan and deposit rates will stay high for a while.',
    next: 'The next decision is due on 18 December.',
  },
  body: [
    { subhead: 'The decision', blocks: [{ text: paragraph(120) }] },
    {
      subhead: 'Reactions',
      blocks: [
        { text: paragraph(60) },
        {
          quote: 'The decision is in line with expectations.',
          speaker: 'An economist',
          sourceId: 'bbc-turkce',
          translated: true,
        },
      ],
    },
    { subhead: 'Background', blocks: [{ text: paragraph(140) }] },
  ],
  facts: [{ label: 'Policy rate', value: '35%', source: 'Central Bank of Türkiye' }],
  series: [{ date: '2026-10-23', value: '35%', label: 'October decision' }],
  keyNumber: { label: 'Policy rate', unit: '%', before: 35, after: 35, source: 'CBRT' },
  place: { name: 'Ankara', lat: 39.93, lon: 32.85, region: 'Turkey' },
};

const STORY: WrittenStory = {
  id: 'a1b2c3d4e5f60718',
  section: 'turkey',
  sourceLanguage: 'tr',
  label: 'confirmed',
  developing: false,
  versions: { en: EN, tr: TR },
  orgId: 'tcmb',
  sources: [{ sourceId: 'aa-tr', url: 'https://aa.example/faiz', confirms: true }],
  publishedAt: '2026-11-11T09:30:00+03:00',
  updatedAt: '2026-11-11T09:30:00+03:00',
};

/** The story with its Turkish version changed. */
const withTr = (fields: Record<string, unknown>) => ({
  ...STORY,
  versions: { en: EN, tr: { ...TR, ...fields } },
});

const issues = (story: unknown) =>
  WrittenStorySchema.safeParse(story).error?.issues.map((issue) => issue.message) ?? [];

describe('WrittenStorySchema', () => {
  it('accepts a full story', () => {
    expect(issues(STORY)).toEqual([]);
  });

  it('needs a full body, not just the summary', () => {
    expect(issues(withTr({ body: [] }))).not.toEqual([]);
    const short = TR.body.map((section) => ({ ...section, blocks: [{ text: paragraph(20) }] }));
    expect(issues(withTr({ body: short }))).toContain('Write 240 to 560 words');
  });

  it('caps the body at 700 words', () => {
    const long = TR.body.map((section) => ({ ...section, blocks: [{ text: paragraph(200) }] }));
    expect(issues(withTr({ body: long }))).toContain('Write 240 to 560 words');
  });

  it('expects about a fifth fewer words in Turkish than in English', () => {
    // About 254 words in each: enough in Turkish, too short in English.
    const shorter = (version: StoryVersion) =>
      version.body.map((section, index) =>
        index === 0 ? { ...section, blocks: [{ text: paragraph(50) }] } : section,
      );
    expect(issues(withTr({ body: shorter(TR) }))).toEqual([]);
    expect(issues({ ...STORY, versions: { en: { ...EN, body: shorter(EN) }, tr: TR } })).toContain(
      'Write 300 to 700 words',
    );
  });

  it('keeps the short title to 3 to 6 words', () => {
    expect(issues(withTr({ shortTitle: 'Faiz' }))).toContain('Use 3 to 6 words');
    expect(issues(withTr({ shortTitle: 'Faiz yüzde otuz beşte sabit kaldı bugün' }))).toContain(
      'Use 3 to 6 words',
    );
  });

  it('requires an attributed quote', () => {
    const unattributed = [
      ...TR.body.slice(0, 2),
      { subhead: 'Tepki', blocks: [{ quote: 'Çok iyi.' }] },
    ];
    expect(issues(withTr({ body: unattributed }))).not.toEqual([]);
  });

  it('allows at most 5 facts and rejects unknown fields', () => {
    const fact = { label: 'x', value: '1', source: 'y' };
    expect(issues(withTr({ facts: Array(6).fill(fact) }))).not.toEqual([]);
    expect(issues({ ...STORY, teaser: 'x' })).not.toEqual([]);
  });

  it('accepts a story timeline and checks each event', () => {
    const timeline = [
      { kind: 'first-reported', at: '2026-11-11T08:00:00Z', sourceId: 'aa-tr' },
      { kind: 'label-changed', at: '2026-11-11T08:30:00Z', from: 'single-source', to: 'confirmed' },
      {
        kind: 'updated',
        at: '2026-11-11T14:30:00Z',
        note: { en: 'The company will appeal', tr: 'Şirket karara itiraz edecek' },
      },
      {
        kind: 'updated',
        at: '2026-11-11T15:00:00Z',
        note: { en: 'The ministry made a statement', tr: 'Bakanlık açıklama yaptı' },
        sourceId: 'aa-tr',
      },
    ];
    expect(issues({ ...STORY, timeline })).toEqual([]);
    expect(
      issues({ ...STORY, timeline: [{ kind: 'label-changed', at: '2026-11-11T08:30:00Z' }] }),
    ).toContain(
      'A label change needs from and to, an update needs a note, every other event a source',
    );
  });

  it('needs a note on an update', () => {
    expect(
      issues({ ...STORY, timeline: [{ kind: 'updated', at: '2026-11-11T14:30:00Z' }] }),
    ).not.toEqual([]);
  });

  it('needs the note of an update in both languages', () => {
    const timeline = [{ kind: 'updated', at: '2026-11-11T14:30:00Z', note: { tr: 'İtiraz' } }];
    expect(issues({ ...STORY, timeline })).not.toEqual([]);
  });

  it('treats the visual and timeline fields as optional', () => {
    const bare = (version: StoryVersion) => {
      const { facts, series, keyNumber, place, ...rest } = version;
      expect([facts, series, keyNumber, place].every(Boolean)).toBe(true);
      return rest;
    };
    const { orgId, ...story } = STORY;
    expect(orgId).toBeDefined();
    expect(issues({ ...story, versions: { en: bare(EN), tr: bare(TR) } })).toEqual([]);
  });
});

describe('the two versions', () => {
  it('needs both an English and a Turkish version', () => {
    expect(issues({ ...STORY, versions: { tr: TR } })).not.toEqual([]);
  });

  it('keeps the same optional parts in both', () => {
    const { facts, ...noFacts } = TR;
    expect(facts).toBeDefined();
    expect(issues({ ...STORY, versions: { en: EN, tr: noFacts } })).toContain(
      'Both versions need facts, or neither',
    );
  });

  it('keeps the same numbers, dates and places', () => {
    expect(issues(withTr({ keyNumber: { ...TR.keyNumber, after: 40 } }))).toContain(
      'Both versions need the same key number',
    );
    expect(
      issues(withTr({ series: [{ date: '2026-10-24', value: '%35', label: 'Ekim kararı' }] })),
    ).toContain('Both versions need the same series dates');
    expect(issues(withTr({ place: { ...TR.place, lat: 41 } }))).toContain(
      'Both versions need the same place',
    );
  });

  it('keeps the same quotes', () => {
    const [first, second, third] = TR.body;
    if (!first || !second || !third) throw new Error('fixture');
    const body = [first, { ...second, blocks: [{ text: paragraph(60) }] }, third];
    expect(issues(withTr({ body }))).toContain(
      'Both versions need the same quotes from the same outlets',
    );
  });
});

describe('storyIn', () => {
  it('gives the shared facts with the version in the reader’s language', () => {
    const turkish = storyIn(STORY, 'tr');
    expect(turkish.language).toBe('tr');
    expect(turkish.title).toBe(TR.title);
    expect(turkish.sources).toBe(STORY.sources);
    expect(storyIn(STORY, 'en').title).toBe(EN.title);
    expect('versions' in turkish).toBe(false);
  });

  it('gives an update’s note in the reader’s language', () => {
    const timeline = [
      {
        kind: 'updated' as const,
        at: '2026-11-11T14:30:00Z',
        note: { en: 'Appeal', tr: 'İtiraz' },
      },
    ];
    expect(storyIn({ ...STORY, timeline }, 'tr').timeline).toEqual([
      { kind: 'updated', at: '2026-11-11T14:30:00Z', note: 'İtiraz' },
    ]);
  });
});

describe('parseBulletin', () => {
  const bulletin = {
    version: 2,
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

  it('accepts And finally and keeps its ids apart from the stories', () => {
    const rumour = {
      id: 'rumour-1',
      versions: { en: { title: 'Talk of a reshuffle' }, tr: { title: 'Kabine kulisi' } },
      heardFrom: { sourceId: 't24', url: 'https://t24.example/kulis' },
    };
    const close = { light: [], rumours: [rumour] };
    expect(parseBulletin({ ...bulletin, andFinally: close }).andFinally?.rumours).toHaveLength(1);
    const clash = { light: [], rumours: [{ ...rumour, id: STORY.id }] };
    expect(() => parseBulletin({ ...bulletin, andFinally: clash })).toThrow(
      /Story ids must be unique/,
    );
  });
});
