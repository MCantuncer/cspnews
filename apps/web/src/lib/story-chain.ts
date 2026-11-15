import type { WrittenStory } from '@cspnews/core';

import type { PublishedBulletin } from './bulletins.js';

/**
 * Stories that continue earlier ones (docs/design/decisions/story-so-far.md). A story names the
 * earlier story it continues in `continues`; following those names back gives "The story so
 * far", and the other way round gives the newer report an old page links to.
 */
export interface ChainEntry {
  readonly published: PublishedBulletin;
  readonly story: WrittenStory;
}

/** Every story of every bulletin, by id. A bulletin may not repeat an id of another one. */
function storiesById(bulletins: readonly PublishedBulletin[]): Map<string, ChainEntry> {
  const byId = new Map<string, ChainEntry>();
  for (const published of bulletins) {
    for (const story of published.bulletin.stories) byId.set(story.id, { published, story });
  }
  return byId;
}

/**
 * What is wrong with the chains, one sentence each: a story that continues something that was
 * not published earlier, or two stories that continue the same one. The build stops on any of
 * them, because a wrong link would send a reader to the wrong story.
 */
export function chainProblems(bulletins: readonly PublishedBulletin[]): string[] {
  const byId = storiesById(bulletins);
  const continuedBy = new Map<string, string>();
  const problems: string[] = [];
  for (const published of bulletins) {
    for (const story of published.bulletin.stories) {
      const name = `${published.date}/${published.slot} story ${story.id}`;
      if (story.continues === undefined) continue;
      const earlier = byId.get(story.continues);
      if (!earlier) {
        problems.push(`${name} continues ${story.continues}, which is not in any bulletin`);
      } else if (earlier.published.bulletin.publishAt >= published.bulletin.publishAt) {
        problems.push(`${name} continues ${story.continues}, which was not published earlier`);
      }
      const rival = continuedBy.get(story.continues);
      if (rival) problems.push(`${name} and ${rival} both continue ${story.continues}`);
      continuedBy.set(story.continues, name);
    }
  }
  return problems;
}

/** The earlier versions of a story, oldest first. */
export function earlierVersions(
  bulletins: readonly PublishedBulletin[],
  story: Pick<WrittenStory, 'id' | 'continues'>,
): ChainEntry[] {
  const byId = storiesById(bulletins);
  const chain: ChainEntry[] = [];
  const seen = new Set<string>([story.id]);
  for (let id = story.continues; id !== undefined && !seen.has(id);) {
    const entry = byId.get(id);
    if (!entry) break;
    chain.unshift(entry);
    seen.add(id);
    id = entry.story.continues;
  }
  return chain;
}

/** The report that continues this story, when a later bulletin has one. */
export function newerVersion(
  bulletins: readonly PublishedBulletin[],
  story: Pick<WrittenStory, 'id'>,
): ChainEntry | undefined {
  for (const published of bulletins) {
    const newer = published.bulletin.stories.find((candidate) => candidate.continues === story.id);
    if (newer) return { published, story: newer };
  }
  return undefined;
}

/** The ids of every earlier version of a story, so a reader who follows one follows this too. */
export function earlierIds(
  bulletins: readonly PublishedBulletin[],
  story: Pick<WrittenStory, 'id' | 'continues'>,
): string[] {
  return earlierVersions(bulletins, story).map((entry) => entry.story.id);
}
