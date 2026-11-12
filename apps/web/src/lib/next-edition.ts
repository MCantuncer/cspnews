import type { InterfaceLanguage } from './evidence';
import { nextBulletinAt } from './i18n';

/**
 * The line that says when the next edition comes (US-05). The pages are static, so the time is
 * written at build; once that time has passed without a new edition, a line still promising
 * "Next at 22:30" would be untrue. The browser calls this to say so instead.
 */
export type EditionState = 'due' | 'late' | 'stalled';

/** A new edition is given this long after its time before the page calls it late. */
export const LATE_AFTER_MINUTES = 10;
/** After this long, "running late" undersells it: say plainly that nothing newer exists. */
export const STALLED_AFTER_HOURS = 6;

const MS_PER_MINUTE = 60_000;

export function editionState(dueAt: Date, now: Date): EditionState {
  const overdue = now.getTime() - dueAt.getTime();
  if (overdue < LATE_AFTER_MINUTES * MS_PER_MINUTE) return 'due';
  if (overdue < STALLED_AFTER_HOURS * 60 * MS_PER_MINUTE) return 'late';
  return 'stalled';
}

const LATE: Record<InterfaceLanguage, (time: string) => string> = {
  en: (time) => `The ${time} edition is running late.`,
  tr: (time) => `${time} bülteni gecikti.`,
};

const STALLED: Record<InterfaceLanguage, string> = {
  en: 'No newer edition has been published yet.',
  tr: 'Henüz yeni bir bülten yayımlanmadı.',
};

/** `time` is the next edition's Istanbul time as shown to the reader, for example "22:30". */
export function nextEditionLine(
  state: EditionState,
  time: string,
  language: InterfaceLanguage,
): string {
  if (state === 'late') return LATE[language](time);
  if (state === 'stalled') return STALLED[language];
  return nextBulletinAt(time, language);
}
