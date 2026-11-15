import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, THEMES } from './settings.js';

/**
 * Guards the four palettes in styles/tokens.css (docs/design/decisions/themes.md): a colour
 * added to one theme must be added to all of them, or a theme silently falls back to Dark.
 */
const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const base = readFileSync(new URL('../layouts/Base.astro', import.meta.url), 'utf8');

/** The custom properties set in the first rule whose selector line ends with `selector {`. */
function block(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No rule for ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
}

const dark = block(':root');
/** The colour tokens: everything the default palette sets that a theme is expected to replace. */
const colourTokens = [...dark.keys()].filter(
  (name) =>
    !/^--(f-|ease|dur|gutter|measure|text-size|swatch|hour$|sec$)/.test(name) &&
    !(dark.get(name) ?? '').startsWith('var('),
);

describe('themes', () => {
  it('lists every palette and matches the device by default', () => {
    expect(THEMES).toEqual(['device', 'dark', 'black', 'light', 'clean']);
    expect(DEFAULT_THEME).toBe('device');
  });

  it.each(['black', 'light', 'clean'])('%s defines every colour token', (theme) => {
    const palette = block(`:root[data-theme='${theme}']`);
    expect([...palette.keys()].sort()).toEqual([...colourTokens].sort());
  });

  it('matches Clean on a light device', () => {
    const device = block(`  :root[data-theme='device']`);
    expect(device).toEqual(block(`:root[data-theme='clean']`));
  });

  it('gives the browser bar each theme’s page colour', () => {
    const map = /const pageColour = (\{[^}]+\})/.exec(base)?.[1] ?? '';
    const colours = Object.fromEntries(
      [...map.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1] ?? '', m[2] ?? '']),
    );
    expect(colours).toEqual({
      dark: dark.get('--bg'),
      black: block(`:root[data-theme='black']`).get('--bg'),
      light: block(`:root[data-theme='light']`).get('--bg'),
      clean: block(`:root[data-theme='clean']`).get('--bg'),
    });
  });
});
