import { describe, expect, it } from 'vitest';

import { SECTIONS, storyLanguageFor } from './sections.js';

describe('sections', () => {
  it('keeps the bulletin order: Turkey, Tech, World', () => {
    expect(SECTIONS).toEqual(['turkey', 'tech', 'world']);
  });

  it('publishes Turkish news in Turkish and everything else in English', () => {
    expect(storyLanguageFor('turkey')).toBe('tr');
    expect(storyLanguageFor('tech')).toBe('en');
    expect(storyLanguageFor('world')).toBe('en');
  });
});
