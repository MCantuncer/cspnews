import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { describeEmptyPart, emptyParts } from './parts.js';
import { parseBulletin, type Bulletin, type WrittenStory } from './story.js';

const FULL = parseBulletin(
  JSON.parse(
    readFileSync(
      new URL('../../../apps/web/fixtures/bulletins/2026-11-11-evening.json', import.meta.url),
      'utf8',
    ),
  ),
);

/** The story without the named parts of each version, and optionally without its photo. */
function strip(story: WrittenStory, parts: readonly string[], photo = true): WrittenStory {
  const bare = (version: object) =>
    Object.fromEntries(Object.entries(version).filter(([key]) => !parts.includes(key)));
  const { image, ...rest } = story;
  return {
    ...rest,
    ...(photo && image ? { image } : {}),
    versions: { en: bare(story.versions.en), tr: bare(story.versions.tr) },
  } as WrittenStory;
}

const [first] = FULL.stories;
if (!first) throw new Error('The fixture has no stories');
const one = (story: WrittenStory, extra: Partial<Bulletin> = {}): Bulletin => ({
  version: 2,
  slot: FULL.slot,
  publishAt: FULL.publishAt,
  writtenAt: FULL.writtenAt,
  stories: [story],
  ...extra,
});

describe('emptyParts', () => {
  it('names a story with no facts', () => {
    const empty = emptyParts(one(strip(first, ['facts'])), {});
    expect(empty).toEqual([
      { where: { story: first.id, title: first.versions.en.shortTitle }, part: 'facts' },
    ]);
  });

  it('names a story with no photo, chart or map', () => {
    const bare = strip(first, ['keyNumber', 'place'], false);
    expect(emptyParts(one(bare), {}).map((part) => part.part)).toContain('visual');
    const mapped = {
      ...bare.versions.en,
      place: { name: 'Doha', lat: 25.29, lon: 51.53, region: 'Qatar' },
    };
    const withMap = { ...bare, versions: { en: mapped, tr: mapped } } as WrittenStory;
    expect(emptyParts(one(withMap), {}).map((part) => part.part)).not.toContain('visual');
  });

  it('names every missing desk when the candidates are not known', () => {
    const desks = emptyParts(one(first)).filter((part) => part.part === 'desk');
    expect(desks.map((part) => part.where)).toEqual([
      { desk: 'light' },
      { desk: 'transfers' },
      { desk: 'abroad' },
    ]);
  });

  it('names only the desks that had candidates, with how many', () => {
    const desks = emptyParts(one(first), { light: 12, transfers: 0 }).filter(
      (part) => part.part === 'desk',
    );
    expect(desks).toEqual([{ where: { desk: 'light' }, part: 'desk', candidates: 12 }]);
  });
});

describe('describeEmptyPart', () => {
  it('writes one plain line per part', () => {
    expect(describeEmptyPart({ where: { desk: 'light' }, part: 'desk', candidates: 12 })).toBe(
      'Spotlight (andFinally.light) is missing although the desk had 12 candidates.',
    );
    expect(
      describeEmptyPart({ where: { story: 'abc', title: 'Rates cut again' }, part: 'facts' }),
    ).toBe('"Rates cut again" (abc) has no facts.');
  });
});
