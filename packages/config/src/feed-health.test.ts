import { describe, expect, it } from 'vitest';

import { classifyFeed } from './feed-health.js';

describe('classifyFeed', () => {
  it('accepts an RSS feed with items and counts them', () => {
    const body =
      '<?xml version="1.0"?><rss version="2.0"><channel><item></item><item></item></channel></rss>';
    expect(classifyFeed(200, body)).toEqual({ ok: true, items: 2 });
  });

  it('accepts Atom and RDF feeds', () => {
    expect(
      classifyFeed(200, '<feed xmlns="http://www.w3.org/2005/Atom"><entry></entry></feed>'),
    ).toEqual({
      ok: true,
      items: 1,
    });
    expect(classifyFeed(200, '<rdf:RDF><item rdf:about="x"></item></rdf:RDF>')).toEqual({
      ok: true,
      items: 1,
    });
  });

  it('rejects non-2xx responses', () => {
    expect(classifyFeed(404, '')).toEqual({ ok: false, reason: 'HTTP 404' });
  });

  it('rejects HTML pages', () => {
    expect(classifyFeed(200, '<!doctype html><html><body>Not found</body></html>')).toEqual({
      ok: false,
      reason: 'Not an RSS, RDF or Atom feed',
    });
  });

  it('rejects an empty feed', () => {
    expect(classifyFeed(200, '<rss><channel></channel></rss>')).toEqual({
      ok: false,
      reason: 'Feed has no items',
    });
  });
});
