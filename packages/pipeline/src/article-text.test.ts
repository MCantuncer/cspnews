import { describe, expect, it } from 'vitest';

import { articleText, MAX_ARTICLE_TEXT } from './article-text.js';

const LONG =
  'The central bank cut its policy rate by 250 basis points on Thursday, the board said.';
const OTHER = 'Markets had expected a smaller cut, and the lira weakened after the announcement.';

describe('articleText', () => {
  it('keeps the paragraphs of the article and drops menus, scripts and short fragments', () => {
    const html = `<html><body><nav><p>${LONG} menu</p></nav>
      <article><h1>Rate cut</h1><p class="lead">${LONG}</p><p>Photo: AA</p>
      <script>var p = "<p>${OTHER}</p>";</script><p>${OTHER}</p></article>
      <footer><p>${LONG} footer</p></footer></body></html>`;
    expect(articleText(html)).toBe(`${LONG}\n${OTHER}`);
  });

  it('reads the whole page when there is no article element, decoding entities', () => {
    const html = `<div><p>${LONG} R&amp;D spending is up, analysts at the bank&#39;s research arm said.</p></div>`;
    expect(articleText(html)).toContain("R&D spending is up, analysts at the bank's research arm");
  });

  it('does not repeat a paragraph the page prints twice', () => {
    expect(articleText(`<p>${LONG}</p><p>${LONG}</p>`)).toBe(LONG);
  });

  it('cuts very long pages', () => {
    const html = Array.from({ length: 200 }, (_, i) => `<p>${LONG} ${String(i)}</p>`).join('');
    expect(articleText(html).length).toBe(MAX_ARTICLE_TEXT + 1);
  });

  it('returns nothing for a page without paragraphs', () => {
    expect(articleText('<div>Loading…</div>')).toBe('');
  });
});
