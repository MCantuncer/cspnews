/**
 * The Stations icon set (docs/design/system.md, "Icons"): every icon is a station on a short
 * piece of the day line. 24px grid, 1.75px stroke, round caps. Each entry is the inner SVG
 * markup, drawn with `currentColor`; `--faint` and `--meta2` mark the quiet parts.
 */
export const ICONS = {
  confirmed:
    '<path d="M2 12h5.5M16.5 12H22"/><circle cx="12" cy="12" r="4.5" fill="currentColor"/>',
  reported: '<path d="M2 12h5.5M16.5 12H22"/><circle cx="12" cy="12" r="4.5"/>',
  'single-source': '<path d="M2 12h5.5M16.5 12H22M12 2.25v2.5"/><circle cx="12" cy="12" r="4.5"/>',
  disputed:
    '<path d="M2 10.5h4.75M11.25 6A4.5 4.5 0 0 0 11.25 15M12.75 9A4.5 4.5 0 0 1 12.75 18M17.25 13.5H22"/>',
  none: '<path d="M2 12h6.5M15.5 12H22" style="stroke:var(--faint)"/><circle cx="12" cy="12" r="3.5"/>',
  tick: '<path d="M4.5 12.5l4.75 4.75L19.5 7"/>',
  'choice-off':
    '<path d="M1.5 12h3.75M18.75 12h3.75" style="stroke:var(--faint)"/><circle cx="12" cy="12" r="5.75"/>',
  'choice-on':
    '<path d="M1.5 12h3.75M18.75 12h3.75" style="stroke:var(--faint)"/><circle cx="12" cy="12" r="5.75"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
  contents:
    '<path d="M5 8.25v1.5M5 14.25v1.5M10 6h10M10 12h10M10 18h6.5"/><circle cx="5" cy="6" r="2"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="18" r="2"/>',
  settings:
    '<path d="M3 8h9M18 8h3M3 16h3M12 16h9"/><circle cx="15" cy="8" r="3"/><circle cx="9" cy="16" r="3"/>',
  language: '<path d="M4 5h16v11h-9l-5 4v-4H4z"/><path d="M8 10.5h8"/>',
  theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  'text-size': '<path d="M3 18l4-11 4 11M4.5 14h5M14 18l3-7.5 3 7.5M15 16h4"/>',
  ruler:
    '<path d="M4 8h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM7 8v3M11 8v4M15 8v3M19 8v4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M10 7.5L5.5 12l4.5 4.5M5.5 12H15.5"/><circle cx="18.25" cy="12" r="2.25"/>',
  next: '<path d="M14 7.5l4.5 4.5-4.5 4.5M18.5 12H8.5"/><circle cx="5.75" cy="12" r="2.25"/>',
  external: '<path d="M7.75 16.25L17 7M10.5 7H17v6.5"/><circle cx="6" cy="18" r="2.25"/>',
  help: '<path d="M9 9.25a3 3 0 1 1 4.6 2.55c-.95.6-1.6 1.25-1.6 2.45v.5"/><circle cx="12" cy="18.25" r="1.25" fill="currentColor" stroke="none"/>',
  more: '<path d="M10 7.5l4.5 4.5-4.5 4.5"/>',
  turkiye:
    '<path d="M2 17h20M7 8v9M17 8v9M7 8Q12 15.5 17 8"/><circle cx="7" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="6" r="1.5" fill="currentColor" stroke="none"/>',
  tech: '<path d="M2.5 12h4M11.5 12c2.5 0 2.5-6 4.75-6M11.5 12c2.5 0 2.5 6 4.75 6"/><circle cx="9" cy="12" r="2.5"/><circle cx="18.5" cy="6" r="2.25"/><circle cx="18.5" cy="18" r="2.25" fill="currentColor"/>',
  world:
    '<circle cx="12" cy="12" r="8"/><path d="M12 1.5v7.5M12 15v7.5"/><circle cx="12" cy="12" r="2.25" fill="currentColor"/>',
  hot: '<path d="M2 18h5.5l3.1-7.6M13.4 10.4l3.1 7.6H22"/><circle cx="12" cy="6.75" r="2.75" fill="currentColor"/>',
  developing:
    '<path d="M2 12h5.5"/><path d="M16.5 12H22" style="stroke:var(--faint)"/><circle cx="12" cy="12" r="4.5"/><path d="M12 7.5a4.5 4.5 0 0 0 0 9z" fill="currentColor" stroke="none"/>',
  updated:
    '<path d="M2 12h2M9.5 12h4.25" /><circle cx="6.75" cy="12" r="2.5" style="stroke:var(--meta2)"/><circle cx="17.25" cy="12" r="3.25" fill="currentColor"/>',
  stats:
    '<path d="M2.5 20h19M6.5 20v-5M12 20v-9.75M17.5 20v-7.5"/><circle cx="12" cy="6" r="2.25" fill="currentColor"/>',
  share:
    '<path d="M4.5 13.5v5.75h15V13.5M12 15.5V8.5"/><circle cx="12" cy="5.5" r="2.5" fill="currentColor"/>',
  /** Accounts: a passkey, the word game streak, a new avatar draw, your data, signing out. */
  passkey: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9.5M18.5 12v3M15.5 12v2"/>',
  streak:
    '<path d="M2 12h1.5M20.5 12H22"/><rect x="3.5" y="8.5" width="5" height="7" rx="1.5" fill="currentColor"/><rect x="9.5" y="8.5" width="5" height="7" rx="1.5"/><rect x="15.5" y="8.5" width="5" height="7" rx="1.5" fill="currentColor"/>',
  shuffle:
    '<path d="M3 7.5h4.5c4.5 0 4.5 9 9 9H21M3 16.5h4.5c1.6 0 2.6-1.1 3.4-2.5M13.1 10c.8-1.4 1.8-2.5 3.4-2.5H21M18.5 5l2.5 2.5-2.5 2.5M18.5 14l2.5 2.5-2.5 2.5"/>',
  download: '<path d="M4.5 15.5v3.75h15V15.5M12 4.5v10M7.75 10.5L12 14.75l4.25-4.25"/>',
  signout: '<path d="M14 7.5l4.5 4.5-4.5 4.5M18.5 12H9.5M10 4.75H5.25v14.5H10"/>',
  /** An empty logo slot, for an outlet whose logo is not saved. */
  word: '<path d="M2.5 9h5v6h-5zM9.5 9h5v6h-5zM16.5 9h5v6h-5z"/>',
  slot: '<circle cx="12" cy="12" r="9.25" />',
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
