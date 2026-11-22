import { describe, expect, it } from 'vitest';

import { bindFactValue } from './fact-value.js';

/** Shows no-break spaces as "_" so the expectations are readable. */
const bound = (value: string) => bindFactValue(value).replaceAll(' ', '_');

describe('bindFactValue', () => {
  it('keeps a number, its scale word and a currency sign together', () => {
    expect(bound('34,3 milyon ₺')).toBe('34,3_milyon_₺');
    expect(bound('1,2 milyar $')).toBe('1,2_milyar_$');
    expect(bound('12 %')).toBe('12_%');
  });

  it('keeps a scale word with the money word after it', () => {
    expect(bound('19,5 milyon dolar')).toBe('19,5_milyon_dolar');
    expect(bound('18 milyar TL’yi aştı')).toBe('18_milyar_TL’yi aştı');
    expect(bound('about 161 billion lira')).toBe('about 161_billion_lira');
  });

  it('lets a longer phrase wrap between its groups', () => {
    expect(bound('7 yıl 3 ay 15 gün')).toBe('7_yıl 3_ay 15_gün');
    expect(bound('More than $37.2 million')).toBe('More than $37.2_million');
    expect(bound('37,2 milyon dolardan fazla')).toBe('37,2_milyon dolardan fazla');
  });

  it('does not join the items of a list', () => {
    expect(bound('2027, Birmingham')).toBe('2027, Birmingham');
    expect(bound('2 pistols, 2 knives')).toBe('2 pistols, 2 knives');
    expect(bound('333,493 investors')).toBe('333,493 investors');
  });

  it('leaves short values and spacing alone', () => {
    expect(bound('21')).toBe('21');
    expect(bound('  22 Mart  2027 ')).toBe('22_Mart 2027');
  });
});
