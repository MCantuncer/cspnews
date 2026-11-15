/**
 * The Stations icon set (docs/design/decisions/icons.md): every icon is a station on a short
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
  /* A station on the line with a plus: follow where this story goes next. */
  follow:
    '<path d="M2 12h5.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 9.75v4.5M9.75 12h4.5"/><path d="M16.5 12H22" style="stroke:var(--faint)"/>',
  /* A flag on the line: keep this story for later. */
  save: '<path d="M2 20h5.5M16.5 20H22"/><path d="M7 3.5h10V16l-5-3.25L7 16z"/>',
  /** Tonight: a football for a goal, a football boot for an assist (solid, read at 18-20px). */
  goal: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><g style="fill:var(--bg)" stroke="none"><path d="M12 8.4l3.4 2.47-1.3 4h-4.2l-1.3-4z"/><path d="M12 2.2l2.3 1.1-.5 2.1H10.2l-.5-2.1z"/><path d="M21.6 10.3l-.1 2.6-1.9.9-1.5-1.6.9-2.4z"/><path d="M17.9 19.6l-2.4.9-1.3-1.7 1.2-1.9 2.4.3z"/><path d="M6.1 19.6l2.4.9 1.3-1.7-1.2-1.9-2.4.3z"/><path d="M2.4 10.3l.1 2.6 1.9.9 1.5-1.6-.9-2.4z"/></g>',
  assist:
    '<path fill="currentColor" stroke="none" d="M3.2 16.9V8.2c0-.7.5-1.2 1.2-1.2h3.9c.6 0 1 .4 1.2.9l.8 2.5c.4 1.1 1.4 1.9 2.6 2l3.6.4c2.7.3 4.7 2.1 4.7 4.4v.3c0 .4-.3.7-.7.7H3.9c-.4 0-.7-.3-.7-.7zM4.4 18.6h2.2v2H4.4zM8.6 18.6h2.2v2H8.6zM14.4 18.6h2.2v2h-2.2zM18.4 18.6h2.2v2h-2.2z"/><g style="fill:var(--bg)" stroke="none"><circle cx="10.6" cy="11.4" r=".75"/><circle cx="12.6" cy="12.6" r=".75"/></g>',
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
  /** Talk we could not confirm: the evidence station, drawn in dashes. */
  rumour:
    '<path d="M2 12h1.6M5.6 12h1.9M16.5 12h1.9M20.4 12H22"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="2.35 2.35"/>',
  /** A move from one club to another: an open station, then a filled one. */
  transfer:
    '<path d="M2 12h2.5M19.5 12H22M10 12h4.25M12.5 10l2 2-2 2"/><circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="12" r="2.5" fill="currentColor"/>',
  /** Turks abroad: a line that leaves the home station for a station far off. */
  abroad:
    '<path d="M2 17h2.75M9.75 17c3.75 0 4-8.5 6.75-8.5"/><circle cx="7.25" cy="17" r="2.5" fill="currentColor"/><circle cx="19" cy="8.5" r="2.5"/>',
  /** Turks abroad kinds. Basketball: the ball and its seams. */
  basketball:
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6.25 5.75c2.6 3.4 2.6 9.1 0 12.5M17.75 5.75c-2.6 3.4-2.6 9.1 0 12.5"/>',
  /** Football: the ball with its centre panel. */
  football:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.6l3.2 2.3-1.2 3.75h-4l-1.2-3.75z" fill="currentColor"/><path d="M12 3.5v5.1M15.2 10.9l4.6-1.6M14 14.65l2.8 3.9M10 14.65l-2.8 3.9M8.8 10.9l-4.6-1.6"/>',
  /** Tennis: the ball and its curved seam. */
  tennis:
    '<circle cx="12" cy="12" r="8.5"/><path d="M5.25 6.75c3.25 2.9 3.25 7.6 0 10.5M18.75 6.75c-3.25 2.9-3.25 7.6 0 10.5"/>',
  /** Volleyball: the ball and its three panels. */
  volleyball:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 12V3.5M12 12l7.35 4.25M12 12l-7.35 4.25M12 3.5c-2.5 2.75-3.25 6.5-2.25 10M19.35 16.25c-3.5.6-6.9-.4-9.6-2.75"/>',
  /** Motorsport: a chequered flag. */
  motorsport:
    '<path d="M5 21V3.75"/><path d="M5 4.25h13.5v9H5"/><path d="M9.5 4.25v4.5h4.5v4.5M14 4.25v4.5h4.5M5 8.75h4.5v4.5" />',
  /** Science: a flask with one bubble. */
  science:
    '<path d="M9.25 3.5h5.5M10.25 3.5v6.25L4.75 19.5h14.5l-5.5-9.75V3.5"/><circle cx="12" cy="15.75" r="1.6" fill="currentColor"/>',
  /** Tech: a chip. */
  chip: '<path d="M7 7h10v10H7zM10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/><circle cx="12" cy="12" r="1.75" fill="currentColor"/>',
  /** The arts: a frame with a hill and the sun. */
  arts: '<path d="M3.5 5h17v14h-17z"/><path d="M3.5 16l5-5 4.25 4.25 2.25-2.25 5.5 5.5"/><circle cx="15.75" cy="8.75" r="1.5" fill="currentColor"/>',
  /** Business: a case. */
  business:
    '<path d="M3.5 8h17v11.5h-17zM9 8V5h6v3M3.5 13h17"/><circle cx="12" cy="13" r="1.4" fill="currentColor"/>',
  /** Milestones. An award: a medal on its ribbon. */
  award:
    '<path d="M8.5 3.5l3.5 6 3.5-6"/><circle cx="12" cy="15" r="5.25"/><circle cx="12" cy="15" r="2" fill="currentColor"/>',
  /** A paper: a page with lines. */
  paper:
    '<path d="M6 3.5h8.5l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7H18M8.75 11h6.5M8.75 14h6.5M8.75 17h4"/>',
  /** A record: a line that climbs to a filled station. */
  record:
    '<path d="M2.5 19h3l3.5-5 3.5 2.5 4-7"/><circle cx="18.5" cy="6.5" r="2.5" fill="currentColor"/>',
  /** A first: a flag on a station. */
  first: '<path d="M7 21V4"/><path d="M7 4.5h11l-2.5 4 2.5 4H7"/>',
  /** A new role: a person and a station. */
  role: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.75-3.75 3.25-6 6.5-6s5.75 2.25 6.5 6"/><circle cx="18.5" cy="8" r="2" fill="currentColor"/>',
  /** And finally kinds: television and film. */
  screen:
    '<path d="M3.5 6h17v11h-17zM8.5 20h7"/><circle cx="12" cy="11.5" r="2" fill="currentColor"/>',
  /** Music: two notes on a beam. */
  music:
    '<path d="M9 17V6.5l10-2V15"/><circle cx="6.5" cy="17" r="2.5"/><circle cx="16.5" cy="15" r="2.5" fill="currentColor"/>',
  /** Well-known people: a star. */
  people:
    '<path d="M12 3.75l2.5 5.1 5.6.8-4.05 3.95.95 5.6L12 16.6l-5 2.6.95-5.6L3.9 9.65l5.6-.8z"/>',
  /** Odd news: a raised eyebrow of a mark. */
  odd: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.25v5.5"/><circle cx="12" cy="16.25" r="1.1" fill="currentColor" stroke="none"/>',
  /** Animals: a paw. */
  animals:
    '<circle cx="6.5" cy="10" r="1.9"/><circle cx="10" cy="6" r="1.9"/><circle cx="14" cy="6" r="1.9"/><circle cx="17.5" cy="10" r="1.9"/><path d="M12 11.5c-2.9 0-5.25 3.4-5.25 5.6 0 1.45 1.15 2.15 2.6 2.15 1.05 0 1.8-.5 2.65-.5s1.6.5 2.65.5c1.45 0 2.6-.7 2.6-2.15 0-2.2-2.35-5.6-5.25-5.6z"/>',
  /** Around town: three buildings on the line. */
  town: '<path d="M2.5 20h19M5 20v-9l4-2.5V20M9 20V4.5h6V20M15 20v-9.5l4 2V20"/>',
  /** And finally: a small cup on the line, something light after the news. */
  light:
    '<path d="M2 15h3.5M18.5 15H22M7 11h10v2.5a5 5 0 0 1-10 0z"/><path d="M10 8c0-1 1-1.25 1-2.25M13.5 8c0-1 1-1.25 1-2.25"/>',
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
