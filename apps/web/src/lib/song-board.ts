/**
 * The Daily Song board on the score screen (docs/design/decisions/song-board.md). After the
 * fourth song the reader sees today's top names; they may add their own, under a made-up name
 * they can keep or type over. Nothing is sent until they press the button. The board lives in
 * the live Worker; without PUBLIC_LIVE_SCORES_URL the section is not drawn.
 */
import {
  GENRES,
  NAME_MAX,
  madeUpName,
  nameProblem,
  type BoardRow,
  type BoardView,
  type Round,
  type SongName,
} from '@cspnews/songgame';

import type { InterfaceLanguage } from './evidence';
import { liveBase } from './live';

const ID_KEY = 'cspnews:song:board-id';
const NAME_KEY = 'cspnews:song:board-name';
const JOINED_KEY = 'cspnews:song:board-joined';

const WORDS = {
  en: {
    title: "Today's board",
    players: (n: string) => `${n} players`,
    empty: 'Nobody is on today’s board yet.',
    label: 'Your name on the board',
    hint: 'We picked a made-up one. Type over it, or tap the arrows for another.',
    another: 'Another made-up name',
    join: 'Add me to the board',
    joining: 'Adding…',
    note: 'Only this name and your score are shown.',
    you: 'you',
    place: (rank: string, of: string) => `You’re ${rank} of ${of}.`,
    ordinal: (n: number) => {
      const tens = n % 100;
      const ones = n % 10;
      const tail =
        tens >= 11 && tens <= 13
          ? 'th'
          : ones === 1
            ? 'st'
            : ones === 2
              ? 'nd'
              : ones === 3
                ? 'rd'
                : 'th';
      return `${n.toLocaleString('en-GB')}${tail}`;
    },
    problems: {
      short: 'At least 2 letters.',
      long: `${String(NAME_MAX)} letters at most.`,
      letters: 'Letters, numbers and spaces only.',
      rude: 'Pick a kinder name.',
      spoiler: 'That gives away one of today’s songs. Try another.',
      busy: 'Too many names from this network today.',
      other: 'Couldn’t add you just now. Try again in a moment.',
    },
    played: (tries: number) => (tries === 0 ? 'missed' : `named on try ${String(tries)}`),
  },
  tr: {
    title: 'Bugünün listesi',
    players: (n: string) => `${n} oyuncu`,
    empty: 'Bugünün listesinde henüz kimse yok.',
    label: 'Listedeki adın',
    hint: 'Senin için uydurma bir isim seçtik. Üzerine yaz ya da oklara dokunup başkasını al.',
    another: 'Başka bir uydurma isim',
    join: 'Beni listeye ekle',
    joining: 'Ekleniyor…',
    note: 'Yalnızca bu isim ve puanın görünür.',
    you: 'sen',
    place: (rank: string, of: string) => `${of} kişi içinde ${rank} sıradasın.`,
    ordinal: (n: number) => `${n.toLocaleString('tr-TR')}.`,
    problems: {
      short: 'En az 2 harf.',
      long: `En fazla ${String(NAME_MAX)} harf.`,
      letters: 'Yalnızca harf, rakam ve boşluk.',
      rude: 'Daha kibar bir isim seç.',
      spoiler: 'Bu, bugünün şarkılarından birini ele veriyor. Başka bir isim dene.',
      busy: 'Bu ağdan bugün çok fazla isim eklendi.',
      other: 'Şu an eklenemedi. Biraz sonra yeniden dene.',
    },
    played: (tries: number) => (tries === 0 ? 'bilinemedi' : `${String(tries)}. denemede bilindi`),
  },
} as const;

type Problem = keyof (typeof WORDS)['en']['problems'];

const REFRESH_ICON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>';

function stored(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows may refuse; the board still works for this visit.
  }
}

function readerId(): string {
  const known = stored(ID_KEY);
  if (known && /^[\w-]{8,64}$/.test(known)) return known;
  const fresh = crypto.randomUUID();
  store(ID_KEY, fresh);
  return fresh;
}

function joinedDays(): string[] {
  try {
    const list = JSON.parse(stored(JOINED_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((day): day is string => typeof day === 'string') : [];
  } catch {
    return [];
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readView(json: unknown): BoardView | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const view = json as Partial<BoardView>;
  return Array.isArray(view.top) && typeof view.players === 'number'
    ? (view as BoardView)
    : undefined;
}

export interface BoardContext {
  readonly lang: InterfaceLanguage;
  readonly day: string;
  readonly rounds: readonly Round[];
  readonly answers: readonly SongName[];
}

/** Draws the board into `section` once the Worker answers; leaves it hidden if it can't. */
export function mountSongBoard(section: HTMLElement, context: BoardContext): void {
  const base = liveBase();
  if (!base) return;
  const api = base;
  const words = WORDS[context.lang];
  const number = (n: number) => n.toLocaleString(context.lang === 'tr' ? 'tr-TR' : 'en-GB');
  const id = readerId();
  let name = stored(NAME_KEY) ?? madeUpName(context.lang);
  // A remembered name that would give away today's songs is swapped for a made-up one.
  while (nameProblem(name, context.answers)) name = madeUpName(context.lang);

  const boardUrl = new URL(`${api}/song/board`);
  boardUrl.searchParams.set('day', context.day);
  if (joinedDays().includes(context.day)) boardUrl.searchParams.set('me', id);

  void fetch(boardUrl)
    .then((response) => (response.ok ? response.json() : undefined))
    .then((json: unknown) => {
      const view = readView(json);
      if (view) draw(view);
    })
    .catch(() => undefined);

  function row(entry: BoardRow, mine: boolean): HTMLLIElement {
    const item = el('li', mine ? 'sb-row me' : 'sb-row');
    const who = el('span', 'sb-name', entry.name);
    if (mine) who.append(' ', el('em', undefined, `(${words.you})`));
    const marks = el('span', 'sb-marks');
    marks.setAttribute('aria-label', entry.tries.map((tries) => words.played(tries)).join(', '));
    entry.tries.forEach((tries, index) => {
      const mark = el('i', `g-${GENRES[index] ?? 'hits'}${tries === 0 ? ' x' : ''}`);
      mark.style.setProperty('--h', String(tries === 0 ? 0 : (7 - tries) / 6));
      marks.append(mark);
    });
    item.append(
      el('span', 'sb-rank', number(entry.rank)),
      who,
      marks,
      el('b', 'sb-points', String(entry.points)),
    );
    return item;
  }

  function draw(view: BoardView): void {
    const head = el('div', 'sb-head');
    head.append(
      el('h3', undefined, words.title),
      el('span', undefined, words.players(number(view.players))),
    );
    const parts: HTMLElement[] = [head];
    const me = view.me;
    if (view.top.length === 0) {
      parts.push(el('p', 'sb-line', words.empty));
    } else {
      const list = el('ol', 'sb-list');
      const shown = me ? view.top : view.top.slice(0, 3);
      for (const entry of shown) list.append(row(entry, me?.rank === entry.rank));
      if (me && view.around) {
        list.append(el('li', 'sb-gap', '···'));
        for (const entry of view.around) list.append(row(entry, entry.rank === me.rank));
      }
      parts.push(list);
    }
    if (me) {
      const line = el('p', 'sb-line');
      const [before, after] = words.place('\u0000', number(view.players)).split('\u0000');
      line.append(before ?? '', el('b', undefined, words.ordinal(me.rank)), after ?? '');
      parts.push(line);
    } else {
      parts.push(joinForm());
    }
    section.replaceChildren(...parts);
    section.hidden = false;
  }

  function joinForm(): HTMLFormElement {
    const form = el('form', 'sb-join');
    form.noValidate = true;
    const fieldId = `sb-name-${context.day}`;
    const label = el('label', undefined, words.label);
    label.htmlFor = fieldId;
    const hint = el('p', 'sb-hint', words.hint);
    hint.id = `${fieldId}-hint`;
    const box = el('div', 'sb-box');
    const input = el('input');
    input.id = fieldId;
    input.value = name;
    input.maxLength = NAME_MAX + 4;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'done';
    input.setAttribute('aria-describedby', hint.id);
    const dice = el('button', 'sb-dice');
    dice.type = 'button';
    dice.setAttribute('aria-label', words.another);
    dice.innerHTML = REFRESH_ICON;
    box.append(input, dice);
    const message = el('p', 'sb-problem');
    message.setAttribute('role', 'status');
    message.hidden = true;
    const button = el('button', 'wg-btn', words.join);
    button.type = 'submit';
    form.append(label, hint, box, message, button, el('p', 'sb-note', words.note));

    const say = (problem: Problem | undefined) => {
      message.textContent = problem ? words.problems[problem] : '';
      message.hidden = !problem;
      box.classList.toggle('bad', problem !== undefined);
    };
    dice.addEventListener('click', () => {
      let next = madeUpName(context.lang);
      while (next === input.value || nameProblem(next, context.answers))
        next = madeUpName(context.lang);
      input.value = next;
      say(undefined);
    });
    input.addEventListener('input', () => {
      say(undefined);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const typed = input.value;
      const problem = nameProblem(typed, context.answers);
      if (problem) {
        say(problem);
        input.focus();
        return;
      }
      button.disabled = true;
      button.textContent = words.joining;
      void fetch(`${api}/song/board`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          day: context.day,
          id,
          name: typed,
          rounds: context.rounds.map((round) => ({
            guesses: round.guesses,
            ...(round.gaveUp === true && { gaveUp: true }),
          })),
        }),
      })
        .then(async (response) => {
          const json = (await response.json().catch(() => undefined)) as unknown;
          const view = response.ok ? readView(json) : undefined;
          if (view) {
            store(NAME_KEY, typed.trim());
            store(JOINED_KEY, JSON.stringify([...joinedDays(), context.day].slice(-14)));
            draw(view);
            return;
          }
          const sent = (json as { problem?: string } | undefined)?.problem;
          say(sent && sent in words.problems ? (sent as Problem) : 'other');
        })
        .catch(() => {
          say('other');
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = words.join;
        });
    });
    return form;
  }
}
