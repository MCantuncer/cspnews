import { describe, expect, it } from 'vitest';

import type { PublishedBulletin } from './bulletins';
import { archiveMonths } from './archive';

const published = (date: string, slot: string, hour: string): PublishedBulletin =>
  ({
    date,
    slot,
    bulletin: { publishAt: `${date}T${hour}:30:00+03:00` },
  }) as unknown as PublishedBulletin;

describe('archive', () => {
  const all = [
    published('2026-11-15', 'midday', '12'),
    published('2026-11-15', 'morning', '07'),
    published('2026-10-31', 'late', '22'),
    published('2026-11-14', 'evening', '18'),
  ];

  it('groups by month and day, newest first, each day in the order it came out', () => {
    const months = archiveMonths(all, 'en');
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10']);
    expect(months[0]?.days.map((d) => d.date)).toEqual(['2026-11-15', '2026-11-14']);
    expect(months[0]?.days[0]?.bulletins.map((b) => b.slot)).toEqual(['morning', 'midday']);
  });

  it('links each bulletin in the reader’s language', () => {
    const [first] = archiveMonths(all, 'tr')[0]?.days[0]?.bulletins ?? [];
    expect(first?.href).toBe('/tr/2026-11-15/morning');
    expect(first?.name).toBe('Sabah bülteni');
  });

  it('is empty with no bulletins', () => {
    expect(archiveMonths([], 'en')).toEqual([]);
  });
});
