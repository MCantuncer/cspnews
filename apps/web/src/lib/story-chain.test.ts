import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readBulletinFile, type PublishedBulletin } from './bulletins.js';
import { chainProblems, earlierIds, earlierVersions, newerVersion } from './story-chain.js';

const SAMPLE = fileURLToPath(
  new URL('../../fixtures/bulletins/2026-11-11-evening.json', import.meta.url),
);

/** The sample bulletin republished as another slot, its first story continuing `continues`. */
function copy(slot: string, publishAt: string, idSuffix: string, continues?: string) {
  const json = JSON.parse(readFileSync(SAMPLE, 'utf8')) as {
    slot: string;
    publishAt: string;
    stories: {
      id: string;
      continues?: string;
      versions: Record<'en' | 'tr', { news?: string }>;
    }[];
  };
  json.slot = slot;
  json.publishAt = publishAt;
  json.stories = json.stories.slice(0, 1).map((story) => {
    story.id = `${story.id}${idSuffix}`;
    if (continues) {
      story.continues = continues;
      story.versions.en.news = 'The bank also raised its forecast.';
      story.versions.tr.news = 'Banka tahminini de yükseltti.';
    }
    return story;
  });
  return readBulletinFile(
    `2026-11-1${slot === 'evening' ? '1' : '2'}-${slot}.json`,
    JSON.stringify(json),
  );
}

/** The only story of a one-story bulletin. */
function only(published: PublishedBulletin) {
  const [story] = published.bulletin.stories;
  if (!story) throw new Error('The bulletin has no story');
  return story;
}

const base = copy('evening', '2026-11-11T18:30:00+03:00', '');
const first = only(base).id;
const second = copy('morning', '2026-11-12T07:30:00+03:00', 'b', first);
const third = copy('midday', '2026-11-12T12:30:00+03:00', 'c', only(second).id);
const newestFirst = (...list: PublishedBulletin[]) =>
  [...list].sort((a, b) => b.bulletin.publishAt.localeCompare(a.bulletin.publishAt));

describe('story chains', () => {
  const all = newestFirst(base, second, third);

  it('finds the earlier versions, oldest first, and the newer one', () => {
    const last = only(third);
    expect(earlierVersions(all, last).map((entry) => entry.story.id)).toEqual([
      first,
      only(second).id,
    ]);
    expect(earlierIds(all, last)).toHaveLength(2);
    expect(newerVersion(all, only(base))?.story.id).toBe(only(second).id);
    expect(newerVersion(all, last)).toBeUndefined();
  });

  it('has no earlier versions for a story that continues nothing', () => {
    expect(earlierVersions(all, only(base))).toEqual([]);
  });

  it('accepts a sound chain', () => {
    expect(chainProblems(all)).toEqual([]);
  });

  it('rejects a link to a story that does not exist', () => {
    const lost = copy('morning', '2026-11-12T07:30:00+03:00', 'b', 'nope');
    expect(chainProblems(newestFirst(base, lost))[0]).toMatch(/not in any bulletin/);
  });

  it('rejects a link to a story that was not published earlier', () => {
    const early = copy('morning', '2026-11-10T07:30:00+03:00', 'b', first);
    expect(chainProblems(newestFirst(base, early))[0]).toMatch(/not published earlier/);
  });

  it('rejects two stories that continue the same one', () => {
    const rival = copy('midday', '2026-11-12T12:30:00+03:00', 'c', first);
    expect(chainProblems(newestFirst(base, second, rival)).join()).toMatch(/both continue/);
  });
});
