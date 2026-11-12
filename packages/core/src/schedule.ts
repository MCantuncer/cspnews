/**
 * Bulletin schedule (F-01, US-01 to US-04).
 *
 * All times are Istanbul local time. Turkey has stayed on UTC+3 all year since 2016,
 * so a fixed offset is exact and avoids depending on the host's time zone data.
 */
export const ISTANBUL_UTC_OFFSET_MINUTES = 180;

export type BulletinKind = 'main' | 'side';

/** Which days a slot runs on. Weekends get the main bulletins only. */
export type SlotDays = 'every-day' | 'weekdays';

export interface BulletinSlot {
  readonly id: string;
  /** Istanbul local time, `HH:MM`. */
  readonly time: string;
  readonly kind: BulletinKind;
  readonly days: SlotDays;
}

export const BULLETIN_SLOTS = [
  { id: 'morning', time: '07:30', kind: 'main', days: 'every-day' },
  { id: 'midday', time: '12:30', kind: 'side', days: 'weekdays' },
  { id: 'evening', time: '18:30', kind: 'main', days: 'every-day' },
  { id: 'late', time: '22:30', kind: 'side', days: 'weekdays' },
] as const satisfies readonly BulletinSlot[];

export interface ScheduledBulletin {
  readonly slot: BulletinSlot;
  readonly publishAt: Date;
}

/** A calendar date in Istanbul. `month` is 1 to 12. */
export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** The Istanbul calendar date that `instant` falls on. */
export function istanbulDateOf(instant: Date): LocalDate {
  const shifted = new Date(instant.getTime() + ISTANBUL_UTC_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** True on Saturday and Sunday in Istanbul. */
export function isWeekend(date: LocalDate): boolean {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function slotRunsOn(slot: BulletinSlot, date: LocalDate): boolean {
  return slot.days === 'every-day' || !isWeekend(date);
}

function istanbulTimeToInstant(date: LocalDate, time: string): Date {
  const [hours, minutes] = parseTime(time);
  const utcMs =
    Date.UTC(date.year, date.month - 1, date.day, hours, minutes) -
    ISTANBUL_UTC_OFFSET_MINUTES * MS_PER_MINUTE;
  return new Date(utcMs);
}

function parseTime(time: string): [number, number] {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error(`Invalid bulletin time "${time}", expected HH:MM`);
  }
  return [Number(match[1]), Number(match[2])];
}

/** The bulletins published on an Istanbul calendar date, in time order. */
export function bulletinsOn(
  date: LocalDate,
  slots: readonly BulletinSlot[] = BULLETIN_SLOTS,
): ScheduledBulletin[] {
  return slots
    .filter((slot) => slotRunsOn(slot, date))
    .map((slot) => ({ slot, publishAt: istanbulTimeToInstant(date, slot.time) }))
    .sort((a, b) => a.publishAt.getTime() - b.publishAt.getTime());
}

/** The first bulletin published strictly after `now`. */
export function nextBulletin(
  now: Date,
  slots: readonly BulletinSlot[] = BULLETIN_SLOTS,
): ScheduledBulletin {
  // Looking 7 days ahead covers every schedule, including weekday-only ones.
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = istanbulDateOf(new Date(now.getTime() + offset * MS_PER_DAY));
    const upcoming = bulletinsOn(date, slots).find((b) => b.publishAt > now);
    if (upcoming) {
      return upcoming;
    }
  }
  throw new Error('The schedule has no bulletin slots');
}

/** The most recent bulletin due at or before `now`: the one that should be published by now. */
export function lastDueBulletin(
  now: Date,
  slots: readonly BulletinSlot[] = BULLETIN_SLOTS,
): ScheduledBulletin {
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = istanbulDateOf(new Date(now.getTime() - offset * MS_PER_DAY));
    const due = bulletinsOn(date, slots)
      .filter((b) => b.publishAt <= now)
      .at(-1);
    if (due) {
      return due;
    }
  }
  throw new Error('The schedule has no bulletin slots');
}

/** Minutes between Hot News checks: every 2 minutes on weekdays, every 4 on weekends. */
export function hotNewsIntervalMinutes(now: Date): number {
  return isWeekend(istanbulDateOf(now)) ? 4 : 2;
}
