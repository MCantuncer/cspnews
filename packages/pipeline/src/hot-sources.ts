import type { Source } from '@cspnews/core';

/**
 * The feeds the Hot News monitor reads: Turkish and world outlets that break news, the wire
 * services and established outlets. Partisan, low-tier and specialist feeds stay out, so a
 * story only turns hot when reliable outlets with different owners are on it. Kept small so a
 * run is quick and cheap.
 */
export function hotSources(sources: readonly Source[]): Source[] {
  return sources.filter(
    (source) =>
      source.enabled &&
      (source.kind === 'rss' || source.kind === 'primary') &&
      (source.tier === 'wire' || source.tier === 'established') &&
      source.sections.some((section) => section === 'turkey' || section === 'world'),
  );
}
