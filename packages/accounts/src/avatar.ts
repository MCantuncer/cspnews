/**
 * Reader avatars. Every default avatar is a small piece of transit map, drawn with the rules of the
 * Stations icons (docs/design/system.md): a line, one or two stations, filled or open, on a round
 * ground. A reader can use their initial instead. There are no photo uploads.
 *
 * Avatars are stored as a short code (`station:junction:dusk`, `initial:night`) and drawn here, so
 * the site and the API render exactly the same SVG.
 */

/** The grounds an avatar sits on. The four edition hours, plus two neutrals. */
export const AVATAR_GROUNDS = {
  dawn: { bg: '#e9b04a', ink: '#16130f' },
  noon: { bg: '#d9c79a', ink: '#16130f' },
  dusk: { bg: '#f39a4a', ink: '#16130f' },
  night: { bg: '#86a2ea', ink: '#16130f' },
  stone: { bg: '#c9c2b6', ink: '#16130f' },
  slate: { bg: '#2f2b27', ink: '#f5f0e8' },
} as const satisfies Record<string, { bg: string; ink: string }>;

export type AvatarGround = keyof typeof AVATAR_GROUNDS;

/** A station: centre, whether it is filled (`half` fills its left half), and an optional radius. */
interface Station {
  readonly x: number;
  readonly y: number;
  readonly fill: 'filled' | 'open' | 'half';
  readonly r?: number;
}

interface AvatarDesign {
  /** The line, as SVG path data on a 48 by 48 grid. It may run past the disc; the disc clips it. */
  readonly line: string;
  /** Extra outlined shapes drawn over the line and filled with the ground, such as a ring. */
  readonly shapes?: string;
  readonly stations: readonly Station[];
  /** Station radius when a station doesn't set its own. */
  readonly r?: number;
}

const filled = (x: number, y: number, r?: number): Station => ({
  x,
  y,
  fill: 'filled',
  ...(r ? { r } : {}),
});
const open = (x: number, y: number, r?: number): Station => ({
  x,
  y,
  fill: 'open',
  ...(r ? { r } : {}),
});

/** The sixteen designs, in the order the avatar picker shows them. */
export const AVATAR_DESIGNS = {
  through: { line: 'M-2 24H50', stations: [filled(24, 24)] },
  'two-stops': { line: 'M-2 24H50', stations: [filled(15, 24), open(33, 24)] },
  bend: { line: 'M-2 31H17L33 15H50', stations: [open(17, 31), filled(33, 15)] },
  junction: {
    line: 'M-2 24H14C24 24 25 14 35 14H50M14 24C24 24 25 34 35 34H50',
    stations: [filled(14, 24), open(35, 34)],
  },
  crossing: { line: 'M-2 24H50M24 -2V50', stations: [open(24, 24, 6.5)] },
  upright: { line: 'M24 -2V50', stations: [filled(24, 15), open(24, 33)] },
  climb: { line: 'M-2 50L50 -2', stations: [open(13, 35), filled(24, 24), open(35, 13)], r: 4 },
  loop: { line: 'M12 26a12 12 0 1 0 24 0a12 12 0 1 0 -24 0M24 50V38', stations: [filled(24, 14)] },
  parallel: { line: 'M-2 17H50M-2 31H50', stations: [filled(17, 17), open(31, 31)] },
  curve: { line: 'M-2 34C18 34 34 18 34 -2', stations: [filled(23.5, 23.5)] },
  's-bend': { line: 'M-2 16H14L34 32H50', stations: [filled(14, 16), open(34, 32)] },
  interchange: {
    line: 'M-2 17H50M-2 31H50',
    shapes: '<rect x="18.5" y="11.5" width="11" height="25" rx="5.5"/>',
    stations: [],
  },
  terminus: { line: 'M-2 24H30M30 14V34', stations: [filled(16, 24)] },
  spur: { line: 'M-2 31H50M19 31L32 18', stations: [filled(19, 31), open(32, 18)] },
  ring: {
    line: 'M24 -2V12M24 36V50',
    shapes: '<circle cx="24" cy="24" r="12"/>',
    stations: [filled(24, 24, 3.5)],
  },
  'first-light': { line: 'M-2 30H50', stations: [{ x: 24, y: 30, fill: 'half', r: 6 }] },
} as const satisfies Record<string, AvatarDesign>;

export type AvatarDesignId = keyof typeof AVATAR_DESIGNS;

export type Avatar =
  | { readonly kind: 'station'; readonly design: AvatarDesignId; readonly ground: AvatarGround }
  | { readonly kind: 'initial'; readonly ground: AvatarGround };

const DESIGN_IDS = Object.keys(AVATAR_DESIGNS) as AvatarDesignId[];
const GROUND_IDS = Object.keys(AVATAR_GROUNDS) as AvatarGround[];

const isDesign = (value: string): value is AvatarDesignId => Object.hasOwn(AVATAR_DESIGNS, value);
const isGround = (value: string): value is AvatarGround => Object.hasOwn(AVATAR_GROUNDS, value);

/** The stored form of an avatar. */
export function formatAvatar(avatar: Avatar): string {
  return avatar.kind === 'station'
    ? `station:${avatar.design}:${avatar.ground}`
    : `initial:${avatar.ground}`;
}

/** Reads a stored avatar code. Returns undefined for anything that isn't a known avatar. */
export function parseAvatar(code: string): Avatar | undefined {
  const [kind, a, b, ...rest] = code.split(':');
  if (rest.length > 0) return undefined;
  if (kind === 'station' && a !== undefined && b !== undefined && isDesign(a) && isGround(b)) {
    return { kind, design: a, ground: b };
  }
  if (kind === 'initial' && a !== undefined && b === undefined && isGround(a)) {
    return { kind, ground: a };
  }
  return undefined;
}

/**
 * A random station avatar, given to every new account. `random` returns a number in [0, 1), like
 * Math.random; pass a seeded one in tests.
 */
export function randomAvatar(random: () => number = Math.random): Avatar {
  const pick = <T>(list: readonly T[]): T => {
    const item = list[Math.floor(random() * list.length)];
    if (item === undefined) throw new RangeError('random() must return a number in [0, 1)');
    return item;
  };
  return { kind: 'station', design: pick(DESIGN_IDS), ground: pick(GROUND_IDS) };
}

export interface AvatarSvgOptions {
  /** Width and height in px. */
  readonly size: number;
  /** The reader's name, for the initial. Without one, an initial avatar falls back to a station. */
  readonly name?: string | null;
  /** The interface language, so a Turkish `i` becomes `İ`. */
  readonly lang?: 'en' | 'tr';
  /** Makes the clip-path id unique when several avatars share a page. */
  readonly idSuffix?: string;
}

/** The avatar as a standalone SVG string. It is decorative: the caller labels it. */
export function avatarSvg(avatar: Avatar, options: AvatarSvgOptions): string {
  const { bg, ink } = AVATAR_GROUNDS[avatar.ground];
  const size = String(options.size);
  const initial = avatar.kind === 'initial' ? initialOf(options.name, options.lang) : undefined;
  const design = avatar.kind === 'station' ? avatar.design : 'through';
  const clipId = `cspn-avatar-${design}-${avatar.ground}${options.idSuffix ? `-${options.idSuffix}` : ''}`;

  const inner =
    initial === undefined
      ? drawDesign(AVATAR_DESIGNS[design], bg, ink, clipId)
      : `<text x="24" y="31.5" text-anchor="middle" font-family="Funnel Display, system-ui, sans-serif" font-weight="700" font-size="22" fill="${ink}">${escapeXml(initial)}</text>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
    (initial === undefined
      ? `<defs><clipPath id="${clipId}"><circle cx="24" cy="24" r="24"/></clipPath></defs>`
      : '') +
    `<circle cx="24" cy="24" r="24" fill="${bg}"/>` +
    `<circle cx="24" cy="24" r="23.5" fill="none" stroke="#000" stroke-opacity="0.12"/>` +
    inner +
    `</svg>`
  );
}

function drawDesign(design: AvatarDesign, bg: string, ink: string, clipId: string): string {
  const stations = design.stations
    .map((station) => {
      const r = String(station.r ?? design.r ?? 4.5);
      const at = `cx="${String(station.x)}" cy="${String(station.y)}" r="${r}"`;
      if (station.fill === 'half') {
        const top = String(station.y - Number(r));
        return (
          `<circle ${at} fill="${bg}"/>` +
          `<path d="M${String(station.x)} ${top}a${r} ${r} 0 0 0 0 ${String(Number(r) * 2)}z" fill="${ink}" stroke="none"/>`
        );
      }
      return `<circle ${at} fill="${station.fill === 'filled' ? ink : bg}"/>`;
    })
    .join('');
  const shapes = design.shapes?.replace('/>', ` fill="${bg}"/>`) ?? '';
  return (
    `<g clip-path="url(#${clipId})" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${design.line}"/>${shapes}${stations}</g>`
  );
}

/** The first letter of a name, in capitals, or undefined when the name has no letter to show. */
export function initialOf(
  name: string | null | undefined,
  lang: 'en' | 'tr' = 'en',
): string | undefined {
  const first = name?.trim().match(/\p{L}/u)?.[0];
  return first?.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-GB');
}

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);
}
