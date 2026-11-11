import { EVIDENCE_LABEL_VALUES } from '@cspnews/core';
import { describe, expect, it } from 'vitest';
import { EVIDENCE, evidenceWord } from './evidence.js';
import { ICONS, ICON_NAMES } from './icons.js';

describe('Stations icons', () => {
  it('draws every icon with SVG shapes only', () => {
    for (const name of ICON_NAMES) {
      expect(ICONS[name], name).toMatch(/^<(path|circle)\b/);
      expect(ICONS[name], name).not.toMatch(/<(script|image|text|use)\b/);
    }
  });

  it('keeps colour out of the icons, except the quiet tokens', () => {
    for (const name of ICON_NAMES) {
      const colours = ICONS[name].match(/#[0-9a-f]{3,8}\b|rgb\(/gi);
      expect(colours, name).toBeNull();
    }
  });
});

describe('evidence labels', () => {
  it('has a glyph and words in both languages for every label', () => {
    for (const label of EVIDENCE_LABEL_VALUES) {
      expect(ICON_NAMES).toContain(EVIDENCE[label].icon);
      expect(evidenceWord(label, 'en')).not.toBe('');
      expect(evidenceWord(label, 'tr')).not.toBe('');
    }
  });

  it('defaults to English', () => {
    expect(evidenceWord('single-source')).toBe('Single source');
    expect(evidenceWord('confirmed', 'tr')).toBe('Doğrulandı');
  });
});
