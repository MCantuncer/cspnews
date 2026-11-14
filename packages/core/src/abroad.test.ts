import { describe, expect, it } from 'vitest';

import {
  AbroadItemSchema,
  abroadIn,
  definePeople,
  foldName,
  mentionsTurkAbroad,
  peopleNamedIn,
  type AbroadItem,
} from './abroad.js';

/** A copy of `value` without `key`, to test a missing field. */
const without = <T extends object>(value: T, key: keyof T) =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

const ITEM: AbroadItem = {
  id: 'abroad-sengun-lakers',
  person: 'Alperen Şengün',
  kind: 'basketball',
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
  stats: {
    sport: 'basketball',
    minutes: 34,
    points: 28,
    rebounds: 12,
    assists: 7,
    fieldGoals: { made: 11, tried: 18 },
    plusMinus: 14,
  },
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

  it('takes only a stat line for the person’s own sport', () => {
    const football = { sport: 'football', goals: 1, assists: 0 };
    expect(AbroadItemSchema.safeParse({ ...ITEM, stats: football }).success).toBe(false);
  });

  it('refuses more shots made than tried', () => {
    const stats = { ...ITEM.stats, fieldGoals: { made: 19, tried: 18 } };
    expect(AbroadItemSchema.safeParse({ ...ITEM, stats }).success).toBe(false);
  });

  it('gives a milestone both its type and its name', () => {
    const scientist = {
      ...ITEM,
      kind: 'science',
      stats: undefined,
      milestone: 'award',
    };
    expect(AbroadItemSchema.safeParse(scientist).success).toBe(false);
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
      kind: 'basketball',
    },
    {
      id: 'arda-guler',
      name: 'Arda Güler',
      aliases: ['Arda Guler'],
      kind: 'football',
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

  it('finds the phrases that point at a Turk abroad, from the start of a word', () => {
    expect(mentionsTurkAbroad('TÜRK BİLİM İNSANINA ÖDÜL', ['Türk bilim insan'])).toBe(true);
    expect(mentionsTurkAbroad('A Turkish-born engineer at NASA', ['Turkish-born'])).toBe(true);
    expect(mentionsTurkAbroad('Turkish markets close higher', ['Turkish-born'])).toBe(false);
  });

  it('refuses a repeated id', () => {
    expect(() =>
      definePeople([
        { id: 'a', name: 'A B', kind: 'science' },
        { id: 'a', name: 'C D', kind: 'science' },
      ]),
    ).toThrow();
  });
});
