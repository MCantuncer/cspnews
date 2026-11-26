/** Inner SVG of each music mark; MusicIcon.astro wraps it. Shared with the player script. */
export const MUSIC_ICONS = {
  global:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 2.8 3 15.2 0 18M12 3c-3 2.8-3 15.2 0 18"/>',
  turkey:
    '<rect x="8.5" y="3" width="7" height="11" rx="3.5"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  techno: '<path d="M3 12h1.5M7.5 8v8M12 4v16M16.5 8v8M19.5 12H21"/>',
  indiedance:
    '<path d="M12 2.5v3"/><circle cx="12" cy="13" r="7.5"/><path d="M4.5 13h15M12 5.5v15M6.6 8.5c3.3 1.6 7.5 1.6 10.8 0M6.6 17.5c3.3-1.6 7.5-1.6 10.8 0"/>',
  new: '<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>',
  climbing: '<path d="M3.5 17l5.5-5.5 3.5 3.5 7-7M14.5 8h5v5"/>',
  back: '<path d="M19 12a7 7 0 1 1-2.2-5.1M19 4v4h-4"/>',
  alltime: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  play: '<path d="M8 5.5l10 6.5-10 6.5z" fill="currentColor"/>',
  pause:
    '<rect x="7" y="5.5" width="3.2" height="13" rx="1" fill="currentColor"/><rect x="13.8" y="5.5" width="3.2" height="13" rx="1" fill="currentColor"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/>',
  previous: '<path d="M18 6l-8.5 6 8.5 6zM6 6v12"/>',
  next: '<path d="M6 6l8.5 6L6 18zM18 6v12"/>',
  keep: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/>',
  record: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
} as const;

export type MusicIconName = keyof typeof MUSIC_ICONS;
