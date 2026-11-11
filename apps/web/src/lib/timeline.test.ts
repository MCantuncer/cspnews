import type { WrittenStory } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { sourceOrdinal } from './i18n.js';
import { compactStations, timelineFor, type TimelinePoint } from './timeline.js';

const name = (id: string) => id.toUpperCase();
const base = { label: 'reported' } as WrittenStory;

describe('timelineFor', () => {
  it('shows earlier values for a series story, oldest first', () => {
    const story = {
      ...base,
      series: [
        { date: '2026-10-23', value: '%33', label: 'Ekim' },
        { date: '2026-07-24', value: '%36,5', label: 'Temmuz' },
      ],
    } as WrittenStory;
    const timeline = timelineFor(story, 'tr', name);
    expect(timeline?.kind).toBe('series');
    expect(timeline?.points.map((p) => p.when)).toEqual(['24 Tem', '23 Eki']);
    expect(timeline?.points.map((p) => p.current)).toEqual([false, true]);
  });

  it('shows the story’s own life, in Istanbul time, counting outlets', () => {
    const story = {
      ...base,
      timeline: [
        { kind: 'outlet-joined', at: '2026-11-11T06:40:00Z', sourceId: 'b' },
        { kind: 'first-reported', at: '2026-11-11T06:12:00Z', sourceId: 'a' },
        { kind: 'label-changed', at: '2026-11-11T07:00:00Z', from: 'reported', to: 'disputed' },
      ],
    } as WrittenStory;
    const timeline = timelineFor(story, 'en', name);
    expect(timeline?.kind).toBe('life');
    expect(timeline?.points).toEqual([
      { when: '09:12', title: 'First report', detail: 'A', current: false },
      { when: '09:40', title: '2nd source', detail: 'B', current: false },
      {
        when: '10:00',
        title: 'Disputed',
        label: 'disputed',
        detail: 'Was: Reported',
        current: true,
      },
    ]);
  });

  it('shows nothing for fewer than two points', () => {
    expect(timelineFor(base, 'en', name)).toBeUndefined();
  });
});

describe('sourceOrdinal', () => {
  it('uses English ordinals and Turkish numbering', () => {
    expect([1, 2, 3, 4, 11, 12, 21].map((n) => sourceOrdinal(n, 'en'))).toEqual([
      '1st source',
      '2nd source',
      '3rd source',
      '4th source',
      '11th source',
      '12th source',
      '21st source',
    ]);
    expect(sourceOrdinal(2, 'tr')).toBe('2. kaynak');
  });
});

describe('compactStations', () => {
  const points = (n: number): TimelinePoint[] =>
    Array.from({ length: n }, (_, i) => ({
      when: String(i),
      title: `p${String(i)}`,
      current: i === n - 1,
    }));

  it('keeps every station when they fit', () => {
    expect(compactStations(points(6)).map((s) => s.kind)).toEqual(Array(6).fill('point'));
  });

  it('folds the middle into a +N marker, keeping the first and the latest', () => {
    const stations = compactStations(points(10));
    expect(stations).toHaveLength(6);
    expect(stations[0]).toMatchObject({ kind: 'point', point: { title: 'p0' } });
    expect(stations[1]).toEqual({ kind: 'gap', hidden: 5 });
    expect(stations.at(-1)).toMatchObject({ kind: 'point', point: { title: 'p9', current: true } });
  });
});
