import type { PlayerTrack } from './music';

/**
 * The music player in the browser (docs/design/decisions/music.md, "The player"): one audio
 * element for the whole page. A song row's play button plays it, or pauses it when it is the one
 * playing; at the end of a song the next visible row plays. Kept songs are stored in this browser
 * (`cspnews.music.kept`) until reader accounts carry them.
 */

const KEPT_KEY = 'cspnews.music.kept';

export function readKept(): Set<string> {
  try {
    const raw = localStorage.getItem(KEPT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeKept(kept: Set<string>): void {
  try {
    localStorage.setItem(KEPT_KEY, JSON.stringify([...kept]));
  } catch {
    // Private windows may refuse storage; keeping then lasts for this page only.
  }
}

interface Row {
  element: HTMLElement;
  track: PlayerTrack;
}

const visible = (element: HTMLElement) => !element.closest('[hidden]');

export function bindMusicPlayer(onKeep?: (kept: Set<string>) => void): void {
  const player = document.querySelector<HTMLElement>('[data-player]');
  if (!player) return;
  const find = (selector: string) => player.querySelector<HTMLElement>(selector);
  const progress = find('[data-progress]');
  const cover = player.querySelector<HTMLImageElement>('[data-cover]');
  const title = find('[data-title]');
  const artists = find('[data-artists]');
  const live = find('[data-live]');
  const pauseIcon = find('[data-icon-pause]');
  const playIcon = find('[data-icon-play]');
  const audio = new Audio();
  audio.preload = 'none';

  const rows = (): Row[] =>
    [...document.querySelectorAll<HTMLElement>('[data-track]')].map((element) => ({
      element,
      track: JSON.parse(element.dataset.track ?? '{}') as PlayerTrack,
    }));
  let current: Row | undefined;

  const showState = () => {
    const playing = !audio.paused;
    for (const { element } of rows()) {
      const now = element === current?.element;
      element.toggleAttribute('data-now', now && playing);
      element.querySelector('[data-play]')?.setAttribute('aria-pressed', String(now && playing));
    }
    if (pauseIcon) pauseIcon.hidden = !playing;
    if (playIcon) playIcon.hidden = playing;
  };

  const play = (row: Row) => {
    if (!row.track.preview) return;
    current = row;
    audio.src = row.track.preview;
    void audio.play().catch(() => {
      showState();
    });
    player.hidden = false;
    player.style.setProperty('--g', `var(--gen-${row.track.genre})`);
    if (title) title.textContent = row.track.title;
    if (artists) artists.textContent = row.track.artists;
    if (cover) {
      cover.hidden = !row.track.artwork;
      if (row.track.artwork) cover.src = row.track.artwork;
    }
    if (live) live.textContent = `${row.track.title}, ${row.track.artists}`;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: row.track.title,
        artist: row.track.artists,
        album: 'CSPNews',
        artwork: row.track.artwork ? [{ src: row.track.artwork, sizes: '300x300' }] : [],
      });
    }
  };

  const step = (by: 1 | -1) => {
    const queue = rows().filter((row) => visible(row.element) && row.track.preview);
    const index = queue.findIndex((row) => row.element === current?.element);
    const next = queue[index + by];
    if (next) play(next);
    else if (by === 1) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-play]');
    if (button) {
      const row = rows().find(({ element }) => element.contains(button));
      if (!row) return;
      if (row.element === current?.element) {
        if (audio.paused) void audio.play();
        else audio.pause();
      } else play(row);
      return;
    }
    if (target.closest('[data-play-all]')) {
      const first = rows().find((row) => visible(row.element) && row.track.preview);
      if (first) play(first);
    }
  });

  find('[data-toggle]')?.addEventListener('click', () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  });
  find('[data-prev]')?.addEventListener('click', () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else step(-1);
  });
  find('[data-next]')?.addEventListener('click', () => {
    step(1);
  });

  audio.addEventListener('play', showState);
  audio.addEventListener('pause', showState);
  audio.addEventListener('ended', () => {
    step(1);
  });
  audio.addEventListener('error', () => {
    step(1);
  });
  audio.addEventListener('timeupdate', () => {
    if (progress && audio.duration) {
      progress.style.width = `${String((audio.currentTime / audio.duration) * 100)}%`;
    }
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      step(-1);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      step(1);
    });
  }

  bindKeep(onKeep);
}

/** The bookmark on each song: keeps it in this browser's Crate. */
export function bindKeep(onChange?: (kept: Set<string>) => void): void {
  const kept = readKept();
  const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('[data-keep]')];
  for (const button of buttons()) {
    button.setAttribute('aria-pressed', String(kept.has(button.dataset.keep ?? '')));
    button.addEventListener('click', () => {
      const id = button.dataset.keep ?? '';
      if (kept.has(id)) kept.delete(id);
      else kept.add(id);
      writeKept(kept);
      for (const other of buttons()) {
        if (other.dataset.keep === id) other.setAttribute('aria-pressed', String(kept.has(id)));
      }
      onChange?.(kept);
    });
  }
}
