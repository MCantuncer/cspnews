import { toPlainText } from '@cspnews/collector';

/** Paragraphs shorter than this are menus, captions and bylines, not the story. */
const MIN_PARAGRAPH = 60;

/** Enough for any news article; longer pages are cut so the candidates stay readable. */
export const MAX_ARTICLE_TEXT = 8000;

/**
 * The readable text of an article page, with rules only: the paragraphs inside `<article>`
 * (or the whole page when there is none), without scripts, menus and one-line fragments.
 * Good enough for the Verify and Write run to check a claim against its source; it is never
 * shown to readers.
 */
export function articleText(html: string): string {
  const cleaned = html.replace(
    /<(script|style|noscript|nav|footer|aside|form)[\s\S]*?<\/\1>/gi,
    ' ',
  );
  const article = /<article[\s\S]*<\/article>/i.exec(cleaned)?.[0] ?? cleaned;
  const paragraphs = [...article.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)]
    .map(([paragraph]) => toPlainText(paragraph))
    .filter((text) => text.length >= MIN_PARAGRAPH);
  const text = [...new Set(paragraphs)].join('\n');
  return text.length > MAX_ARTICLE_TEXT ? `${text.slice(0, MAX_ARTICLE_TEXT)}…` : text;
}
