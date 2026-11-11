import { describe, expect, it } from 'vitest';

import { terms, words } from './tokens.js';

describe('words', () => {
  it('lower-cases Turkish with Turkish rules', () => {
    expect(words('İSTANBUL ve IĞDIR', 'tr')).toEqual(['istanbul', 've', 'ığdır']);
  });

  it('keeps decimals whole and reads a comma as a decimal point', () => {
    expect(words('4,6 büyüklüğünde', 'tr')).toEqual(['4.6', 'büyüklüğünde']);
  });
});

describe('terms', () => {
  it('drops stopwords and cuts Turkish suffixes', () => {
    expect(terms('Seçimlerin sonuçları ve seçimde katılım', 'tr')).toEqual([
      'seçim',
      'sonuç',
      'seçim',
      'katıl',
    ]);
  });

  it('cuts English plurals and endings the same way', () => {
    expect(terms('The elections and an election', 'en')).toEqual(['elect', 'elect']);
  });
});
