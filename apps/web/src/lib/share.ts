import type { PublishedBulletin } from './bulletins.js';
import { siteOrigin } from './feed.js';
import type { InterfaceLanguage } from './evidence.js';
import { languagePath } from './locale.js';
import { photoUrl } from './media.js';
import { storiesIn } from './bulletins.js';

/**
 * How a page looks when its link is shared in a chat or on social media (docs/design/decisions/
 * share-previews.md): the page's title and description, and one picture. The picture is the
 * story's photo cut to 1200 x 630 and compressed at build time (src/pages/share/[id].jpg.ts),
 * because chat apps skip pictures that are large; pages without a photo use the plain card.
 */
export const SHARE_SIZE = { width: 1200, height: 630 } as const;

/** The card for pages with no photo of their own. */
export const SHARE_FALLBACK = '/og.png';

/** The path of the share picture of a story, spotlight, transfer or person item. */
export function shareImagePath(id: string): string {
  return photoUrl(id) ? `/share/${encodeURIComponent(id)}.jpg` : SHARE_FALLBACK;
}

/** The share picture of the first story of a bulletin that has a photo. */
export function leadShareImage(published: PublishedBulletin): string {
  const lead = published.bulletin.stories.find((story) => photoUrl(story.id));
  return lead ? shareImagePath(lead.id) : SHARE_FALLBACK;
}

/** A bulletin in a few words for a preview: its first three headlines. */
export function bulletinDescription(published: PublishedBulletin, lang: InterfaceLanguage): string {
  return storiesIn(published, lang)
    .slice(0, 3)
    .map((story) => story.shortTitle.replace(/[.!?]+$/, ''))
    .join('. ')
    .concat('.');
}

/**
 * The page's own path as readers use it. A built page's address ends in `.html` (the site is
 * built as files and served without the extension), and the home page is `/index.html`.
 */
export function pagePath(pathname: string): string {
  const path = pathname
    .replace(/\.html$/, '')
    .replace(/\/index$/, '')
    .replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** The full address of a site path: the share picture and canonical link must be absolute. */
export function absoluteUrl(path: string): string {
  return `${siteOrigin()}${path === '/' ? '' : path}`;
}

/** The same page in each interface language, for `hreflang` links. */
export function languageAlternates(pathname: string): { lang: InterfaceLanguage; href: string }[] {
  return (['en', 'tr'] as const).map((lang) => ({
    lang,
    href: absoluteUrl(languagePath(pagePath(pathname), lang)),
  }));
}

/** `og:locale` for the interface language. */
export const OG_LOCALE: Record<InterfaceLanguage, string> = { en: 'en_GB', tr: 'tr_TR' };
