import { describe, expect, it } from 'vitest';

import { brokeAt, dayWindow, placeLabels } from './day-lanes.js';

const hour = (iso: string) => iso.slice(11, 16);

describe('day window', () => {
  it('runs from the hour before the first story to the bulletin, ticking every 3 hours', () => {
    const window = dayWindow(
      ['2026-11-11T06:02:30Z', '2026-11-11T12:00:00Z'],
      '2026-11-11T15:30:00Z',
      hour,
    );
    expect(new Date(window.start).toISOString()).toBe('2026-11-11T06:00:00.000Z');
    expect(window.ticks.map((t) => t.time)).toEqual(['06:00', '09:00', '12:00']);
    expect(window.ticks[0]?.at).toBe(0);
  });

  it('keeps at least an hour when every story broke just before the bulletin', () => {
    const window = dayWindow(['2026-11-11T15:20:00Z'], '2026-11-11T15:30:00Z', hour);
    expect(window.end - window.start).toBeGreaterThanOrEqual(3_600_000);
  });
});

describe('labels', () => {
  const dot = (id: string, at: number, title = 'Twelve chars') => ({
    id,
    title,
    at,
    time: '',
    developing: false,
  });

  it('gives every title a row: beside the line first, then further out', () => {
    const placed = placeLabels(
      [dot('a', 0.5), dot('b', 0.52), dot('c', 0.54), dot('d', 0.9)],
      1000,
      8,
    );
    expect(placed.map((d) => [d.side, d.row])).toEqual([
      ['above', 0],
      ['below', 0],
      ['above', 1],
      ['above', 0],
    ]);
  });

  it('keeps titles inside the lane and never overlapping in a row', () => {
    const placed = placeLabels(
      [dot('a', 0.99, 'A long title at the end'), dot('b', 0.0, 'Start'), dot('c', 0.01, 'Next')],
      400,
      8,
    );
    for (const d of placed) {
      expect(d.labelAt).toBeGreaterThanOrEqual(0);
      expect(d.labelAt * 400 + d.title.length * 8).toBeLessThanOrEqual(400);
    }
    for (const a of placed) {
      for (const b of placed) {
        if (a === b || a.side !== b.side || a.row !== b.row) continue;
        const [first, second] = a.labelAt < b.labelAt ? [a, b] : [b, a];
        expect(first.labelAt * 400 + first.title.length * 8).toBeLessThanOrEqual(
          second.labelAt * 400,
        );
      }
    }
  });

  it('places in time order whatever the input order', () => {
    expect(placeLabels([dot('late', 0.9), dot('early', 0.1)], 1000, 8).map((d) => d.id)).toEqual([
      'early',
      'late',
    ]);
  });
});

describe('broke at', () => {
  it('prefers the first report over the publishing time', () => {
    expect(
      brokeAt({
        publishedAt: '2026-11-11T12:00:00Z',
        timeline: [{ kind: 'first-reported', at: '2026-11-11T06:00:00Z', sourceId: 'x' }],
      }),
    ).toBe('2026-11-11T06:00:00Z');
    expect(brokeAt({ publishedAt: '2026-11-11T12:00:00Z' })).toBe('2026-11-11T12:00:00Z');
  });
});
