/**
 * Followed stories, remembered in this browser only (docs/design/system.md, "Follow"). For each
 * one we keep what the reader last saw: its outlets, its evidence label and when it was last
 * updated. The next bulletin that carries the same story compares against that and says what
 * moved. Storage can be unavailable (private mode, blocked site data): then following simply
 * does nothing and every page still works.
 */
import type { EvidenceLabel } from './evidence.js';

const STORAGE_KEY = 'cspnews:follow';
/** Enough for anyone; the oldest are dropped first. */
const LIMIT = 40;
/** A story nobody has looked at for this long is no longer followed. */
const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** What the reader saw of a followed story, the last time they read it. */
export interface Seen {
  readonly id: string;
  readonly label: EvidenceLabel;
  readonly sources: readonly string[];
  readonly updatedAt: string;
  readonly seenAt: string;
}

/** A story as a bulletin carries it now, with everything needed to describe a change. */
export interface StoryNow {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly section: string;
  readonly label: EvidenceLabel;
  readonly labelWord: string;
  readonly sources: readonly { readonly id: string; readonly name: string }[];
  readonly updatedAt: string;
}

export type Change =
  | { readonly kind: 'joined'; readonly names: readonly string[]; readonly total: number }
  | { readonly kind: 'label'; readonly word: string }
  | { readonly kind: 'updated'; readonly at: string };

function isSeen(value: unknown): value is Seen {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    Array.isArray(v.sources) &&
    v.sources.every((s) => typeof s === 'string') &&
    typeof v.updatedAt === 'string' &&
    typeof v.seenAt === 'string'
  );
}

/** Followed stories, oldest first, without any that expired by `now`. */
export function followed(storage: Storage | undefined, now = Date.now()): Seen[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSeen).filter((s) => now - Date.parse(s.seenAt) < EXPIRE_MS);
  } catch {
    return [];
  }
}

function save(storage: Storage | undefined, list: readonly Seen[]) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(list.slice(-LIMIT)));
  } catch {
    // Nothing to do: reading still works without the memory.
  }
}

export function isFollowed(storage: Storage | undefined, id: string): boolean {
  return followed(storage).some((s) => s.id === id);
}

/** The snapshot of a story as the reader sees it at `at`. */
export function seenNow(
  story: Pick<StoryNow, 'id' | 'label' | 'sources' | 'updatedAt'>,
  at: Date,
): Seen {
  return {
    id: story.id,
    label: story.label,
    sources: story.sources.map((s) => s.id),
    updatedAt: story.updatedAt,
    seenAt: at.toISOString(),
  };
}

export function follow(storage: Storage | undefined, seen: Seen) {
  save(storage, [...followed(storage).filter((s) => s.id !== seen.id), seen]);
}

export function unfollow(storage: Storage | undefined, id: string) {
  save(
    storage,
    followed(storage).filter((s) => s.id !== id),
  );
}

/** Reading a followed story again: what the reader saw is now this. Others are left alone. */
export function markSeen(storage: Storage | undefined, seen: Seen) {
  const list = followed(storage);
  if (!list.some((s) => s.id === seen.id)) return;
  save(
    storage,
    list.map((s) => (s.id === seen.id ? seen : s)),
  );
}

/** What moved in a story since the reader last saw it, most telling first. */
export function changesSince(seen: Seen, now: StoryNow): Change[] {
  const changes: Change[] = [];
  const before = new Set(seen.sources);
  const joined = now.sources.filter((s) => !before.has(s.id)).map((s) => s.name);
  if (now.label !== seen.label) changes.push({ kind: 'label', word: now.labelWord });
  if (joined.length > 0) changes.push({ kind: 'joined', names: joined, total: now.sources.length });
  if (changes.length === 0 && Date.parse(now.updatedAt) > Date.parse(seen.updatedAt)) {
    changes.push({ kind: 'updated', at: now.updatedAt });
  }
  return changes;
}

/** Followed stories in this bulletin that moved since they were read, in follow order. */
export function movedStories(
  list: readonly Seen[],
  stories: readonly StoryNow[],
): { story: StoryNow; changes: Change[] }[] {
  const byId = new Map(stories.map((s) => [s.id, s]));
  return list.flatMap((seen) => {
    const story = byId.get(seen.id);
    if (!story) return [];
    const changes = changesSince(seen, story);
    return changes.length > 0 ? [{ story, changes }] : [];
  });
}

export function safeStorage(): globalThis.Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
