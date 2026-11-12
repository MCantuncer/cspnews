import { describe, expect, it } from 'vitest';

import { campMap, reliabilitySteps } from './camps.js';

const url = 'https://example.com/a';

describe('campMap', () => {
  it('shows every political camp for Türkiye stories, empty ones included', () => {
    const rows = campMap(
      [
        { sourceId: 'aa-tr', url, confirms: true },
        { sourceId: 'sozcu', url, confirms: true },
        { sourceId: 'bbc-turkce', url, confirms: true },
      ],
      'turkey',
      'en',
    );
    expect(rows.map((row) => [row.camp, row.count])).toEqual([
      ['government', 1],
      ['mainstream', 0],
      ['opposition', 1],
      ['independent', 0],
      ['international', 1],
    ]);
  });

  it('shows only camps with outlets elsewhere, and never counts copies', () => {
    const rows = campMap(
      [
        { sourceId: 'the-verge', url, confirms: true },
        { sourceId: 'wired', url, confirms: false },
        { sourceId: 'unknown-outlet', url, confirms: true },
      ],
      'tech',
      'tr',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Uzman yayınlar');
    expect(rows[0]?.count).toBe(1);
    expect(rows[0]?.copies).toBe(1);
    expect(rows[0]?.outlets.map((o) => [o.name, o.confirms])).toEqual([
      ['The Verge', true],
      ['Wired', false],
    ]);
  });
});

describe('reliabilitySteps', () => {
  it('rates wires highest and partisan or low outlets lowest', () => {
    expect([reliabilitySteps('wire'), reliabilitySteps('established')]).toEqual([3, 2]);
    expect([reliabilitySteps('partisan'), reliabilitySteps('low')]).toEqual([1, 1]);
  });
});
