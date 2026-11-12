import { describe, expect, it } from 'vitest';

import {
  bulletinsOn,
  hotNewsIntervalMinutes,
  istanbulDateOf,
  isWeekend,
  lastDueBulletin,
  nextBulletin,
} from './schedule.js';

// 2026-11-11 is a Wednesday; 2026-11-14 is a Saturday.
const WEDNESDAY = { year: 2026, month: 11, day: 11 };
const SATURDAY = { year: 2026, month: 11, day: 14 };

describe('istanbulDateOf', () => {
  it('uses the Istanbul date, not the UTC date', () => {
    // 22:30 UTC on the 10th is 01:30 on the 11th in Istanbul.
    expect(istanbulDateOf(new Date('2026-11-10T22:30:00Z'))).toEqual(WEDNESDAY);
  });
});

describe('isWeekend', () => {
  it('knows weekdays from weekends', () => {
    expect(isWeekend(WEDNESDAY)).toBe(false);
    expect(isWeekend(SATURDAY)).toBe(true);
    expect(isWeekend({ year: 2026, month: 11, day: 15 })).toBe(true);
  });
});

describe('bulletinsOn', () => {
  it('publishes 4 bulletins on weekdays, at Istanbul times', () => {
    const bulletins = bulletinsOn(WEDNESDAY);
    expect(bulletins.map((b) => b.slot.id)).toEqual(['morning', 'midday', 'evening', 'late']);
    expect(bulletins.map((b) => b.publishAt.toISOString())).toEqual([
      '2026-11-11T04:30:00.000Z',
      '2026-11-11T09:30:00.000Z',
      '2026-11-11T15:30:00.000Z',
      '2026-11-11T19:30:00.000Z',
    ]);
  });

  it('publishes only the 2 main bulletins on weekends', () => {
    const bulletins = bulletinsOn(SATURDAY);
    expect(bulletins.map((b) => b.slot.id)).toEqual(['morning', 'evening']);
    expect(bulletins.every((b) => b.slot.kind === 'main')).toBe(true);
  });

  it('rejects a malformed slot time', () => {
    expect(() =>
      bulletinsOn(WEDNESDAY, [{ id: 'bad', time: '7:30', kind: 'main', days: 'every-day' }]),
    ).toThrow(/Invalid bulletin time/);
  });
});

describe('nextBulletin', () => {
  it('finds the next bulletin later the same day', () => {
    const next = nextBulletin(new Date('2026-11-11T08:00:00Z')); // 11:00 Istanbul
    expect(next.slot.id).toBe('midday');
  });

  it('is strictly after now', () => {
    const next = nextBulletin(new Date('2026-11-11T04:30:00Z')); // exactly 07:30 Istanbul
    expect(next.slot.id).toBe('midday');
  });

  it('rolls over to the next morning after the late bulletin', () => {
    const next = nextBulletin(new Date('2026-11-11T20:00:00Z')); // 23:00 Istanbul
    expect(next.slot.id).toBe('morning');
    expect(next.publishAt.toISOString()).toBe('2026-11-12T04:30:00.000Z');
  });

  it('skips side bulletins on weekends', () => {
    const next = nextBulletin(new Date('2026-11-14T05:00:00Z')); // Saturday 08:00 Istanbul
    expect(next.slot.id).toBe('evening');
  });

  it('works for a weekday-only schedule over a weekend', () => {
    const next = nextBulletin(new Date('2026-11-14T05:00:00Z'), [
      { id: 'weekday', time: '09:00', kind: 'side', days: 'weekdays' },
    ]);
    expect(next.publishAt.toISOString()).toBe('2026-11-16T06:00:00.000Z'); // Monday
  });

  it('fails clearly on an empty schedule', () => {
    expect(() => nextBulletin(new Date('2026-11-11T08:00:00Z'), [])).toThrow(/no bulletin slots/);
  });
});

describe('hotNewsIntervalMinutes', () => {
  it('checks every 2 minutes on weekdays and every 4 on weekends', () => {
    expect(hotNewsIntervalMinutes(new Date('2026-11-11T12:00:00Z'))).toBe(2);
    expect(hotNewsIntervalMinutes(new Date('2026-11-14T12:00:00Z'))).toBe(4);
  });
});

describe('lastDueBulletin', () => {
  it('is the slot whose time has just passed', () => {
    // 22:50 in Istanbul on a Wednesday: the late bulletin was due at 22:30.
    const due = lastDueBulletin(new Date('2026-11-11T19:50:00Z'));
    expect(due.slot.id).toBe('late');
    expect(due.publishAt.toISOString()).toBe('2026-11-11T19:30:00.000Z');
  });

  it('counts a bulletin as due at its exact time', () => {
    expect(lastDueBulletin(new Date('2026-11-11T15:30:00Z')).slot.id).toBe('evening');
  });

  it('reaches back to the previous day before the morning bulletin', () => {
    // 06:00 in Istanbul on Thursday: the last one due was Wednesday's late bulletin.
    const due = lastDueBulletin(new Date('2026-11-12T03:00:00Z'));
    expect(due.slot.id).toBe('late');
    expect(istanbulDateOf(due.publishAt)).toEqual(WEDNESDAY);
  });

  it('skips the side bulletins at the weekend', () => {
    // 12:50 in Istanbul on a Saturday: no midday bulletin, so the morning one is the last due.
    expect(lastDueBulletin(new Date('2026-11-14T09:50:00Z')).slot.id).toBe('morning');
  });
});
