/**
 * Reading settings, kept in this browser only (localStorage). Base.astro applies them before
 * first paint; the Settings page changes them. The text sizes match `--text-size` in
 * tokens.css.
 */
export const SETTINGS_KEYS = {
  theme: 'cspnews:theme',
  textSize: 'cspnews:text-size',
  ruler: 'cspnews:ruler',
  /** 'off' hides And finally; light stories show by default. */
  light: 'cspnews:light',
} as const;

export const THEMES = ['dark', 'light', 'device'] as const;
export type Theme = (typeof THEMES)[number];

export const TEXT_SIZES = [
  { id: 'small', px: 16 },
  { id: 'default', px: 17 },
  { id: 'large', px: 19 },
  { id: 'larger', px: 21 },
] as const;
export type TextSize = (typeof TEXT_SIZES)[number]['id'];

/** The size one step smaller or larger, clamped to the ends. */
export function stepTextSize(current: TextSize, step: -1 | 1): TextSize {
  const index = TEXT_SIZES.findIndex((size) => size.id === current);
  const next = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, index + step))];
  return next?.id ?? 'default';
}

export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

export function isTextSize(value: string | null | undefined): value is TextSize {
  return TEXT_SIZES.some((size) => size.id === value);
}
