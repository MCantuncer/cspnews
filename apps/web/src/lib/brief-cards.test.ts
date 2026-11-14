import { describe, expect, it } from 'vitest';

import { cardAt } from './brief-cards';

describe('cardAt', () => {
  it('rounds to the nearest card', () => {
    expect(cardAt(0, 400, 7)).toBe(0);
    expect(cardAt(190, 400, 7)).toBe(0);
    expect(cardAt(210, 400, 7)).toBe(1);
    expect(cardAt(1200, 400, 7)).toBe(3);
  });

  it('stays inside the row', () => {
    expect(cardAt(9000, 400, 7)).toBe(6);
    expect(cardAt(-30, 400, 7)).toBe(0);
  });

  it('reads right-to-left scroll the same way', () => {
    expect(cardAt(-800, 400, 7)).toBe(2);
  });

  it('has no card to point at in an empty row', () => {
    expect(cardAt(100, 400, 0)).toBe(0);
    expect(cardAt(100, 0, 3)).toBe(0);
  });
});
