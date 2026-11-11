import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parseBulletin, type Bulletin, type WrittenStory } from '@cspnews/core';

/**
 * Published bulletins, read at build time. Each file is `<yyyy-mm-dd>-<slot>.json`, as the
 * Verify and Write run saves it. A file that fails validation stops the build: a broken
 * bulletin must never be published half-rendered.
 */
export interface PublishedBulletin {
  /** Istanbul date of the bulletin, `yyyy-mm-dd`. */
  readonly date: string;
  readonly slot: string;
  readonly bulletin: Bulletin;
}

const FILE_NAME = /^(\d{4}-\d{2}-\d{2})-([a-z]+)\.json$/;

/** Where bulletins are read from: `CSPNEWS_BULLETINS`, or `data/bulletins` at the repository root. */
export function bulletinsDirectory(): string {
  const { CSPNEWS_BULLETINS } = process.env;
  return resolve(CSPNEWS_BULLETINS ?? resolve(process.cwd(), '../../data/bulletins'));
}

/** Validates one bulletin file; the file name must match the slot inside it. */
export function readBulletinFile(fileName: string, contents: string): PublishedBulletin {
  const match = FILE_NAME.exec(fileName);
  if (!match?.[1] || !match[2]) {
    throw new Error(`${fileName}: bulletin files are named <yyyy-mm-dd>-<slot>.json`);
  }
  const bulletin = parseBulletin(JSON.parse(contents));
  if (bulletin.slot !== match[2]) {
    throw new Error(`${fileName}: the file says slot "${bulletin.slot}"`);
  }
  return { date: match[1], slot: match[2], bulletin };
}

/** Every published bulletin, newest first. A missing directory means nothing is published yet. */
export function loadBulletins(directory = bulletinsDirectory()): PublishedBulletin[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readBulletinFile(name, readFileSync(join(directory, name), 'utf8')))
    .sort((a, b) => b.bulletin.publishAt.localeCompare(a.bulletin.publishAt));
}

/** The URL of a bulletin: `/2026-11-11/evening`. */
export function bulletinPath(published: PublishedBulletin): string {
  return `/${published.date}/${published.slot}`;
}

/** The URL of one story: `/2026-11-11/evening/<story id>`. */
export function storyPath(published: PublishedBulletin, story: WrittenStory): string {
  return `${bulletinPath(published)}/${encodeURIComponent(story.id)}`;
}

const WORDS_PER_MINUTE = 230;

/** Minutes to read every story in full, rounded up. */
export function readingMinutes(published: PublishedBulletin): number {
  const words = published.bulletin.stories
    .flatMap((story) => story.body.flatMap((section) => section.blocks))
    .map((block) => ('text' in block ? block.text : block.quote))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.ceil(words / WORDS_PER_MINUTE);
}

/** Stories grouped by section, in reading order, keeping each story's place in the bulletin. */
export function storiesBySection(
  published: PublishedBulletin,
): { section: WrittenStory['section']; stories: { story: WrittenStory; index: number }[] }[] {
  const groups: ReturnType<typeof storiesBySection> = [];
  published.bulletin.stories.forEach((story, index) => {
    const last = groups.at(-1);
    if (last?.section === story.section) last.stories.push({ story, index });
    else groups.push({ section: story.section, stories: [{ story, index }] });
  });
  return groups;
}

/** The key the reader's browser uses to remember a story as read. */
export function readKey(published: PublishedBulletin, story: WrittenStory): string {
  return `${published.date}/${published.slot}/${story.id}`;
}
