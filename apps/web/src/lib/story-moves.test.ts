import { describe, expect, it } from 'vitest';

import { barHidden, moveForKey, moveForSwipe } from './story-moves';

describe('moveForKey', () => {
  it('reads on with j and the right arrow', () => {
    expect(moveForKey({ key: 'j' })).toBe('next');
    expect(moveForKey({ key: 'ArrowRight' })).toBe('next');
  });

  it('goes back with k and the left arrow', () => {
    expect(moveForKey({ key: 'k' })).toBe('previous');
    expect(moveForKey({ key: 'ArrowLeft' })).toBe('previous');
  });

  it('opens the evidence with e', () => {
    expect(moveForKey({ key: 'e' })).toBe('evidence');
  });

  it('leaves browser shortcuts alone', () => {
    expect(moveForKey({ key: 'ArrowLeft', altKey: true })).toBeUndefined();
    expect(moveForKey({ key: 'j', metaKey: true })).toBeUndefined();
    expect(moveForKey({ key: 'k', ctrlKey: true })).toBeUndefined();
    expect(moveForKey({ key: 'ArrowRight', shiftKey: true })).toBeUndefined();
  });

  it('ignores every other key', () => {
    expect(moveForKey({ key: 'a' })).toBeUndefined();
    expect(moveForKey({ key: 'Enter' })).toBeUndefined();
  });
});

describe('moveForSwipe', () => {
  it('reads on with a swipe to the left and goes back with one to the right', () => {
    expect(moveForSwipe({ dx: -120, dy: 10, ms: 200 })).toBe('next');
    expect(moveForSwipe({ dx: 120, dy: -10, ms: 200 })).toBe('previous');
  });

  it('ignores short, slanted and slow drags', () => {
    expect(moveForSwipe({ dx: -40, dy: 0, ms: 200 })).toBeUndefined();
    expect(moveForSwipe({ dx: -120, dy: 80, ms: 200 })).toBeUndefined();
    expect(moveForSwipe({ dx: -120, dy: 0, ms: 900 })).toBeUndefined();
  });

  it('ignores a reading scroll', () => {
    expect(moveForSwipe({ dx: 20, dy: -300, ms: 250 })).toBeUndefined();
  });
});

describe('barHidden', () => {
  const base = { y: 400, lastY: 400, hidden: false, atEnd: false };

  it('hides while the reader scrolls down', () => {
    expect(barHidden({ ...base, y: 440 })).toBe(true);
  });

  it('comes back on any scroll up', () => {
    expect(barHidden({ ...base, y: 395, hidden: true })).toBe(false);
  });

  it('keeps its state through small movements down', () => {
    expect(barHidden({ ...base, y: 405, hidden: true })).toBe(true);
    expect(barHidden({ ...base, y: 405, hidden: false })).toBe(false);
  });

  it('always shows at the top and at the end of the story', () => {
    expect(barHidden({ ...base, y: 0, lastY: 30, hidden: true })).toBe(false);
    expect(barHidden({ ...base, y: 2000, lastY: 1900, atEnd: true })).toBe(false);
  });
});
