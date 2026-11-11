import { describe, expect, it } from 'vitest';

import {
  AVATAR_DESIGNS,
  AVATAR_GROUNDS,
  avatarSvg,
  formatAvatar,
  initialOf,
  parseAvatar,
  randomAvatar,
} from './avatar.js';
import type { Avatar } from './avatar.js';

describe('avatar codes', () => {
  it('has sixteen designs on six grounds', () => {
    expect(Object.keys(AVATAR_DESIGNS)).toHaveLength(16);
    expect(Object.keys(AVATAR_GROUNDS)).toHaveLength(6);
  });

  it('round-trips every station avatar and every initial avatar', () => {
    for (const design of Object.keys(AVATAR_DESIGNS) as (keyof typeof AVATAR_DESIGNS)[]) {
      for (const ground of Object.keys(AVATAR_GROUNDS) as (keyof typeof AVATAR_GROUNDS)[]) {
        const avatar: Avatar = { kind: 'station', design, ground };
        expect(parseAvatar(formatAvatar(avatar))).toEqual(avatar);
      }
    }
    expect(parseAvatar('initial:night')).toEqual({ kind: 'initial', ground: 'night' });
  });

  it('rejects unknown or malformed codes', () => {
    for (const code of [
      '',
      'station',
      'station:junction',
      'station:junction:pink',
      'station:nope:dusk',
      'station:junction:dusk:extra',
      'initial',
      'initial:dusk:extra',
      'photo:dusk',
      'station:toString:dusk',
    ]) {
      expect(parseAvatar(code), code).toBeUndefined();
    }
  });
});

describe('randomAvatar', () => {
  it('picks a station avatar from the random number', () => {
    expect(randomAvatar(() => 0)).toEqual({ kind: 'station', design: 'through', ground: 'dawn' });
    expect(randomAvatar(() => 0.999)).toEqual({
      kind: 'station',
      design: 'first-light',
      ground: 'slate',
    });
  });

  it('refuses a random source outside [0, 1)', () => {
    expect(() => randomAvatar(() => 1)).toThrow(RangeError);
  });
});

describe('initialOf', () => {
  it('takes the first letter in capitals', () => {
    expect(initialOf('  can')).toBe('C');
    expect(initialOf('“Ece”')).toBe('E');
  });

  it('uses Turkish casing for Turkish', () => {
    expect(initialOf('ilker', 'tr')).toBe('İ');
    expect(initialOf('ilker', 'en')).toBe('I');
  });

  it('has nothing to show without a letter', () => {
    expect(initialOf(null)).toBeUndefined();
    expect(initialOf('  ')).toBeUndefined();
    expect(initialOf('123')).toBeUndefined();
  });
});

describe('avatarSvg', () => {
  it('draws a station avatar clipped to its disc', () => {
    const svg = avatarSvg({ kind: 'station', design: 'junction', ground: 'dusk' }, { size: 32 });
    expect(svg).toMatch(/^<svg [^>]*width="32" height="32"/);
    expect(svg).toContain('fill="#f39a4a"');
    expect(svg).toContain('clip-path="url(#cspn-avatar-junction-dusk)"');
    expect(svg).toContain('aria-hidden="true"');
  });

  it('keeps clip ids apart with a suffix', () => {
    const svg = avatarSvg(
      { kind: 'station', design: 'ring', ground: 'slate' },
      { size: 24, idSuffix: 'menu' },
    );
    expect(svg).toContain('id="cspn-avatar-ring-slate-menu"');
  });

  it('draws the initial on its ground', () => {
    const svg = avatarSvg(
      { kind: 'initial', ground: 'night' },
      { size: 40, name: 'ilker', lang: 'tr' },
    );
    expect(svg).toContain('>İ</text>');
    expect(svg).not.toContain('clip-path');
  });

  it('falls back to a station when there is no name for the initial', () => {
    const svg = avatarSvg({ kind: 'initial', ground: 'night' }, { size: 40, name: null });
    expect(svg).not.toContain('<text');
    expect(svg).toContain('clip-path');
  });
});
