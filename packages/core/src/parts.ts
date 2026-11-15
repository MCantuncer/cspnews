import { DESKS, type Desk } from './sections.js';
import type { Bulletin, WrittenStory } from './story.js';

/**
 * The optional parts of a bulletin that the Write run left empty (docs/publishing.md, "Filling
 * every part"). An empty part is not an error: some news has no number worth a fact, and some
 * hours have no Spotlight story. But the site is built around these parts, so every empty one is
 * named here for the writer to fill or to explain.
 */
export interface EmptyPart {
  /** The story the part belongs to, or the desk for a part of the bulletin itself. */
  readonly where: { readonly story: string; readonly title: string } | { readonly desk: Desk };
  /** `facts`: no fact sheet. `visual`: no photo, chart or map. `desk`: the desk's part is absent. */
  readonly part: 'facts' | 'visual' | 'desk';
  /** For a desk: how many candidates the collectors offered, when the candidates file is known. */
  readonly candidates?: number;
}

/** How many candidates each desk had, from the candidates file. */
export type DeskCandidates = Readonly<Partial<Record<Desk, number>>>;

const DESK_PART: Record<Desk, (bulletin: Bulletin) => boolean> = {
  light: (bulletin) => (bulletin.andFinally?.light.length ?? 0) > 0,
  transfers: (bulletin) => (bulletin.transfers?.length ?? 0) > 0,
  abroad: (bulletin) => (bulletin.abroad?.length ?? 0) > 0,
};

function storyParts(story: WrittenStory): EmptyPart[] {
  const version = story.versions.en;
  const where = { story: story.id, title: version.shortTitle };
  const empty: EmptyPart[] = [];
  if ((version.facts?.length ?? 0) === 0) empty.push({ where, part: 'facts' });
  if (!story.image && !version.keyNumber && !version.place) empty.push({ where, part: 'visual' });
  return empty;
}

/**
 * Every optional part the bulletin left empty, stories first and in reading order. A desk with
 * no candidates is not reported when `candidates` is given: there was nothing to write from.
 */
export function emptyParts(bulletin: Bulletin, candidates?: DeskCandidates): EmptyPart[] {
  const desks = DESKS.filter((desk) => !DESK_PART[desk](bulletin))
    .filter((desk) => candidates === undefined || (candidates[desk] ?? 0) > 0)
    .map((desk): EmptyPart => {
      const count = candidates?.[desk];
      return count === undefined
        ? { where: { desk }, part: 'desk' }
        : { where: { desk }, part: 'desk', candidates: count };
    });
  return [...bulletin.stories.flatMap(storyParts), ...desks];
}

const DESK_NAMES: Record<Desk, string> = {
  light: 'Spotlight (andFinally.light)',
  transfers: 'Transfers',
  abroad: 'Turks abroad (abroad)',
};

/** One plain line per empty part, for the writer and the pull request. */
export function describeEmptyPart(empty: EmptyPart): string {
  if ('desk' in empty.where) {
    const offered =
      empty.candidates === undefined
        ? ''
        : ` although the desk had ${String(empty.candidates)} candidates`;
    return `${DESK_NAMES[empty.where.desk]} is missing${offered}.`;
  }
  const story = `"${empty.where.title}" (${empty.where.story})`;
  return empty.part === 'facts'
    ? `${story} has no facts.`
    : `${story} has no photo, key number or place, so it shows no visual.`;
}
