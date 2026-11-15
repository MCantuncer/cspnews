/**
 * The week line on the caught-up screen: the seven days of the bulletin's week, Monday first,
 * with a mark on the days the reader finished a bulletin. Finished days are remembered in this
 * browser only; storage can be unavailable (private mode): then no day is marked and the page
 * still works.
 */
const STORAGE_KEY = 'cspnews:finished';
const LIMIT = 60;

/** The seven `yyyy-mm-dd` dates of the week that holds `date`, Monday first. */
export function weekOf(date: string): string[] {
  const day = new Date(`${date}T12:00:00Z`);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(day.getTime() + (index - sinceMonday) * 86_400_000);
    return next.toISOString().slice(0, 10);
  });
}

export function finishedDays(storage: Pick<Storage, 'getItem'> | undefined): Set<string> {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

/** Remembers that the reader reached the end of a bulletin on this day. */
export function markFinished(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
  date: string,
) {
  try {
    const days = [...finishedDays(storage)].filter((d) => d !== date);
    days.push(date);
    storage?.setItem(STORAGE_KEY, JSON.stringify(days.sort().slice(-LIMIT)));
  } catch {
    // Nothing to do: the screen works without the memory.
  }
}

/** On the caught-up screen: records today's finish, then marks the days finished this week. */
export function showWeek(root: ParentNode) {
  const line = root.querySelector<HTMLElement>('[data-week]');
  if (!line) return;
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  const today = line.dataset.today ?? '';
  markFinished(storage, today);
  const done = finishedDays(storage);
  let count = 0;
  for (const day of line.querySelectorAll<HTMLElement>('[data-day]')) {
    if (done.has(day.dataset.day ?? '')) {
      day.dataset.done = 'true';
      count += 1;
    }
  }
  const total = line.querySelector('[data-week-count]');
  if (total) total.textContent = String(count);
  line.hidden = false;
}
