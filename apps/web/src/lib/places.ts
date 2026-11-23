import type { InterfaceLanguage } from './evidence.js';
import { localePath } from './locale.js';
import { GAME_PATHS } from './word.js';

/**
 * The site's three places, switched from the header: the news, the day's music and the word
 * game. Every other page (story, Settings, Saved, …) belongs to News.
 */
export const PLACES = ['news', 'music', 'word'] as const;
export type Place = (typeof PLACES)[number];

const LABELS: Record<InterfaceLanguage, Record<Place, string>> = {
  en: { news: 'News', music: 'Music', word: 'Word' },
  tr: { news: 'Haberler', music: 'Müzik', word: 'Kelime' },
};

export function currentPlace(pathname: string): Place {
  const path = pathname.replace(/^\/tr(?=\/|$)/, '') || '/';
  if (/^\/music(\/|\.|$)/.test(path)) return 'music';
  if (/^\/word(\/|\.|$)/.test(path)) return 'word';
  return 'news';
}

export function placeLinks(lang: InterfaceLanguage): { key: Place; label: string; href: string }[] {
  const href: Record<Place, string> = {
    news: localePath('/', lang),
    music: localePath('/music', lang),
    word: GAME_PATHS[lang],
  };
  return PLACES.map((key) => ({ key, label: LABELS[lang][key], href: href[key] }));
}
