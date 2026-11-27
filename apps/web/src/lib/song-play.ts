/**
 * The daily song game in the browser (components/song/SongGame.astro, docs/song-game.md).
 * Four rounds a day; each starts with 0.1 s of the song and opens a longer clip after every
 * miss or skip. The day in progress, the finished days and the streak live in localStorage.
 */
import {
  CLIP_SECONDS,
  GENRES,
  MAX_TRIES,
  clipFor,
  guess,
  isOnLastClip,
  isRoundOver,
  isSameSong,
  matchRanges,
  pointsFor,
  readShareCode,
  revealText,
  searchSongs,
  secondsHeard,
  shareCode,
  songLabel,
  songStats,
  stepOf,
  totalPoints,
  type FinishedDay,
  type Round,
  type SharedResult,
  type SongName,
} from '@cspnews/songgame';
import { gameDayAt, type GameDay } from '@cspnews/wordgame';

import type { InterfaceLanguage } from './evidence';
import { MUSIC_ICONS } from './music-icons';
import {
  SONG_GAME_KEY,
  SONG_RESULTS_KEY,
  barPosition,
  scoreLineFor,
  secondsLabel,
  songPath,
  songWordsFor,
  type RevealedSong,
  type WindowSet,
} from './song';
import { loadClip, type Clip } from './song-audio';
import { countdown, msUntilNextWord, puzzleDate } from './word';

interface SavedDay {
  readonly day: GameDay;
  readonly rounds: readonly Round[];
}

const LONGEST = CLIP_SECONDS[CLIP_SECONDS.length - 1] ?? 16;

function readJson<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the game still plays, it just is not remembered.
  }
}

function isRound(value: unknown): value is Round {
  if (typeof value !== 'object' || value === null) return false;
  const round = value as { guesses?: unknown; solvedOn?: unknown; gaveUp?: unknown };
  return (
    Array.isArray(round.guesses) &&
    round.guesses.length <= 100 &&
    (round.gaveUp === undefined || typeof round.gaveUp === 'boolean') &&
    round.guesses.every((entry) => entry === null || typeof entry === 'string') &&
    (round.solvedOn === undefined || typeof round.solvedOn === 'number')
  );
}

function isSavedDay(value: unknown): value is SavedDay {
  if (typeof value !== 'object' || value === null) return false;
  const saved = value as { day?: unknown; rounds?: unknown };
  return (
    typeof saved.day === 'string' &&
    Array.isArray(saved.rounds) &&
    saved.rounds.length <= GENRES.length &&
    saved.rounds.every(isRound)
  );
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name: 'play' | 'stop' | 'share', size = 22): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    name === 'share'
      ? '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>'
      : MUSIC_ICONS[name];
  return svg;
}

export function startSongGame(root: HTMLElement): void {
  const lang = (root.dataset.lang === 'tr' ? 'tr' : 'en') satisfies InterfaceLanguage;
  const words = songWordsFor(lang);
  const sets = JSON.parse(root.dataset.window ?? '[]') as WindowSet[];
  const today = gameDayAt(new Date());
  const set = sets.find((entry) => entry.day === today);
  const friend: SharedResult | undefined = readShareCode(
    new URLSearchParams(location.search).get('vs'),
  );
  const seconds = (value: number) => secondsLabel(value, lang);

  const $ = (selector: string) => root.querySelector<HTMLElement>(selector);
  const stage = $('[data-stage]');
  const roundsList = $('[data-rounds]');
  const playButton = root.querySelector<HTMLButtonElement>('[data-play]');
  const playLabel = $('[data-play-label]');
  const bars = [...root.querySelectorAll<HTMLElement>('[data-bars] i')];
  const ticks = [...root.querySelectorAll<HTMLElement>('[data-tick]')];
  const genreTitle = $('[data-genre]');
  const count = $('[data-count]');
  const pips = [...root.querySelectorAll<HTMLElement>('[data-pips] i')];
  const tries = $('[data-tries]');
  const form = root.querySelector<HTMLFormElement>('[data-guess-form]');
  const input = root.querySelector<HTMLInputElement>('[data-guess]');
  const list = $('[data-suggestions]');
  const message = $('[data-message]');
  const skipButton = root.querySelector<HTMLButtonElement>('[data-skip]');
  const reveal = $('[data-reveal]');
  const result = $('[data-result]');
  const friendLine = $('[data-friend]');
  const announce = $('[data-announce]');

  if (!set) {
    if (stage) {
      stage.replaceChildren(element('p', 'sg-empty', words.unavailable));
    }
    return;
  }
  const daySet = set;

  // Today's answers, unscrambled once.
  const answers: RevealedSong[] = daySet.songs.map((song) => {
    const text = revealText(song.answer, daySet.day, song.genre);
    return JSON.parse(text ?? '{}') as RevealedSong;
  });

  const savedRaw = readJson<unknown>(SONG_GAME_KEY, undefined);
  const rounds: Round[] =
    isSavedDay(savedRaw) && savedRaw.day === daySet.day ? [...savedRaw.rounds] : [];
  const results = readJson<FinishedDay[]>(SONG_RESULTS_KEY, []).filter(
    (entry) => typeof entry.day === 'string' && Array.isArray(entry.rounds),
  );
  while (rounds.length < GENRES.length) rounds.push({ guesses: [] });

  const finished = () => rounds.every(isRoundOver);
  /** The round on screen: the first one still open, or the last one once all are done. */
  let current = Math.max(
    0,
    rounds.findIndex((round) => !isRoundOver(round)),
  );
  if (finished()) current = GENRES.length - 1;
  let viewingReveal = isRoundOver(rounds[current] ?? { guesses: [] });

  const clips = new Map<number, Clip>();
  const clipOf = (index: number): Clip | undefined => {
    const song = daySet.songs[index];
    if (!song) return undefined;
    let clip = clips.get(index);
    if (!clip) {
      clip = loadClip(song.preview);
      clips.set(index, clip);
    }
    return clip;
  };

  let catalog: SongName[] = [];
  void fetch(root.dataset.catalog ?? '/song/catalog.json')
    .then((response) => response.json() as Promise<[string, string][]>)
    .then((pairs) => {
      catalog = pairs.map(([artist, title]) => ({ artist, title }));
    })
    .catch(() => undefined);

  function save(): void {
    writeJson(SONG_GAME_KEY, { day: daySet.day, rounds });
    if (finished()) {
      const others = results.filter((entry) => entry.day !== daySet.day);
      const all = [...others, { day: daySet.day, rounds }].slice(-400);
      results.splice(0, results.length, ...all);
      writeJson(SONG_RESULTS_KEY, all);
    }
  }

  // ---- The four rounds along the top ----
  function renderRounds(): void {
    if (!roundsList) return;
    roundsList.querySelectorAll<HTMLElement>('[data-round]').forEach((item, index) => {
      const round = rounds[index] ?? { guesses: [] };
      item.classList.toggle('now', index === current && !finished());
      item.classList.toggle('done', isRoundOver(round));
      item.classList.toggle('named', round.solvedOn !== undefined);
    });
    const genre = GENRES[current] ?? 'pop-tr';
    root.dataset.genre = genre;
    if (genreTitle) genreTitle.textContent = words.genres[genre];
    if (count) count.textContent = words.roundOf(current + 1, GENRES.length);
  }

  // ---- The waveform ----
  /** Loudness per bar, from the decoded song; a quiet flat line until it is ready. */
  let levels: number[] = bars.map(() => 0.12);

  function loadLevels(index: number): void {
    const clip = clipOf(index);
    const song = daySet.songs[index];
    if (!clip || !song) return;
    clip.ready
      .then(() => {
        if (index !== current) return;
        const measured = clip.levels(song.start, LONGEST, bars.length);
        if (!measured) return;
        levels = measured;
        bars.forEach((item, at) => {
          item.style.setProperty('--h', (levels[at] ?? 0).toFixed(3));
        });
      })
      .catch(() => undefined);
  }

  /** Paints the bars: open up to the clip the reader may hear, the genre colour up to `heard`. */
  function renderBar(heard?: number): void {
    const round = rounds[current] ?? { guesses: [] };
    const open = isRoundOver(round) ? LONGEST : clipFor(round);
    const openAt = barPosition(open) * bars.length;
    const playedAt = heard === undefined ? -1 : barPosition(heard) * bars.length;
    bars.forEach((item, index) => {
      item.classList.toggle('open', index < openAt - 0.01);
      item.classList.toggle('played', index < playedAt);
    });
    ticks.forEach((tick, index) => {
      const length = CLIP_SECONDS[index] ?? 0;
      tick.classList.toggle('open', length <= open);
      tick.classList.toggle('edge', length === open && !isRoundOver(round));
    });
    const used = Math.min(round.guesses.length, MAX_TRIES);
    pips.forEach((pip, index) => pip.classList.toggle('used', index < used));
  }

  // ---- Play / stop ----
  let playing = false;
  function setPlaying(on: boolean): void {
    playing = on;
    if (!playButton) return;
    playButton.replaceChildren(icon(on ? 'stop' : 'play', 24));
    playButton.setAttribute('aria-label', on ? words.stop : playText());
    playButton.classList.toggle('playing', on);
    if (playLabel) playLabel.textContent = clipText();
  }

  function playText(): string {
    const round = rounds[current] ?? { guesses: [] };
    return isRoundOver(round) ? words.listen : words.play(seconds(clipFor(round)));
  }

  /** The big number beside the play button: the clip on offer, or the whole preview after. */
  function clipText(): string {
    const round = rounds[current] ?? { guesses: [] };
    return isRoundOver(round) ? seconds(30) : seconds(clipFor(round));
  }

  async function togglePlay(): Promise<void> {
    const clip = clipOf(current);
    const song = daySet.songs[current];
    if (!clip || !song) return;
    if (playing) {
      clip.stop();
      return;
    }
    const round = rounds[current] ?? { guesses: [] };
    const over = isRoundOver(round);
    // After the round, the whole preview plays from its own start.
    const from = over ? 0 : song.start;
    const length = over ? 30 : clipFor(round);
    try {
      await clip.ready;
    } catch {
      showMessage(words.loadFailed);
      return;
    }
    setPlaying(true);
    clip.play(
      from,
      length,
      (done) => {
        if (!over) renderBar(done * length);
      },
      () => {
        setPlaying(false);
        renderBar();
      },
    );
  }

  // ---- Tries ----
  const MARKS = {
    wrong: '<path d="M6 6l12 12M18 6 6 18"/>',
    skip: '<path d="M4 12h12M12 7l5 5-5 5M20 6v12"/>',
    right: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  } as const;

  function mark(kind: keyof typeof MARKS): HTMLElement {
    const holder = element('span', 'sg-try-mark');
    holder.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MARKS[kind]}</svg>`;
    return holder;
  }

  /** Only the tries made so far, newest last; the pips show how many are left. */
  function renderTries(): void {
    if (!tries) return;
    const round = rounds[current] ?? { guesses: [] };
    tries.replaceChildren(
      ...round.guesses.map((entry, index) => {
        const right = round.solvedOn === index;
        const kind = entry === null ? 'skip' : right ? 'right' : 'wrong';
        const item = element('li', `sg-try ${kind}`);
        item.append(
          mark(kind),
          element('span', 'sg-try-name', entry ?? words.skipped),
          element('span', 'sg-try-at', seconds(CLIP_SECONDS[stepOf(index)] ?? 0)),
        );
        return item;
      }),
    );
  }

  // ---- The guess box ----
  let suggestions: SongName[] = [];
  let active = -1;
  let chosen: SongName | undefined;

  function showMessage(text: string): void {
    if (!message) return;
    message.textContent = text;
    message.hidden = text === '';
  }

  /** The name with the typed words set in bold. */
  function marked(text: string, typed: string): (string | HTMLElement)[] {
    const parts: (string | HTMLElement)[] = [];
    let at = 0;
    for (const [start, end] of matchRanges(text, typed)) {
      if (start > at) parts.push(text.slice(at, start));
      parts.push(element('b', undefined, text.slice(start, end)));
      at = end;
    }
    if (at < text.length) parts.push(text.slice(at));
    return parts;
  }

  function renderSuggestions(): void {
    if (!list || !input) return;
    const typed = input.value;
    const rows: HTMLElement[] = [];
    suggestions.forEach((song, index) => {
      const option = element('li', 'sg-option');
      option.id = `sg-option-${String(index)}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === active));
      option.setAttribute('aria-label', songLabel(song));
      const title = element('span', 'sg-option-title');
      title.append(...marked(song.title, typed));
      const artist = element('span', 'sg-option-by');
      artist.append(...marked(song.artist, typed));
      option.append(title, artist);
      option.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        choose(song);
      });
      rows.push(option);
    });
    list.replaceChildren(...rows);
    const open = suggestions.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (active >= 0) input.setAttribute('aria-activedescendant', `sg-option-${String(active)}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function choose(song: SongName): void {
    chosen = song;
    if (input) input.value = songLabel(song);
    suggestions = [];
    active = -1;
    renderSuggestions();
    showMessage('');
  }

  input?.addEventListener('input', () => {
    chosen = undefined;
    showMessage('');
    suggestions = searchSongs(catalog, input.value, 5);
    active = -1;
    renderSuggestions();
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + suggestions.length) % suggestions.length;
      renderSuggestions();
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const song = suggestions[active];
      if (song) choose(song);
    } else if (event.key === 'Escape') {
      suggestions = [];
      renderSuggestions();
    }
  });

  // On a phone the keyboard hides the lower half of the screen, so bring the box up to the top
  // and let the suggestions open below it.
  input?.addEventListener('focus', () => {
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    window.setTimeout(() => {
      input.closest('.sg-field')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 250);
  });

  input?.addEventListener('blur', () => {
    suggestions = [];
    renderSuggestions();
  });

  function typedSong(): SongName | undefined {
    if (chosen) return chosen;
    const typed = input?.value.trim() ?? '';
    if (!typed) return undefined;
    // A full name typed by hand still counts when the list has exactly that song.
    const matches = searchSongs(catalog, typed, 2);
    return matches.length === 1 ? matches[0] : undefined;
  }

  function play(guessed: SongName | null): void {
    clipOf(current)?.stop();
    const before = rounds[current] ?? { guesses: [] };
    const answer = answers[current];
    const label = guessed ? songLabel(guessed) : null;
    if (label && before.guesses.includes(label)) {
      showMessage('');
      return;
    }
    const right = guessed !== null && answer !== undefined && isSameSong(guessed, answer);
    rounds[current] = guess(before, label, right);
    save();
    chosen = undefined;
    if (input) input.value = '';
    showMessage('');
    const after = rounds[current] ?? before;
    if (isRoundOver(after)) {
      viewingReveal = true;
      // Get the next song ready while the reader looks at this one.
      clipOf(current + 1);
    } else if (announce) {
      announce.textContent = words.play(seconds(clipFor(after)));
    }
    render();
    if (right && 'vibrate' in navigator) navigator.vibrate(20);
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const song = typedSong();
    if (!song) {
      showMessage(input?.value.trim() ? words.noMatch : '');
      input?.focus();
      return;
    }
    play(song);
  });

  skipButton?.addEventListener('click', () => {
    play(null);
  });
  playButton?.addEventListener('click', () => void togglePlay());

  // ---- After a round ----
  function coverImage(src: string, className: string, size: number): HTMLImageElement {
    const cover = element('img', className);
    cover.src = src;
    cover.alt = '';
    cover.width = size;
    cover.height = size;
    cover.addEventListener('error', () => {
      cover.removeAttribute('src');
    });
    return cover;
  }

  function renderReveal(): void {
    if (!reveal) return;
    const round = rounds[current] ?? { guesses: [] };
    const answer = answers[current];
    if (!answer) return;
    const heard = secondsHeard(round);

    const song = element('div', 'sg-song');
    const text = element('div', 'sg-song-text');
    text.append(
      element(
        'p',
        heard === undefined ? 'sg-verdict missed' : 'sg-verdict',
        heard === undefined ? words.notNamed : words.namedIn(seconds(heard)),
      ),
      element('h3', 'sg-title', answer.title),
    );
    const artist = element('p', 'sg-artist', answer.artist);
    if (answer.year) artist.append(element('span', 'sg-year', `, ${String(answer.year)}`));
    text.append(artist);
    song.append(coverImage(answer.artwork, 'sg-cover', 112), text);

    const points = element('p', 'sg-points');
    points.append(
      element('b', undefined, String(pointsFor(round))),
      element('span', undefined, words.pointsWord),
    );

    // The full song: YouTube first (free, no account), then Spotify and Apple Music.
    const full = element('p', 'sg-full');
    full.append(element('span', undefined, words.fullSong));
    const query = encodeURIComponent(`${answer.artist} ${answer.title}`);
    for (const [label, href] of [
      [words.youtube, `https://www.youtube.com/results?search_query=${query}`],
      ['Spotify', `https://open.spotify.com/search/${query}`],
      [words.appleMusic, answer.link],
    ] as const) {
      const link = element('a', 'sg-link', label);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      full.append(link);
    }

    const next = element(
      'button',
      'wg-btn sg-next',
      current < GENRES.length - 1 ? words.nextRound : words.seeResult,
    );
    next.type = 'button';
    next.addEventListener('click', () => {
      clipOf(current)?.stop();
      if (current < GENRES.length - 1) {
        current += 1;
        viewingReveal = false;
        levels = bars.map(() => 0.12);
        bars.forEach((item) => {
          item.style.setProperty('--h', '0.12');
        });
        loadLevels(current);
        render();
        playButton?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showResult(true);
      }
    });
    reveal.replaceChildren(song, points, full, next);
  }

  // ---- The day's score ----
  function showResult(fresh: boolean): void {
    if (!result || !stage) return;
    clipOf(current)?.stop();
    const points = totalPoints(rounds);
    const body = element('div', 'sg-result-body');

    const head = element('p', 'sg-score');
    head.append(element('b', undefined, String(points)), element('span', undefined, words.total));
    body.append(head, element('p', 'sg-score-line', scoreLineFor(points, lang)));

    const rows = element('ol', 'sg-result-rounds');
    GENRES.forEach((genre, index) => {
      const round = rounds[index] ?? { guesses: [] };
      const answer = answers[index];
      const heard = secondsHeard(round);
      const row = element('li', `g-${genre} ${heard === undefined ? 'missed' : 'named'}`);
      const text = element('div', 'sg-r-text');
      const meter = element('span', 'sg-r-heard');
      const line = element('i');
      line.style.setProperty('--heard', String(heard === undefined ? 0 : barPosition(heard)));
      meter.append(
        line,
        element('span', undefined, heard === undefined ? words.missedShort : seconds(heard)),
      );
      text.append(element('b', undefined, answer ? songLabel(answer) : words.genres[genre]), meter);
      row.append(
        coverImage(answer?.artwork ?? '', 'sg-r-cover', 48),
        text,
        element('span', 'sg-r-points', String(pointsFor(round))),
      );
      rows.append(row);
    });
    body.append(rows);

    if (friend?.day === daySet.day) {
      const versus = element('dl', 'sg-versus');
      for (const [label, value, lead] of [
        [words.you, points, points >= friend.points],
        [words.friend, friend.points, friend.points >= points],
      ] as const) {
        const cell = element('div', lead ? 'lead' : '');
        cell.append(element('dt', undefined, label), element('dd', undefined, String(value)));
        versus.append(cell);
      }
      const verdict =
        points > friend.points
          ? words.youWin
          : points < friend.points
            ? words.friendWins
            : words.tie;
      body.append(versus, element('p', 'sg-versus-line', verdict));
    }

    const stats = songStats(results, daySet.day, MAX_TRIES);
    body.append(element('p', 'sg-streak', words.streakLine(stats.streak, stats.bestStreak)));

    const actions = element('div', 'sg-result-actions');
    const share = element('button', 'wg-btn');
    share.type = 'button';
    const shareLabel = element('span', undefined, words.share);
    share.append(icon('share', 20), shareLabel);
    share.addEventListener('click', () => {
      const url = new URL(songPath(lang), location.origin);
      url.searchParams.set('vs', shareCode(daySet.day, rounds));
      const text = words.shareText(daySet.number, points);
      const copied = () => {
        shareLabel.textContent = words.copied;
        setTimeout(() => (shareLabel.textContent = words.share), 2000);
      };
      if ('share' in navigator && matchMedia('(pointer: coarse)').matches) {
        navigator.share({ text, url: url.href }).catch(() => undefined);
      } else {
        navigator.clipboard.writeText(`${text}\n${url.href}`).then(copied, () => undefined);
      }
    });
    const next = element('p', 'sg-next-set');
    const clock = element('b');
    clock.dataset.countdown = '';
    clock.textContent = countdown(msUntilNextWord(new Date()));
    next.append(element('span', undefined, words.nextSet), clock);
    actions.append(share, next);
    body.append(actions);

    result.replaceChildren(body);
    result.hidden = false;
    stage.hidden = true;
    if (fresh) window.scrollTo({ top: 0, behavior: 'smooth' });
    renderRounds();
    if (genreTitle) genreTitle.textContent = words.dayScore(daySet.number);
    if (count) count.textContent = puzzleDate(daySet.day, lang);
    delete root.dataset.genre;
  }

  // ---- Stats dialog ----
  function renderStats(): void {
    const target = $('[data-stats-body]');
    if (!target) return;
    const stats = songStats(results, today, MAX_TRIES);
    if (stats.played === 0) {
      target.replaceChildren(element('p', 'wg-note', words.noStatsYet));
      return;
    }
    const numbers = element('dl', 'sg-stats');
    for (const [label, value] of [
      [words.played, String(stats.played)],
      [words.average, String(stats.averagePoints)],
      [words.bestScore, String(stats.bestPoints)],
      [words.streakNow, String(stats.streak)],
    ] as const) {
      const cell = element('div');
      cell.append(element('dt', undefined, label), element('dd', undefined, value));
      numbers.append(cell);
    }
    const most = Math.max(1, ...stats.namedOn, stats.missed);
    const bars = element('ol', 'sg-dist');
    [...stats.namedOn, stats.missed].forEach((count, index) => {
      const row = element('li', index === MAX_TRIES ? 'missed' : '');
      row.append(
        element(
          'span',
          undefined,
          index === MAX_TRIES ? words.missed : seconds(CLIP_SECONDS[index] ?? 0),
        ),
        element('i'),
        element('b', undefined, String(count)),
      );
      row.style.setProperty('--w', String(count / most));
      bars.append(row);
    });
    target.replaceChildren(numbers, element('h3', 'sg-dist-title', words.namedOn), bars);
  }

  // ---- Dialogs ----
  for (const button of root.querySelectorAll<HTMLElement>('[data-open]')) {
    button.addEventListener('click', () => {
      const dialog = root.querySelector<HTMLDialogElement>(
        `dialog[data-dialog="${button.dataset.open ?? ''}"]`,
      );
      if (button.dataset.open === 'stats') renderStats();
      dialog?.showModal();
    });
  }
  for (const dialog of root.querySelectorAll<HTMLDialogElement>('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  // ---- A friend's score in the link ----
  if (friend && friendLine) {
    friendLine.textContent =
      friend.day === daySet.day
        ? words.friendScored(friend.points)
        : words.friendOtherDay(friend.points, puzzleDate(friend.day, lang));
    friendLine.hidden = false;
  }

  // ---- Everything on screen ----
  function render(): void {
    const round = rounds[current] ?? { guesses: [] };
    const over = isRoundOver(round);
    renderRounds();
    renderBar();
    renderTries();
    setPlaying(false);
    if (form) form.hidden = over;
    if (reveal) {
      reveal.hidden = !over || !viewingReveal;
      if (over) renderReveal();
    }
    if (skipButton) {
      skipButton.textContent = isOnLastClip(round)
        ? words.giveUp
        : words.skip(
            seconds(
              (CLIP_SECONDS[round.guesses.length + 1] ?? 0) -
                (CLIP_SECONDS[round.guesses.length] ?? 0),
            ),
          );
    }
    stage?.classList.toggle('over', over);
  }

  clipOf(current);
  loadLevels(current);
  render();
  if (finished()) showResult(false);
  else if (results.length === 0 && rounds.every((r) => r.guesses.length === 0) && !friend) {
    root.querySelector<HTMLDialogElement>('dialog[data-dialog="help"]')?.showModal();
  }

  // The countdown, and a fresh page when the new songs arrive.
  setInterval(() => {
    const left = msUntilNextWord(new Date());
    for (const clock of root.querySelectorAll('[data-countdown]'))
      clock.textContent = countdown(left);
    if (gameDayAt(new Date()) !== daySet.day && !playing) location.reload();
  }, 1000);
}
