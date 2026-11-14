import { describe, expect, it } from 'vitest';

import {
  AbroadItemSchema,
  abroadIn,
  definePeople,
  foldName,
  peopleNamedIn,
  type AbroadItem,
} from './abroad.js';

/** A copy of `value` without `key`, to test a missing field. */
const without = <T extends object>(value: T, key: keyof T) =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

const ITEM: AbroadItem = {
  id: 'abroad-sengun-lakers',
  person: 'Alperen Şengün',
  field: 'sport',
  label: 'confirmed',
  versions: {
    en: {
      where: 'Houston Rockets, NBA',
      title: '28 points and 12 rebounds as the Rockets beat the Lakers',
      headline: 'Şengün scores 28 as the Rockets beat the Lakers',
      story: ['Şengün led Houston from the start.'],
      formOf: 'Points',
      next: 'At Denver',
    },
    tr: {
      where: 'Houston Rockets, NBA',
      title: 'Şengün’den 28 sayı, 12 ribaunt: Rockets, Lakers’ı yendi',
      headline: 'Şengün 28 sayı attı, Rockets Lakers’ı yendi',
      story: ['Şengün maçın başından itibaren Houston’ı sırtladı.'],
      formOf: 'Sayı',
      next: 'Denver deplasmanında',
    },
  },
  score: 'Rockets 118, Lakers 109',
  playedAt: '2026-11-14T01:30:00Z',
  nextAt: '2026-11-16T02:00:00Z',
  form: [
    { result: 'win', value: '19' },
    { result: 'loss', value: '22' },
    { result: 'win', value: '28' },
  ],
  sources: [{ sourceId: 'espn-nba', url: 'https://espn.example/rockets' }],
  updatedAt: '2026-11-14T05:00:00Z',
};

describe('Turks abroad items', () => {
  it('accepts a full item', () => {
    expect(AbroadItemSchema.parse(ITEM)).toEqual(ITEM);
  });

  it('needs a time and a place for the next game together', () => {
    const noTime = without(ITEM, 'nextAt');
    expect(AbroadItemSchema.safeParse(noTime).success).toBe(false);
  });

  it('needs to say what the numbers under the last games count', () => {
    const en = without(ITEM.versions.en, 'formOf');
    expect(
      AbroadItemSchema.safeParse({ ...ITEM, versions: { ...ITEM.versions, en } }).success,
    ).toBe(false);
  });

  it('needs the time a scored game was played', () => {
    const noTime = without(ITEM, 'playedAt');
    expect(AbroadItemSchema.safeParse(noTime).success).toBe(false);
  });

  it('never takes a single-source label', () => {
    expect(AbroadItemSchema.safeParse({ ...ITEM, label: 'single-source' }).success).toBe(false);
  });

  it('reads in one language', () => {
    expect(abroadIn(ITEM, 'tr').next).toBe('Denver deplasmanında');
    expect(abroadIn(ITEM, 'en').person).toBe('Alperen Şengün');
  });
});

describe('the watch list', () => {
  const people = definePeople([
    {
      id: 'alperen-sengun',
      name: 'Alperen Şengün',
      aliases: ['Alperen Sengun', 'Şengün'],
      field: 'sport',
      what: 'basketball',
    },
    {
      id: 'arda-guler',
      name: 'Arda Güler',
      aliases: ['Arda Guler'],
      field: 'sport',
      what: 'football',
    },
  ]);

  it('folds case and Turkish letters', () => {
    expect(foldName('ŞENGÜN')).toBe(foldName('sengun'));
    expect(foldName('Kenan YILDIZ')).toBe('kenan yildiz');
  });

  it('finds people by name or alias, with suffixes, as whole words', () => {
    const named = (text: string) => peopleNamedIn(text, people).map((person) => person.id);
    expect(named('Sengun scores 28')).toEqual(['alperen-sengun']);
    expect(named('Şengün’den 28 sayı')).toEqual(['alperen-sengun']);
    expect(named('ARDA GÜLER GOL ATTI')).toEqual(['arda-guler']);
    expect(named('Güler said nothing')).toEqual([]);
    expect(named('Sengunova wins')).toEqual([]);
  });

  it('refuses a repeated id', () => {
    expect(() =>
      definePeople([
        { id: 'a', name: 'A B', field: 'sport', what: 'x' },
        { id: 'a', name: 'C D', field: 'sport', what: 'x' },
      ]),
    ).toThrow();
  });
});
