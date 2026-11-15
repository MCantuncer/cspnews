import { describe, expect, it } from 'vitest';

import { TodayItemSchema, todayIn } from './today.js';

const item = {
  kind: 'fx',
  label: { en: 'US dollar', tr: 'ABD doları' },
  value: '34.21 ₺',
  source: 'TCMB',
  asOf: '2026-11-15T09:30:00+03:00',
};

describe('today line', () => {
  it('reads an item in the reader’s language', () => {
    expect(todayIn(TodayItemSchema.parse(item), 'tr')).toEqual({
      kind: 'fx',
      label: 'ABD doları',
      value: '34.21 ₺',
      source: 'TCMB',
      asOf: '2026-11-15T09:30:00+03:00',
    });
  });

  it('keeps an optional note per language', () => {
    const parsed = TodayItemSchema.parse({
      ...item,
      kind: 'weather',
      note: { en: 'Light rain', tr: 'Hafif yağmur' },
    });
    expect(todayIn(parsed, 'en').note).toBe('Light rain');
  });

  it('needs a source and a time, and only known kinds', () => {
    expect(() => TodayItemSchema.parse({ ...item, asOf: undefined })).toThrow();
    expect(() => TodayItemSchema.parse({ ...item, source: '' })).toThrow();
    expect(() => TodayItemSchema.parse({ ...item, kind: 'crypto' })).toThrow();
  });
});
