import { describe, expect, it } from 'vitest';

import { alphabetOf, isPlayableWord, lettersOf, normalizeWord } from './language.js';

describe('normalizeWord', () => {
  it('upper-cases Turkish i as İ and ı as I', () => {
    expect(normalizeWord('şehir', 'tr')).toBe('ŞEHİR');
    expect(normalizeWord('ılık', 'tr')).toBe('ILIK');
    expect(normalizeWord('kitap', 'tr')).toBe('KİTAP');
  });

  it('upper-cases English i as I', () => {
    expect(normalizeWord('crisp', 'en')).toBe('CRISP');
  });

  it('plays Turkish circumflex letters as their plain letters', () => {
    expect(normalizeWord('kâğıt', 'tr')).toBe('KAĞIT');
    expect(normalizeWord('millî', 'tr')).toBe('MİLLİ');
    expect(normalizeWord('Ûmit', 'tr')).toBe('UMİT');
  });

  it('composes decomposed letters, so İ is always one letter', () => {
    const decomposed = 'ŞİMDİ'.normalize('NFD');
    expect(lettersOf(normalizeWord(decomposed, 'tr'))).toHaveLength(5);
    expect(normalizeWord('güneş', 'tr')).toBe('GÜNEŞ');
  });

  it('trims spaces', () => {
    expect(normalizeWord('  shore ', 'en')).toBe('SHORE');
  });
});

describe('isPlayableWord', () => {
  it('accepts five letters from the alphabet', () => {
    expect(isPlayableWord('GÜNEŞ', 'tr')).toBe(true);
    expect(isPlayableWord('SHORE', 'en')).toBe(true);
  });

  it('rejects letters outside the alphabet', () => {
    expect(isPlayableWord('QUEEN', 'tr')).toBe(false);
    expect(isPlayableWord('GÜNEŞ', 'en')).toBe(false);
    expect(isPlayableWord('SH0RE', 'en')).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isPlayableWord('SHOR', 'en')).toBe(false);
    expect(isPlayableWord('SHORES', 'en')).toBe(false);
  });
});

describe('alphabetOf', () => {
  it('has 29 Turkish letters without Q, W and X', () => {
    const turkish = alphabetOf('tr');
    expect(turkish).toHaveLength(29);
    expect(turkish).not.toContain('Q');
    expect(turkish).not.toContain('W');
    expect(turkish).not.toContain('X');
    expect(turkish).toContain('I');
    expect(turkish).toContain('İ');
  });

  it('has 26 English letters', () => {
    expect(alphabetOf('en')).toHaveLength(26);
  });
});
