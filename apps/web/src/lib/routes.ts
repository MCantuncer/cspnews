import { loadBulletins } from './bulletins.js';

/**
 * Static paths shared by the English pages and their Turkish copies under `/tr`, so both
 * languages always build the same set of bulletins and stories.
 */
export function bulletinRoutes() {
  return loadBulletins().map((published) => ({
    params: { date: published.date, slot: published.slot },
    props: { published },
  }));
}

export function storyRoutes() {
  return loadBulletins().flatMap((published) =>
    published.bulletin.stories.map((story, index) => ({
      params: { date: published.date, slot: published.slot, story: story.id },
      props: { published, story, index },
    })),
  );
}

export function transferRoutes() {
  return loadBulletins().flatMap((published) =>
    (published.bulletin.transfers ?? []).map((move) => ({
      params: { date: published.date, slot: published.slot, move: move.id },
      props: { published, move },
    })),
  );
}
