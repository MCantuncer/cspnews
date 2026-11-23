import type { HotFeed, HotSource, HotStory, Language } from '@cspnews/core';

/**
 * Hot News on the client: the static pages read the Hot News feed and show the newest story as
 * one quiet line. The feed is built every ten minutes by the Hot News workflow
 * (.github/workflows/hot-news.yml) and kept on the `hot-feed` branch, so the site needs no
 * rebuild to change it; `PUBLIC_HOT_FEED_URL` points the build at another place, such as a
 * Worker, without any other change. A dismissed story stays hidden until
 * it is updated. Everything fails quietly: no feed means no line.
 */
const DEFAULT_FEED = 'https://raw.githubusercontent.com/MCantuncer/cspnews/hot-feed/hot.json';

/** Read through a plain type, so linting doesn't depend on Astro's generated env types. */
function feedUrl(): string {
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const value = env?.PUBLIC_HOT_FEED_URL;
  return typeof value === 'string' && value !== '' ? value : DEFAULT_FEED;
}

export const HOT_FEED_URL = feedUrl();
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

/** An outlet's headline as a reader of one language sees it. */
export interface LocalHotSource extends HotSource {
  /** The language `title` is in, when known. */
  readonly titleLanguage?: Language;
  /** True when `title` is a machine translation of the outlet's headline. */
  readonly machineTranslated: boolean;
}

/** A hot story as a reader of one language sees it. */
export interface LocalHotStory extends Omit<HotStory, 'sources'> {
  /** The language of `title`, `shortTitle` and `summary`. */
  readonly textLanguage: Language;
  /** True when the headline is a machine translation. */
  readonly machineTranslated: boolean;
  /** The language of `summary`: it stays in the outlet's words when it has no translation. */
  readonly summaryLanguage: Language;
  readonly sources: readonly LocalHotSource[];
}

/**
 * A hot story in the reader's language: the outlet's own words when it wrote in that language,
 * otherwise the machine translation, and the original when there is none. With `original` the
 * outlets' own words are always given, for a reader who asked to see them.
 */
export function hotStoryIn(
  story: HotStory,
  language: Language,
  { original = false }: { original?: boolean } = {},
): LocalHotStory {
  const translation =
    !original && story.language !== language && story.translation?.language === language
      ? story.translation
      : undefined;
  const sources = story.sources.map((source): LocalHotSource => {
    const titleLanguage = source.language ?? story.language;
    const translate = !original && titleLanguage !== language && source.translatedTitle;
    return translate
      ? {
          ...source,
          title: source.translatedTitle,
          titleLanguage: language,
          machineTranslated: true,
        }
      : { ...source, titleLanguage, machineTranslated: false };
  });
  if (!translation) {
    return {
      ...story,
      textLanguage: story.language,
      machineTranslated: false,
      summaryLanguage: story.language,
      sources,
    };
  }
  const { summary, ...rest } = story;
  return {
    ...rest,
    title: translation.title,
    shortTitle: translation.shortTitle,
    ...(summary
      ? { summary: translation.summary ? { ...summary, text: translation.summary } : summary }
      : {}),
    textLanguage: language,
    machineTranslated: true,
    summaryLanguage: translation.summary ? language : story.language,
    sources,
  };
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

export type HotPageState = 'story' | 'quiet' | 'gone';

/**
 * What the Hot News page shows for a feed and the `?id=` it was opened with. With no id it
 * shows the newest story, or says that nothing is breaking; a story that has left the feed
 * is "gone", which is different from there being no news.
 */
export function hotPageStory(
  feed: HotFeed,
  id: string | null,
): { state: HotPageState; story?: HotStory } {
  if (id) {
    const story = feed.stories.find((candidate) => candidate.id === id);
    return story ? { state: 'story', story } : { state: 'gone' };
  }
  const [newest] = [...feed.stories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return newest ? { state: 'story', story: newest } : { state: 'quiet' };
}

/** Other stories in the feed, newest first, for the "Also breaking" list. */
export function otherHotStories(feed: HotFeed, id: string): HotStory[] {
  return [...feed.stories]
    .filter((story) => story.id !== id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const MEDIA_FILE = /^[a-z0-9-]+\.(?:jpg|png|webp|avif)$/;

/**
 * The address of a hot story's photo: the monitor saves it next to the feed, in `media/`, so it
 * is never hot-linked from the outlet. Undefined for a name that isn't a plain photo file.
 */
export function hotPhotoUrl(file: string, feedUrl = HOT_FEED_URL): string | undefined {
  if (!MEDIA_FILE.test(file)) return undefined;
  try {
    return new URL(`media/${file}`, feedUrl).href;
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
