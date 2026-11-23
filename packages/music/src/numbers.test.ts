import { describe, expect, it } from 'vitest';

import { matchesSource, statedNumbers } from './numbers.js';

const values = (line: string) => statedNumbers(line).map((n) => n.value);

describe('stated numbers', () => {
  it('reads English and Turkish spellings', () => {
    expect(values('2.1 million plays in 18 hours')).toEqual([2_100_000, 18]);
    expect(values('İlk 18 saatte 2,1 milyon dinlenme')).toEqual([18, 2_100_000]);
    expect(values('812,000 plays')).toEqual([812_000]);
    expect(values('812.000 dinlenme')).toEqual([812_000]);
    expect(values("48'den 9'a çıktı")).toEqual([48, 9]);
    expect(values('4x its usual')).toEqual([4]);
  });

  it('accepts a rounded source number, not a different one', () => {
    const [million] = statedNumbers('2.1 million');
    const [four] = statedNumbers('4x');
    const [twelve] = statedNumbers('12');
    if (!million || !four || !twelve) throw new Error('not read');
    expect(matchesSource(million, 2_134_567)).toBe(true);
    expect(matchesSource(million, 2_400_000)).toBe(false);
    expect(matchesSource(four, 4.27)).toBe(true);
    expect(matchesSource(twelve, 13)).toBe(false);
  });
});
