/**
 * The daily word game in the browser: input, scoring, saving and the finish sheet. The page
 * (components/word/WordGame.astro) renders the board and keyboard; this fills them in.
 */
import {
  MAX_TRIES,
  WORD_LENGTH,
  alphabetOf,
  gameDayAt,
  isSolved,
  keyboardMarks,
  lettersOf,
  normalizeWord,
  recentDays,
  revealWord,
  scoreGuess,
  statsOf,
  streakOn,
  type GameDay,
  type GameLanguage,
  type GameResult,
  type Mark,
} from '@cspnews/wordgame';

import { ICONS } from './icons';
import {
  GAME_PATHS,
  countdown,
  gameWordsFor,
  lostLineFor,
  msUntilNextWord,
  parseResults,
  parseSavedGame,
  praiseFor,
  puzzleDate,
  shareText,
  type GameWords,
  type WindowDay,
} from './word';
import { sameResults, syncWordResults } from './word-sync';

const FLIP_STEP_MS = 170;
const FLIP_MS = 460;
const MESSAGE_MS = 2200;
const HELP_SEEN = 'cspnews:word:help-seen';

const gameKey = (language: GameLanguage) => `cspnews:word:${language}:game`;
const resultsKey = (language: GameLanguage) => `cspnews:word:${language}:results`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the game still plays, it just isn't kept.
  }
}

const MARK_CLASS: Readonly<Record<Mark, string>> = {
  correct: 'correct',
  present: 'present',
  absent: 'absent',
};

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

function restart(node: Element, className: string): void {
  node.classList.remove(className);
  node.getBoundingClientRect(); // Forces a reflow, so the animation starts again.
  node.classList.add(className);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function windowFrom(root: HTMLElement): WindowDay[] {
  try {
    const value: unknown = JSON.parse(root.dataset.window ?? '[]');
    return Array.isArray(value) ? (value as WindowDay[]) : [];
  } catch {
    return [];
  }
}

/** A row of small coloured squares for each try: the result without the letters. */
function miniGrid(rows: readonly (readonly Mark[])[]): HTMLElement {
  const grid = element('div', 'wg-mini');
  grid.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < MAX_TRIES; index += 1) {
    const row = element('div');
    const marks = rows[index];
    for (let letter = 0; letter < WORD_LENGTH; letter += 1) {
      const mark = marks?.[letter];
      row.append(element('i', mark ? MARK_CLASS[mark] : undefined));
    }
    grid.append(row);
  }
  return grid;
}

/** The streak card: the count and the last seven days, with the rest day dashed. */
function streakCard(
  results: readonly GameResult[],
  today: GameDay,
  words: GameWords,
  shown?: number,
): HTMLElement {
  const streak = streakOn(results, today);
  const card = element('div', 'wg-streak');
  const count = element('span', 'wg-streak-n', String(shown ?? streak.current));
  count.dataset.streak = String(streak.current);
  const label = element('span', 'wg-streak-label', words.streak);
  if (streak.best > 0) label.append(element('small', undefined, words.best(streak.best)));
  const week = element('ol', 'wg-week');
  // Days before the reader's first game are left blank rather than marked missed.
  const firstPlayed = results.reduce<GameDay>((first, r) => (r.day < first ? r.day : first), today);
  for (const { day, status } of recentDays(results, today)) {
    const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
    const item = element('li');
    const before = day < firstPlayed;
    item.append(element('i', before ? 'none' : status), words.weekdays[weekday] ?? '');
    if (!before) item.setAttribute('aria-label', words.dayStatus[status]);
    week.append(item);
  }
  card.append(count, label, week);
  return card;
}

/** Played, solved and how many tries each solve took. */
function statsView(
  results: readonly GameResult[],
  today: GameDay,
  words: GameWords,
  now?: number,
): HTMLElement {
  const stats = statsOf(results);
  const view = element('div', 'wg-stats');
  view.append(streakCard(results, today, words));
  if (stats.played === 0) {
    view.append(element('p', 'wg-note', words.noStatsYet));
    return view;
  }
  const totals = element('dl', 'wg-totals');
  const share = Math.round((stats.solved / stats.played) * 100);
  for (const [term, value] of [
    [words.played, String(stats.played)],
    [words.solvedShare, `${String(share)}%`],
  ] as const) {
    const item = element('div');
    item.append(element('dt', undefined, term), element('dd', undefined, value));
    totals.append(item);
  }
  view.append(totals, distribution(stats.byTries, words, now));
  return view;
}

function distribution(byTries: readonly number[], words: GameWords, now?: number): HTMLElement {
  const box = element('div', 'wg-dist');
  box.append(element('p', 'wg-dist-title', words.guessDistribution));
  const max = Math.max(1, ...byTries);
  byTries.forEach((count, index) => {
    const row = element('div');
    const bar = element('span', index + 1 === now ? 'now' : undefined, String(count));
    bar.style.width = `${String(Math.max(8, (count / max) * 100))}%`;
    row.append(element('b', undefined, String(index + 1)), bar);
    box.append(row);
  });
  return box;
}

export function startWordGame(root: HTMLElement): void {
  const language: GameLanguage = root.dataset.lang === 'tr' ? 'tr' : 'en';
  const words = gameWordsFor(language);
  const alphabet = new Set(alphabetOf(language));
  const today = gameDayAt(new Date());
  const puzzle = windowFrom(root).find((entry) => entry.day === today);
  const answer = puzzle && revealWord(puzzle.word, today, language);

  const $ = (selector: string) => root.querySelector<HTMLElement>(selector) ?? undefined;
  const stage = $('[data-stage]');
  const rowsOf = () => [...root.querySelectorAll<HTMLElement>('[data-board] .wg-row')];
  const keyboard = $('[data-keyboard]');
  const sheet = $('[data-sheet]');
  const sheetBody = $('[data-sheet-body]');
  const puzzleLine = $('[data-puzzle]');
  const message = $('[data-msg]');
  const announce = $('[data-announce]');
  const pips = [...root.querySelectorAll<HTMLElement>('[data-pips] i')];

  // Language dots: filled when today's puzzle in that language is finished.
  for (const dot of root.querySelectorAll<HTMLElement>('[data-done-dot]')) {
    const other: GameLanguage = dot.dataset.doneDot === 'tr' ? 'tr' : 'en';
    const finished = parseResults(read(resultsKey(other))).some((r) => r.day === today);
    dot.classList.toggle('done', finished);
  }

  let messageTimer: number | undefined;
  function say(main: string, note: string, kind: 'error' | 'good' | 'plain' = 'error'): void {
    if (!message || !puzzleLine) return;
    window.clearTimeout(messageTimer);
    const [mainText, noteText] = [
      message.querySelector('[data-msg-main]'),
      message.querySelector('[data-msg-note]'),
    ];
    if (mainText) mainText.textContent = main;
    if (noteText) noteText.textContent = note;
    message.dataset.kind = kind;
    message.hidden = false;
    puzzleLine.hidden = true;
    restart(message, 'drop');
    if (kind === 'error') {
      messageTimer = window.setTimeout(() => {
        message.hidden = true;
        puzzleLine.hidden = false;
      }, MESSAGE_MS);
    }
  }

  function setKeysEnabled(enabled: boolean): void {
    for (const key of root.querySelectorAll<HTMLButtonElement>('[data-key]'))
      key.disabled = !enabled;
  }

  // Before the first day, or a build too old to carry today's word: say so and stop.
  if (!puzzle || !answer) {
    const firstDay = windowFrom(root)[0]?.day;
    const before = firstDay !== undefined && today < firstDay && puzzle === undefined;
    say(before ? words.notStarted(puzzleDate(firstDay, language)) : words.unavailable, '', 'plain');
    setKeysEnabled(false);
    return;
  }

  const solution = answer;
  const puzzleNo = puzzle.number;
  const saved = parseSavedGame(read(gameKey(language)), language);
  const guesses: string[] = saved?.day === today ? [...saved.guesses] : [];
  let results = parseResults(read(resultsKey(language)));
  let current = '';
  let busy = false;

  const number = $('[data-number]');
  if (number) number.textContent = `${words.puzzle} ${String(puzzle.number)}`;
  const date = $('[data-date]');
  if (date) date.textContent = puzzleDate(today, language);

  // The guess list loads in the background; until it does, any five-letter word is taken.
  let accepted: Set<string> | undefined;
  const guessList = fetch(`/word/guesses-${language}.txt`)
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error('missing'))))
    .then((text) => {
      accepted = new Set(text.split('\n').filter(Boolean));
      accepted.add(solution);
    })
    .catch(() => undefined);

  const finished = () => guesses.length >= MAX_TRIES || guesses.at(-1) === solution;

  function paintRow(index: number, word: string, marks?: readonly Mark[]): void {
    const row = rowsOf()[index];
    if (!row) return;
    const letters = lettersOf(word);
    [...row.children].forEach((tile, position) => {
      const letter = letters[position] ?? '';
      tile.textContent = letter;
      tile.className = 'wg-t';
      if (marks?.[position]) tile.classList.add(MARK_CLASS[marks[position]]);
      else if (letter) tile.classList.add('typed');
      (tile as HTMLElement).style.setProperty('--d', `${String(position * FLIP_STEP_MS)}ms`);
    });
  }

  function paintKeyboard(): void {
    const marks = keyboardMarks(guesses, solution);
    for (const key of root.querySelectorAll<HTMLElement>('[data-key]')) {
      const letter = key.dataset.key ?? '';
      const mark = marks.get(letter);
      key.classList.remove('correct', 'present', 'absent');
      if (mark) key.classList.add(MARK_CLASS[mark]);
    }
  }

  function paintPips(): void {
    pips.forEach((pip, index) => pip.classList.toggle('used', index < guesses.length));
    const pipBox = $('[data-pips]');
    pipBox?.setAttribute('aria-label', words.triesLeft(MAX_TRIES - guesses.length));
    pipBox?.setAttribute('role', 'img');
  }

  function save(): void {
    write(gameKey(language), JSON.stringify({ day: today, guesses }));
  }

  function rowsMarks(): Mark[][] {
    return guesses.map((guess) => scoreGuess(guess, solution));
  }

  function shareUrl(): string {
    return new URL(GAME_PATHS[language], location.origin).href;
  }

  function showSheet(fresh: boolean): void {
    if (!sheet || !sheetBody || !stage) return;
    const solved = guesses.at(-1) === solution;
    const before = results.filter((result) => result.day !== today);
    const streakBefore = streakOn(before, today).current;

    stage.classList.add('done');
    window.clearTimeout(messageTimer);
    if (message) message.hidden = true;
    if (puzzleLine) puzzleLine.hidden = false;
    if (keyboard) keyboard.hidden = true;
    sheetBody.replaceChildren();

    if (solved) {
      const praise = element('div', 'wg-praise');
      const text = element('div');
      text.append(
        element('h2', undefined, praiseFor(guesses.length, language)),
        element('p', undefined, words.solvedIn(guesses.length)),
      );
      praise.append(miniGrid(rowsMarks()), text);
      sheetBody.append(praise);
    } else {
      const reveal = element('div', 'wg-answer');
      const row = element('div', 'wg-row wg-small');
      for (const letter of lettersOf(solution)) row.append(element('span', 'wg-t correct', letter));
      const streak = streakOn(results, today);
      const note = streak.restDays.includes(today)
        ? words.restDayKept
        : streakBefore > 0
          ? words.newStreak
          : words.tryTomorrow;
      const text = element('div');
      text.append(
        element('h2', undefined, lostLineFor(today, language)),
        element('p', undefined, note),
      );
      reveal.append(row, text);
      sheetBody.append(reveal);
    }

    const animate = fresh && solved && !reducedMotion();
    const card = streakCard(results, today, words, animate ? streakBefore : undefined);
    sheetBody.append(card);
    if (animate) {
      window.setTimeout(() => {
        const count = card.querySelector<HTMLElement>('.wg-streak-n');
        if (!count || count.textContent === count.dataset.streak) return;
        count.textContent = count.dataset.streak ?? '';
        restart(count, 'bump');
      }, 520);
    }

    const actions = element('div', 'wg-actions');
    const share = element('button', 'wg-btn');
    share.type = 'button';
    const shareLabel = element('span', undefined, words.share);
    share.append(iconShare(), shareLabel);
    share.addEventListener('click', () => {
      const text = shareText(language, puzzleNo, rowsMarks(), solved, shareUrl());
      const copied = () => {
        shareLabel.textContent = words.copied;
        window.setTimeout(() => {
          shareLabel.textContent = words.share;
        }, 2000);
      };
      if ('share' in navigator && matchMedia('(pointer: coarse)').matches) {
        navigator.share({ text }).catch(() => undefined);
      } else {
        navigator.clipboard.writeText(text).then(copied, () => undefined);
      }
    });
    const next = element('div', 'wg-next', words.nextWord);
    const clock = element('b');
    clock.dataset.countdown = '';
    clock.textContent = countdown(msUntilNextWord(new Date()));
    next.append(clock);
    actions.append(share, next);
    sheetBody.append(actions);

    sheet.hidden = false;
    if (fresh) restart(sheet, 'rise');
  }

  function record(): void {
    const solved = guesses.at(-1) === solution;
    if (results.some((result) => result.day === today)) return;
    results = [...results, { day: today, tries: guesses.length, solved }];
    write(resultsKey(language), JSON.stringify(results));
    root.querySelector(`[data-done-dot="${language}"]`)?.classList.add('done');
    void sync();
  }

  /** Signed in: send this browser's days to the account and take in days from other devices. */
  async function sync(): Promise<void> {
    const combined = await syncWordResults(language, results);
    if (!combined || sameResults(combined, results)) return;
    results = combined;
    write(resultsKey(language), JSON.stringify(results));
    root.querySelector(`[data-done-dot="${language}"]`)?.classList.toggle(
      'done',
      results.some((r) => r.day === today),
    );
    // The finish sheet shows the streak; draw it again with the account's days.
    if (sheet && !sheet.hidden) showSheet(false);
  }

  function describe(guess: string, marks: readonly Mark[]): string {
    return lettersOf(guess)
      .map((letter, index) => `${letter} ${words.letterMark[marks[index] ?? 'absent']}`)
      .join(', ');
  }

  function typeLetter(letter: string): void {
    if (busy || finished() || lettersOf(current).length >= WORD_LENGTH) return;
    current += letter;
    const index = lettersOf(current).length - 1;
    paintRow(guesses.length, current);
    const tile = rowsOf()[guesses.length]?.children[index];
    if (tile && !reducedMotion()) restart(tile, 'pop');
  }

  function deleteLetter(): void {
    if (busy || finished()) return;
    current = lettersOf(current).slice(0, -1).join('');
    paintRow(guesses.length, current);
  }

  function reject(main: string, note: string): void {
    const row = rowsOf()[guesses.length];
    row?.classList.add('bad');
    if (row && !reducedMotion()) restart(row, 'shake');
    window.setTimeout(() => row?.classList.remove('bad'), MESSAGE_MS);
    try {
      navigator.vibrate([25, 40, 25]);
    } catch {
      // Not every browser can vibrate.
    }
    say(main, note);
  }

  async function submit(): Promise<void> {
    if (busy || finished()) return;
    if (lettersOf(current).length < WORD_LENGTH) {
      reject(words.tooShort, words.tooShortNote);
      return;
    }
    busy = true;
    await guessList;
    if (accepted && !accepted.has(current)) {
      busy = false;
      reject(words.notInList(current), words.noTryUsed);
      return;
    }

    const guess = current;
    const marks = scoreGuess(guess, solution);
    const index = guesses.length;
    guesses.push(guess);
    current = '';
    save();
    paintRow(index, guess, marks);
    paintPips();
    const row = rowsOf()[index];
    const motion = !reducedMotion();
    if (row && motion) restart(row, 'reveal');
    if (announce) announce.textContent = describe(guess, marks);

    const revealMs = motion ? (WORD_LENGTH - 1) * FLIP_STEP_MS + FLIP_MS : 0;
    window.setTimeout(() => {
      paintKeyboard();
      row?.classList.remove('reveal');
      if (!finished()) {
        busy = false;
        return;
      }
      record();
      if (isSolved(marks)) {
        if (row && motion) restart(row, 'win');
        say(praiseFor(guesses.length, language), words.solvedIn(guesses.length), 'good');
        window.setTimeout(
          () => {
            showSheet(true);
          },
          motion ? 1400 : 0,
        );
      } else {
        showSheet(true);
      }
    }, revealMs);
  }

  function press(key: string): void {
    if (key === 'enter') void submit();
    else if (key === 'delete') deleteLetter();
    else if (alphabet.has(key)) typeLetter(key);
  }

  // Restore today's game.
  guesses.forEach((guess, index) => {
    paintRow(index, guess, scoreGuess(guess, solution));
  });
  paintKeyboard();
  paintPips();
  if (finished()) {
    record();
    showSheet(false);
  }

  keyboard?.addEventListener('click', (event) => {
    const key = (event.target as Element).closest<HTMLElement>('[data-key]');
    if (!key?.dataset.key) return;
    // Let go of focus, so a later Enter on a hardware keyboard submits instead of pressing this key.
    key.blur();
    press(key.dataset.key);
  });

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Enter') {
      // A focused button handles Enter itself.
      if ((event.target as Element).closest('button, a')) return;
      event.preventDefault();
      press('enter');
    } else if (event.key === 'Backspace') {
      press('delete');
    } else if (event.key.length === 1) {
      press(normalizeWord(event.key, language));
    }
  });

  // Dialogs: how to play (shown once on a first visit) and stats.
  const dialogs = new Map(
    [...root.querySelectorAll<HTMLDialogElement>('dialog[data-dialog]')].map((d) => [
      d.dataset.dialog,
      d,
    ]),
  );
  const openDialog = (name: string) => {
    const dialog = dialogs.get(name);
    if (!dialog) return;
    if (name === 'stats') {
      const body = dialog.querySelector('[data-stats-body]');
      const solvedToday = results.find((r) => r.day === today && r.solved);
      body?.replaceChildren(statsView(results, today, words, solvedToday?.tries));
    }
    dialog.showModal();
  };
  for (const button of root.querySelectorAll<HTMLElement>('[data-open]')) {
    button.addEventListener('click', () => {
      openDialog(button.dataset.open ?? '');
    });
  }
  for (const dialog of dialogs.values()) {
    // A tap on the dimmed area outside the sheet closes it.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  if (!read(HELP_SEEN) && guesses.length === 0 && results.length === 0) {
    write(HELP_SEEN, '1');
    openDialog('help');
  }

  void sync();
  // Signing in on this page brings in the account's days straight away.
  document.addEventListener('cspnews:signed-in', () => void sync());

  // The countdown, and a fresh page when the new word arrives.
  window.setInterval(() => {
    const left = msUntilNextWord(new Date());
    for (const clock of root.querySelectorAll('[data-countdown]')) {
      clock.textContent = countdown(left);
    }
    if (gameDayAt(new Date()) !== today && !busy) location.reload();
  }, 1000);
}

function iconShare(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS.share;
  return svg;
}
