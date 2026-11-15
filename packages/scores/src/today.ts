import { foldName, type TodayItem } from '@cspnews/core';

import type { Fixture } from './fixture.js';

/**
 * The Today line's match (docs/design/decisions/today-line.md) is written by the bulletin writer
 * as a label, "Fenerbahçe – Galatasaray". When the rules find that fixture in a score source, they
 * add its live address so the page can show the score while it is played. Nothing else changes.
 */
export function withLiveMatch(
  items: readonly TodayItem[],
  fixtures: readonly Fixture[],
): TodayItem[] {
  return items.map((item) => {
    if (item.kind !== 'match') return item;
    const fixture = findFixture(item.label.en, fixtures) ?? findFixture(item.label.tr, fixtures);
    return fixture ? { ...item, live: { source: fixture.source, ref: fixture.ref } } : item;
  });
}

/** The fixture a label like "A – B" or "A v B" names, both sides matching by name. */
export function findFixture(label: string, fixtures: readonly Fixture[]): Fixture | undefined {
  const sides = label.split(/\s+(?:[–—-]|v|vs\.?)\s+/i).map(foldName);
  if (sides.length !== 2) return undefined;
  const [first, second] = sides as [string, string];
  const names = (side: Fixture['home']) => side.names.map(foldName);
  return fixtures.find((fixture) => {
    const home = names(fixture.home);
    const away = names(fixture.away);
    return (
      (home.includes(first) && away.includes(second)) ||
      (home.includes(second) && away.includes(first))
    );
  });
}
