import { describe, expect, it } from 'vitest';

import { finishedDays, markFinished, weekOf } from './week';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('week', () => {
  it('runs Monday to Sunday around any day', () => {
    expect(weekOf('2026-11-15')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(weekOf('2026-11-09')[0]).toBe('2026-11-09');
    expect(weekOf('2026-12-31')).toContain('2027-01-03');
  });

  it('remembers finished days once, in order', () => {
    const storage = memory();
    markFinished(storage, '2026-11-14');
    markFinished(storage, '2026-11-13');
    markFinished(storage, '2026-11-14');
    expect([...finishedDays(storage)]).toEqual(['2026-11-13', '2026-11-14']);
  });

  it('copes with no storage', () => {
    expect(finishedDays(undefined).size).toBe(0);
    expect(() => {
      markFinished(undefined, '2026-11-14');
    }).not.toThrow();
  });
});
