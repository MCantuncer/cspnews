import type { InterfaceLanguage } from './evidence.js';

/**
 * Every page is built once per interface language: English at the root, Turkish under `/tr`.
 * The reader picks the language in Settings; Base.astro then keeps them on that side.
 */
export const INTERFACE_LANGUAGES: readonly InterfaceLanguage[] = ['en', 'tr'];
export const LANGUAGE_KEY = 'cspnews:lang';

/** A site path in the given interface language: `/settings` → `/tr/settings`. */
export function localePath(path: string, lang: InterfaceLanguage): string {
  if (lang === 'en') return path;
  return path === '/' ? '/tr' : `/tr${path}`;
}

/** The same page in the other language, for the language switch. */
export function otherLanguagePath(pathname: string): string {
  if (pathname === '/tr' || pathname === '/tr/') return '/';
  if (pathname.startsWith('/tr/')) return pathname.slice(3);
  return localePath(pathname, 'tr');
}
