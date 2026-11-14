import { abroadIn, type AbroadItem, type Language, type LocalAbroadItem } from '@cspnews/core';

import { bulletinPath, type PublishedBulletin } from './bulletins.js';
import type { InterfaceLanguage } from './evidence.js';
import { TIME_ZONE, formatTime } from './format.js';

/**
 * Turks abroad (docs/design/decisions/turks-abroad.md): Turkish people making news in other
 * countries, one row each on Contents and a page of their own.
 */

/** The bulletin's Turks abroad items in the reader's language, in the order the run gave. */
export function abroadItemsIn(published: PublishedBulletin, language: Language): LocalAbroadItem[] {
  return (published.bulletin.abroad ?? []).map((item) => abroadIn(item, language));
}

/** The URL of a person's page: `/2026-11-14/morning/abroad/<item id>`. */
export function abroadPath(
  published: PublishedBulletin,
  item: Pick<AbroadItem, 'id'>,
  lang: InterfaceLanguage = 'en',
): string {
  return `${bulletinPath(published, lang)}/abroad/${encodeURIComponent(item.id)}`;
}

/** Initials for the round mark when there is no photo: "Alperen Şengün" → "AŞ". */
export function initials(person: string): string {
  const parts = person.split(/\s+/).filter(Boolean);
  const picked = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return picked.map((part) => part?.charAt(0).toLocaleUpperCase('tr') ?? '').join('');
}

const locale = (lang: InterfaceLanguage) => (lang === 'tr' ? 'tr-TR' : 'en-GB');

const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso));

/**
 * "04:30" when the moment falls on the bulletin's own Istanbul day, else "Thursday 21:45", so a
 * night game in America reads as the hour it was here.
 */
export function istanbulMoment(iso: string, bulletinAt: string, lang: InterfaceLanguage): string {
  const time = formatTime(iso, lang);
  if (dayOf(iso) === dayOf(bulletinAt)) return time;
  const weekday = new Intl.DateTimeFormat(locale(lang), {
    weekday: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
  return `${weekday} ${time}`;
}

/** The short line under a row: when the game was played or when the next one is, in our time. */
export function whenLine(
  item: Pick<LocalAbroadItem, 'playedAt' | 'nextAt'>,
  bulletinAt: string,
  lang: InterfaceLanguage,
): string | undefined {
  const words = abroadWords(lang);
  if (item.playedAt) return words.played(istanbulMoment(item.playedAt, bulletinAt, lang));
  if (item.nextAt) return words.nextAt(istanbulMoment(item.nextAt, bulletinAt, lang));
  return undefined;
}

const WORDS = {
  en: {
    abroad: 'Turks abroad',
    count: (n: number) => (n === 1 ? '1 name' : `${String(n)} names`),
    note: 'What our people did in other countries since the last bulletin.',
    played: (when: string) => `Played at ${when} our time`,
    nextAt: (when: string) => `Next: ${when}`,
    next: 'Next',
    nextLine: (where: string, when: string) => `${where}, ${when} our time`,
    form: 'Last games',
    formNote: (of: string) => `${of}. Filled for a win, hollow for a loss, half for a draw.`,
    results: { win: 'Win', draw: 'Draw', loss: 'Loss' },
    sources: 'Sources',
  },
  tr: {
    abroad: 'Dünyadaki Türkler',
    count: (n: number) => `${String(n)} isim`,
    note: 'Son bültenden bu yana yurt dışındaki isimlerimizden haberler.',
    played: (when: string) => `Maç saati: ${when} (TSİ)`,
    nextAt: (when: string) => `Sıradaki: ${when}`,
    next: 'Sıradaki maç',
    nextLine: (where: string, when: string) => `${where}, ${when} (TSİ)`,
    form: 'Son maçlar',
    formNote: (of: string) => `${of}. Dolu: galibiyet, boş: mağlubiyet, yarım: beraberlik.`,
    results: { win: 'Galibiyet', draw: 'Beraberlik', loss: 'Mağlubiyet' },
    sources: 'Kaynaklar',
  },
} as const;

export type AbroadWords = (typeof WORDS)[InterfaceLanguage];

export function abroadWords(lang: InterfaceLanguage): AbroadWords {
  return WORDS[lang];
}
