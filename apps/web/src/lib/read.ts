/**
 * Stories the reader has opened, remembered in this browser only. Contents folds them into one
 * line per section. Storage can be unavailable (private mode, blocked site data): then nothing
 * folds and the page still works.
 */
const STORAGE_KEY = 'cspnews:read';
const LIMIT = 400;

/** Read story keys, oldest first. */
function recentReads(storage: Pick<Storage, 'getItem'> | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function readStories(storage: Pick<Storage, 'getItem'> | undefined): Set<string> {
  return new Set(recentReads(storage));
}

/** Remembers a story as read, keeping only the most recent ones. */
export function markRead(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined, key: string) {
  try {
    const keys = [...readStories(storage)].filter((k) => k !== key);
    keys.push(key);
    storage?.setItem(STORAGE_KEY, JSON.stringify(keys.slice(-LIMIT)));
  } catch {
    // Nothing to do: reading still works without the memory.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** On a Contents list, hides read stories behind one "N read" line per section. */
export function foldReadStories(root: ParentNode) {
  const read = readStories(safeStorage());
  for (const nav of root.querySelectorAll<HTMLElement>('[data-contents]')) {
    const tr = nav.getAttribute('data-lang') === 'tr';
    for (const list of nav.querySelectorAll<HTMLElement>('.stories')) {
      const rows = [...list.querySelectorAll<HTMLElement>('[data-read-key]')].filter(
        (row) =>
          read.has(row.getAttribute('data-read-key') ?? '') &&
          !row.querySelector('[aria-current="page"]'),
      );
      const fold = list.querySelector<HTMLElement>('.fold');
      const button = fold?.querySelector('button');
      const count = fold?.querySelector('.fold-count');
      if (rows.length === 0 || !fold || !button || !count) continue;
      count.textContent = `${String(rows.length)} ${tr ? 'okundu' : 'read'}`;
      fold.hidden = false;
      for (const row of rows) row.hidden = true;
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open));
        for (const row of rows) row.hidden = !open;
      });
    }
  }
}

/** On a story page, remembers the story as read. */
export function rememberStory(key: string) {
  markRead(safeStorage(), key);
}

/**
 * The story to pick up from: the first unread story after the one read most recently, in
 * Contents order, or else the first unread one. Undefined when nothing, or everything, is read.
 */
export function resumeIndex(
  keys: readonly string[],
  recent: readonly string[],
): number | undefined {
  const read = new Set(recent);
  const last = keys.reduce(
    (best, key, i) => {
      const at = recent.indexOf(key);
      return at > best.at ? { at, i } : best;
    },
    { at: -1, i: -1 },
  );
  if (last.i < 0) return undefined;
  const after = keys.findIndex((key, i) => i > last.i && !read.has(key));
  if (after >= 0) return after;
  const first = keys.findIndex((key) => !read.has(key));
  return first >= 0 ? first : undefined;
}

/** On a Contents screen, offers the story to continue from, once the reader has started. */
export function showResume(root: ParentNode) {
  const link = root.querySelector<HTMLAnchorElement>('[data-resume]');
  if (!link) return;
  const rows = [...root.querySelectorAll<HTMLElement>('[data-contents] [data-read-key]')];
  const keys = rows.map((row) => row.getAttribute('data-read-key') ?? '');
  const index = resumeIndex(keys, recentReads(safeStorage()));
  const row = index === undefined ? undefined : rows[index];
  const target = row?.querySelector('a');
  const title = row?.querySelector('.title')?.textContent;
  const slot = link.querySelector('[data-resume-title]');
  if (!target || !title || !slot) return;
  link.href = target.href;
  slot.textContent = title;
  link.hidden = false;
}
