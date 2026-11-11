/**
 * The bulletin sections, in the order they appear (F-02, US-01).
 */
export const SECTIONS = ['turkey', 'tech', 'world'] as const;

export type Section = (typeof SECTIONS)[number];

/** Language a story is published in. */
export type StoryLanguage = 'tr' | 'en';

/**
 * Turkish news stays in Turkish; every other section is published in English.
 */
export function storyLanguageFor(section: Section): StoryLanguage {
  return section === 'turkey' ? 'tr' : 'en';
}
