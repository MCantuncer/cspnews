import { fileURLToPath } from 'node:url';

import type { TransferMove } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { loadBulletins, type PublishedBulletin } from './bulletins.js';
import {
  andFinallyIn,
  extrasWords,
  stageWord,
  transferPath,
  transferReporters,
  transfersIn,
} from './extras.js';
import { sitemapPaths } from './feed.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/bulletins', import.meta.url));
const [sample] = loadBulletins(FIXTURES);
if (!sample) throw new Error('The fixtures need a bulletin');

const move = (id: string, stage: TransferMove['stage'], reports: TransferMove['reports']) =>
  ({
    id,
    league: 'super-lig',
    from: 'Napoli',
    to: 'Fenerbahçe',
    stage,
    clubConfirmed: stage === 'signed',
    steps: [{ stage, on: '2026-11-13' }],
    reports,
    versions: {
      en: { shortTitle: `Move ${id} in English`, title: 'A move', now: 'Where it is.' },
      tr: { shortTitle: `Transfer ${id} Türkçe hali`, title: 'Bir transfer', now: 'Durum.' },
    },
    updatedAt: '2026-11-13T18:00:00+03:00',
  }) satisfies TransferMove;

const report = (sourceId: string, stage: TransferMove['stage'], on: string) => ({
  sourceId,
  url: `https://${sourceId}.example/`,
  stage,
  on,
});

const withExtras: PublishedBulletin = {
  ...sample,
  bulletin: {
    ...sample.bulletin,
    andFinally: {
      light: [
        {
          id: 'light-1',
          label: 'confirmed',
          versions: {
            en: { title: 'Ferry cat gets a badge', gist: 'It rides daily.', aside: 'No comment.' },
            tr: { title: 'Vapur kedisine kart', gist: 'Her gün biniyor.', aside: 'Yorum yok.' },
          },
          sources: [{ sourceId: 'ntv', url: 'https://ntv.example/' }],
        },
      ],
      rumours: [
        {
          id: 'rumour-1',
          versions: { en: { title: 'Drama said to end' }, tr: { title: 'Dizi bitiyor' } },
          heardFrom: { sourceId: 'onedio', url: 'https://onedio.example/' },
        },
      ],
    },
    transfers: [
      move('talk', 'talk', [report('fotomac', 'talk', '2026-11-13')]),
      move('signed', 'signed', [report('ntv', 'signed', '2026-11-13')]),
      move('agreed', 'agreed', [
        report('fanatik', 'talk', '2026-11-02'),
        report('fanatik', 'agreed', '2026-11-12'),
        report('aa-tr', 'talks', '2026-11-08'),
      ]),
    ],
  },
};

describe('And finally', () => {
  it('is missing when the bulletin has none', () => {
    expect(andFinallyIn(sample, 'en')).toBeUndefined();
  });

  it('gives light stories and rumours in the reader’s language, with the count', () => {
    const close = andFinallyIn(withExtras, 'tr');
    expect(close?.count).toBe(2);
    expect(close?.light[0]?.aside).toBe('Yorum yok.');
    expect(close?.rumours[0]?.title).toBe('Dizi bitiyor');
  });

  it('has its words in both languages', () => {
    expect(extrasWords('en').andFinally).toBe('And finally');
    expect(extrasWords('tr').andFinally).toBe('Biraz da magazin');
    expect(extrasWords('en').count(1)).toBe('1 light story');
  });
});

describe('Transfers', () => {
  it('lists the moves furthest along first', () => {
    expect(transfersIn(withExtras, 'en').map((m) => m.id)).toEqual(['signed', 'agreed', 'talk']);
    expect(transfersIn(sample, 'en')).toEqual([]);
  });

  it('gives each move a page under its bulletin, in both languages', () => {
    expect(transferPath(withExtras, { id: 'agreed' })).toBe(
      `/${sample.date}/${sample.slot}/transfers/agreed`,
    );
    expect(transferPath(withExtras, { id: 'agreed' }, 'tr')).toMatch(/^\/tr\//);
    expect(sitemapPaths([withExtras])).toContain(transferPath(withExtras, { id: 'talk' }, 'tr'));
  });

  it('names each outlet once, at its furthest stage, agencies first', () => {
    const agreed = transfersIn(withExtras, 'en').find((m) => m.id === 'agreed');
    if (!agreed) throw new Error('missing move');
    const reporters = transferReporters(agreed);
    expect(reporters.map((r) => r.sourceId)).toEqual(['aa-tr', 'fanatik']);
    expect(reporters[1]?.stage).toBe('agreed');
  });

  it('names the stages in both languages', () => {
    expect(stageWord('agreed', 'en')).toBe('Agreed');
    expect(stageWord('signed', 'tr')).toBe('İmza');
  });
});
