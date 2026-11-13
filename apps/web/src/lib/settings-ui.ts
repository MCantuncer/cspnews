/**
 * The reading settings controls, shared by the reader corner sheet and the Settings page.
 * Choices are kept in this browser and apply at once; every set of controls on the page
 * follows a change made in another (the sheet open on the Settings page, for example).
 */
import { LANGUAGE_KEY } from './locale.js';
import { SETTINGS_KEYS, isTextSize, isTheme, stepTextSize, type TextSize } from './settings.js';

const CHANGED = 'cspnews:settings';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | undefined) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Without storage the change still applies to this page.
  }
}

function currentTheme(): string {
  const saved = read(SETTINGS_KEYS.theme);
  return isTheme(saved) ? saved : 'dark';
}

function currentSize(): TextSize {
  const saved = read(SETTINGS_KEYS.textSize);
  return isTextSize(saved) ? saved : 'default';
}

/** Wires one set of settings controls inside `container`. */
export function bindSettings(container: ParentNode) {
  const root = document.documentElement;
  const changed = () => document.dispatchEvent(new CustomEvent(CHANGED));

  // Language: remember the choice; the link then opens this page in that language.
  for (const option of container.querySelectorAll<HTMLAnchorElement>('[data-lang-option]')) {
    option.addEventListener('click', () => {
      write(LANGUAGE_KEY, option.getAttribute('data-lang-option') ?? 'en');
    });
  }

  const themeOptions = [...container.querySelectorAll<HTMLButtonElement>('[data-theme-option]')];
  const size = container.querySelector<HTMLElement>('[data-size]');
  const sizeValue = size?.querySelector('output');
  const sizeButtons = [...(size?.querySelectorAll<HTMLButtonElement>('[data-step]') ?? [])];
  const labels = JSON.parse(size?.getAttribute('data-size') ?? '{}') as Partial<
    Record<TextSize, string>
  >;
  const ruler = container.querySelector<HTMLButtonElement>('button.tsw[data-name="ruler"]');
  const light = container.querySelector<HTMLButtonElement>('button.tsw[data-name="light"]');

  function show() {
    const theme = currentTheme();
    for (const option of themeOptions) {
      const on = option.getAttribute('data-theme-option') === theme;
      option.setAttribute('aria-checked', String(on));
      option.tabIndex = on ? 0 : -1;
    }
    const current = currentSize();
    if (sizeValue) sizeValue.textContent = labels[current] ?? current;
    for (const button of sizeButtons) {
      const step = button.getAttribute('data-step') === '1' ? 1 : -1;
      button.disabled = stepTextSize(current, step) === current;
    }
    ruler?.setAttribute('aria-checked', String(read(SETTINGS_KEYS.ruler) === 'on'));
    light?.setAttribute('aria-checked', String(read(SETTINGS_KEYS.light) !== 'off'));
  }

  for (const option of themeOptions) {
    option.addEventListener('click', () => {
      const theme = option.getAttribute('data-theme-option');
      if (!isTheme(theme)) return;
      root.dataset.theme = theme;
      write(SETTINGS_KEYS.theme, theme === 'dark' ? undefined : theme);
      changed();
    });
  }

  for (const button of sizeButtons) {
    button.addEventListener('click', () => {
      const next = stepTextSize(currentSize(), button.getAttribute('data-step') === '1' ? 1 : -1);
      if (next === 'default') delete root.dataset.textSize;
      else root.dataset.textSize = next;
      write(SETTINGS_KEYS.textSize, next === 'default' ? undefined : next);
      changed();
    });
  }

  ruler?.addEventListener('change', (event) => {
    const on = event instanceof CustomEvent && (event.detail as { checked: boolean }).checked;
    if (on) root.dataset.ruler = 'on';
    else delete root.dataset.ruler;
    write(SETTINGS_KEYS.ruler, on ? 'on' : undefined);
    changed();
  });

  light?.addEventListener('change', (event) => {
    const on = event instanceof CustomEvent && (event.detail as { checked: boolean }).checked;
    if (on) delete root.dataset.light;
    else root.dataset.light = 'off';
    write(SETTINGS_KEYS.light, on ? undefined : 'off');
    changed();
  });

  document.addEventListener(CHANGED, show);
  show();
}
