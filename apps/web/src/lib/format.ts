import type { InterfaceLanguage } from './evidence.js';

/** All times on the site are Istanbul times, whatever the reader's device says. */
export const TIME_ZONE = 'Europe/Istanbul';

const locale = (language: InterfaceLanguage) => (language === 'tr' ? 'tr-TR' : 'en-GB');

/** "18:30". */
export function formatTime(iso: string, language: InterfaceLanguage): string {
  return new Intl.DateTimeFormat(locale(language), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** "24 Jul" / "24 Tem", for a calendar date (`yyyy-mm-dd`). */
export function formatShortDate(date: string, language: InterfaceLanguage): string {
  return new Intl.DateTimeFormat(locale(language), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace('.', '');
}

/** "Wednesday 11 November" / "11 Kasım Çarşamba". */
export function formatLongDate(iso: string, language: InterfaceLanguage): string {
  return new Intl.DateTimeFormat(locale(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}
