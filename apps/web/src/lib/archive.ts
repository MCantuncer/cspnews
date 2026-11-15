import { bulletinPath, type PublishedBulletin } from './bulletins.js';
import type { InterfaceLanguage } from './evidence.js';
import { bulletinName } from './i18n.js';

/** One day of the archive: its bulletins, in the order they came out. */
export interface ArchiveDay {
  readonly date: string;
  readonly bulletins: readonly {
    readonly slot: string;
    readonly name: string;
    readonly href: string;
  }[];
}

/** One month of the archive: `2026-11`, with its days newest first. */
export interface ArchiveMonth {
  readonly month: string;
  readonly days: readonly ArchiveDay[];
}

/** Every bulletin grouped by day and month, newest first. */
export function archiveMonths(
  all: readonly PublishedBulletin[],
  lang: InterfaceLanguage,
): ArchiveMonth[] {
  const byDay = new Map<string, PublishedBulletin[]>();
  for (const published of all) {
    byDay.set(published.date, [...(byDay.get(published.date) ?? []), published]);
  }
  const days = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, bulletins]): ArchiveDay => ({
      date,
      bulletins: [...bulletins]
        .sort((a, b) => a.bulletin.publishAt.localeCompare(b.bulletin.publishAt))
        .map((published) => ({
          slot: published.slot,
          name: bulletinName(published.slot, lang),
          href: bulletinPath(published, lang),
        })),
    }));
  const months = new Map<string, ArchiveDay[]>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), day]);
  }
  return [...months.entries()].map(([month, monthDays]) => ({ month, days: monthDays }));
}
