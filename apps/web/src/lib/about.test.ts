import { describe, expect, it } from 'vitest';

import { ABOUT_MARKS, aboutPath, aboutText } from './about.js';

describe('about page', () => {
  const en = aboutText('en');
  const tr = aboutText('tr');

  it('explains every evidence mark in both languages', () => {
    expect(ABOUT_MARKS).toEqual(['confirmed', 'reported', 'single-source', 'disputed']);
    for (const label of ABOUT_MARKS) {
      expect(en.marks[label].length).toBeGreaterThan(20);
      expect(tr.marks[label].length).toBeGreaterThan(20);
    }
  });

  it('says the same things in both languages, section by section', () => {
    for (const part of ['what', 'how', 'hot', 'corrections', 'money'] as const) {
      expect(tr[part].paragraphs).toHaveLength(en[part].paragraphs.length);
    }
    expect(tr.marksNotes).toHaveLength(en.marksNotes.length);
  });

  it('tells readers that an AI writes the stories and no person reads them first', () => {
    expect(en.how.paragraphs.join(' ')).toMatch(/AI language model/);
    expect(en.how.paragraphs.join(' ')).toMatch(/No person reads a story before it is published/);
    expect(tr.how.paragraphs.join(' ')).toMatch(/yapay zekâ dil modeli/);
  });

  it('lives at /about, under /tr for Turkish', () => {
    expect(aboutPath('en')).toBe('/about');
    expect(aboutPath('tr')).toBe('/tr/about');
  });
});
