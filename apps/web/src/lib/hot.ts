import type { HotFeed, HotStory } from '@cspnews/core';

/**
 * Hot News on the client: the static pages read `/hot.json` (served next to the site by the
 * monitor) and show the newest story as one quiet line. A dismissed story stays hidden until
 * it is updated. Everything fails quietly: no feed means no line.
 */
export const HOT_FEED_URL = '/hot.json';
export const POLL_MINUTES = 2;
const DISMISSED_KEY = 'cspnews:hot-dismissed';

/** Story id to the `updatedAt` the reader dismissed. */
export type Dismissed = Record<string, string>;

/** The story to show: the newest one the reader has not dismissed in its current version. */
export function pickHotStory(feed: HotFeed, dismissed: Dismissed): HotStory | undefined {
  return [...feed.stories]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((story) => dismissed[story.id] !== story.updatedAt);
}

export function readDismissed(storage: Pick<Storage, 'getItem'> | undefined): Dismissed {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(DISMISSED_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/** Remembers a dismissal, keeping only stories still in the feed. */
export function dismiss(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
  story: HotStory,
  feed: HotFeed,
) {
  try {
    const live = new Set(feed.stories.map((s) => s.id));
    const kept = Object.entries(readDismissed(storage)).filter(([id]) => live.has(id));
    kept.push([story.id, story.updatedAt]);
    storage?.setItem(DISMISSED_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Without storage the line simply comes back on the next page.
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const isTime = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isHotStory(value: unknown): value is HotStory {
  if (!isRecord(value)) return false;
  const { id, language, shortTitle, title, label, firstSeenAt, updatedAt, sources, timeline } =
    value;
  return (
    typeof id === 'string' &&
    SLUG.test(id) &&
    (language === 'tr' || language === 'en') &&
    isText(shortTitle, 60) &&
    isText(title, 160) &&
    (label === 'confirmed' || label === 'reported') &&
    isTime(firstSeenAt) &&
    isTime(updatedAt) &&
    Array.isArray(sources) &&
    sources.length >= 2 &&
    sources.every((s) => isRecord(s) && isText(s.sourceId, 64) && typeof s.url === 'string') &&
    Array.isArray(timeline) &&
    timeline.every((e) => isRecord(e) && typeof e.kind === 'string' && isTime(e.at))
  );
}

/**
 * Checks the fields the page uses. The monitor validates the feed with HotFeedSchema before it
 * publishes; this lighter check keeps the schema library out of every page's script.
 */
export function isHotFeed(value: unknown): value is HotFeed {
  if (!isRecord(value)) return false;
  const { version, stories } = value;
  return (
    version === 1 && Array.isArray(stories) && stories.length <= 10 && stories.every(isHotStory)
  );
}

/** Fetches and validates the feed; undefined when it is missing or malformed. */
export async function loadHotFeed(url = HOT_FEED_URL): Promise<HotFeed | undefined> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return undefined;
    const feed: unknown = await response.json();
    return isHotFeed(feed) ? feed : undefined;
  } catch {
    return undefined;
  }
}

/** Only https links from the feed are ever followed. */
export function safeUrl(url: string): string | undefined {
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

export function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
