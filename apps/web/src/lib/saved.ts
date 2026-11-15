/**
 * Saved stories (docs/design/decisions/saved-and-archive.md): a reading list kept in this
 * browser only. Each entry keeps the story's title and address in both languages, so the list
 * can be drawn in the reader's language without loading anything. Storage can be unavailable
 * (private mode, blocked site data): then saving does nothing and every page still works.
 */
const STORAGE_KEY = 'cspnews:saved';
const LIMIT = 100;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export interface SavedVersion {
  readonly title: string;
  readonly href: string;
}

export interface SavedStory {
  readonly id: string;
  readonly section: string;
  /** Istanbul date of the bulletin the story was saved from, `yyyy-mm-dd`. */
  readonly date: string;
  readonly savedAt: string;
  readonly en: SavedVersion;
  readonly tr: SavedVersion;
}

const isVersion = (value: unknown): value is SavedVersion =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).title === 'string' &&
  typeof (value as Record<string, unknown>).href === 'string';

function isSaved(value: unknown): value is SavedStory {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.section === 'string' &&
    typeof v.date === 'string' &&
    typeof v.savedAt === 'string' &&
    isVersion(v.en) &&
    isVersion(v.tr)
  );
}

/** Saved stories, newest first. */
export function savedStories(storage: Pick<Storage, 'getItem'> | undefined): SavedStory[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return [];
  }
}

export function isStorySaved(storage: Pick<Storage, 'getItem'> | undefined, id: string): boolean {
  return savedStories(storage).some((story) => story.id === id);
}

function write(storage: Storage | undefined, stories: readonly SavedStory[]) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stories.slice(0, LIMIT)));
  } catch {
    // Nothing to do: reading still works without the list.
  }
}

/** Saves a story at the top of the list; saving it again moves it back to the top. */
export function saveStory(storage: Storage | undefined, story: SavedStory) {
  write(storage, [story, ...savedStories(storage).filter((other) => other.id !== story.id)]);
}

export function unsaveStory(storage: Storage | undefined, id: string) {
  write(
    storage,
    savedStories(storage).filter((story) => story.id !== id),
  );
}
