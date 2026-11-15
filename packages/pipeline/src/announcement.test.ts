import { readFileSync } from 'node:fs';

import { parseBulletin } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { announcement, bulletinUrl } from './announcement.js';

const bulletin = parseBulletin(
  JSON.parse(
    readFileSync(
      new URL('../../../apps/web/fixtures/bulletins/2026-11-11-evening.json', import.meta.url),
      'utf8',
    ),
  ),
);

describe('announcement', () => {
  it('names the bulletin, lists the stories by section and links the page', () => {
    const { text, previewUrl } = announcement(bulletin, 'en', 'https://www.cspnews.app/');
    expect(text).toContain('<b>Evening bulletin</b>');
    expect(text).toContain('Wednesday 11 November');
    expect(text).toContain('<b>Türkiye</b>\n•');
    expect(text).toContain('<b>Around the World</b>');
    expect(text).toContain('In one minute: https://www.cspnews.app/2026-11-11/evening/brief');
    expect(previewUrl).toBe('https://www.cspnews.app/2026-11-11/evening');
    expect(text.trimEnd().endsWith(previewUrl)).toBe(true);
    expect(text.length).toBeLessThan(4096);
  });

  it('writes the Turkish message with Turkish words and links', () => {
    const { text, previewUrl } = announcement(bulletin, 'tr', 'https://www.cspnews.app');
    expect(text).toContain('<b>Akşam bülteni</b>');
    expect(text).toContain('Bir dakikada: https://www.cspnews.app/tr/2026-11-11/evening/brief');
    expect(text).toContain('<b>Dünya</b>');
    expect(previewUrl).toBe('https://www.cspnews.app/tr/2026-11-11/evening');
  });

  it('escapes what Telegram would read as markup', () => {
    const first = bulletin.stories[0];
    if (!first) throw new Error('The fixture has no stories');
    const odd = {
      ...bulletin,
      stories: [
        {
          ...first,
          versions: {
            ...first.versions,
            en: { ...first.versions.en, shortTitle: 'Tom & Jerry <win>' },
          },
        },
      ],
    };
    expect(announcement(odd, 'en', 'https://x.example').text).toContain(
      'Tom &amp; Jerry &lt;win&gt;',
    );
  });
});

describe('bulletinUrl', () => {
  it('uses the Istanbul date of the bulletin', () => {
    const late = { slot: 'late', publishAt: '2026-11-15T00:50:00+03:00' };
    expect(bulletinUrl('https://x.example', late, 'en')).toBe('https://x.example/2026-11-15/late');
  });
});
