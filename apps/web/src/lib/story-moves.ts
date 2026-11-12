/**
 * Moving between stories without the Next bar (US-10): `j`/`k` and the arrow keys on a
 * keyboard, a sideways swipe on a touch screen. The decisions are pure so they can be tested;
 * StoryNav.astro wires them to the page.
 */
export type Move = 'next' | 'previous' | 'evidence';

export interface KeyPress {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

const KEY_MOVES: Readonly<Record<string, Move>> = {
  j: 'next',
  ArrowRight: 'next',
  k: 'previous',
  ArrowLeft: 'previous',
  e: 'evidence',
};

/** The move a key press asks for, or nothing when it is a browser or system shortcut. */
export function moveForKey(press: KeyPress): Move | undefined {
  if (press.altKey || press.ctrlKey || press.metaKey || press.shiftKey) return undefined;
  return KEY_MOVES[press.key];
}

/** A swipe must travel this far, in CSS pixels, to count. */
export const SWIPE_MIN_DISTANCE = 72;
/** ...be this many times wider than it is tall, so reading scrolls never trigger it... */
export const SWIPE_MIN_SLOPE = 2.5;
/** ...and finish within this time, so a slow drag (selecting text) is left alone. */
export const SWIPE_MAX_MS = 600;

export interface Swipe {
  dx: number;
  dy: number;
  ms: number;
}

/** A swipe to the left reads on, like turning a page; a swipe to the right goes back. */
export function moveForSwipe({ dx, dy, ms }: Swipe): Move | undefined {
  if (ms > SWIPE_MAX_MS) return undefined;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return undefined;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_MIN_SLOPE) return undefined;
  return dx < 0 ? 'next' : 'previous';
}

/** Scrolling down by more than this hides the bar; any scroll up brings it back. */
export const BAR_HIDE_AFTER = 12;

/**
 * Whether the phone Next bar should be out of the way: hidden while the reader scrolls down
 * through the story, back as soon as they scroll up, and always there at the top and the end.
 */
export function barHidden(state: {
  y: number;
  lastY: number;
  hidden: boolean;
  atEnd: boolean;
}): boolean {
  const { y, lastY, hidden, atEnd } = state;
  if (atEnd || y <= 0) return false;
  const delta = y - lastY;
  if (delta > BAR_HIDE_AFTER) return true;
  if (delta < 0) return false;
  return hidden;
}
