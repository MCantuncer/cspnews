import type { KeyNumber, LocalStory, Place, StoryImage } from '@cspnews/core';

/**
 * Each story gets one visual, in this order (docs/design/system.md, "Visuals"): the lead
 * outlet's credited photo, a labelled chart of the key number, a locator map, the
 * organisation's logo, or nothing. Never a stock or decorative image.
 */
export type Visual =
  | { kind: 'photo'; src: string; image: StoryImage }
  | { kind: 'chart'; keyNumber: KeyNumber }
  | { kind: 'map'; place: Place }
  | { kind: 'logo'; src: string; orgId: string }
  | { kind: 'none' };

export interface MediaLookup {
  photo: (storyId: string) => string | undefined;
  logo: (orgId: string) => string | undefined;
}

export function visualFor(story: LocalStory, media: MediaLookup): Visual {
  const photo = story.image && media.photo(story.id);
  if (story.image && photo) return { kind: 'photo', src: photo, image: story.image };
  if (story.keyNumber) return { kind: 'chart', keyNumber: story.keyNumber };
  if (story.place) return { kind: 'map', place: story.place };
  const logo = story.orgId && media.logo(story.orgId);
  if (story.orgId && logo) return { kind: 'logo', src: logo, orgId: story.orgId };
  return { kind: 'none' };
}

/** A key number in the story's own language: "%31,5" in Turkish, "31.5%" in English. */
export function formatValue(value: number, unit: string, language: 'en' | 'tr'): string {
  const number = new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    maximumFractionDigits: 2,
  }).format(value);
  if (unit === '%') return language === 'tr' ? `%${number}` : `${number}%`;
  return `${number} ${unit}`;
}
