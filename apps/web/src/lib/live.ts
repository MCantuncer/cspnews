/**
 * Live scores on the page (docs/design/decisions/tonight.md): rows on the Tonight list and the
 * Today line's match carry `data-live-ref` ("espn:soccer/uefa.nations/401"). While one of them may
 * be playing and the tab is open, the page asks the live scores Worker (apps/live) for them: every
 * minute while a match is on, every five minutes while one has yet to start, and never once all
 * are over. Without `PUBLIC_LIVE_SCORES_URL` nothing is asked and rows move on by the clock.
 */
import type { PersonLine } from '@cspnews/core';

import type { InterfaceLanguage } from './evidence.js';
import { orderScorers, personMarks, tonightWords } from './tonight.js';

export interface LiveScore {
  readonly ref: string;
  readonly state: 'pre' | 'in' | 'post';
  readonly home?: number;
  readonly away?: number;
  readonly clock?: string;
  readonly lines?: readonly PersonLine[];
  readonly scorers?: readonly LiveScorer[];
}

export interface LiveScorer {
  readonly side: 'home' | 'away';
  readonly name: string;
  readonly minutes?: readonly string[];
  readonly points?: number;
  readonly own?: boolean;
  readonly penalty?: boolean;
  /** The official photo's address at the source. */
  readonly photo?: string;
}

const MINUTE = /^\d{1,3}(\+\d{1,2})?'$/;

/** A scorer from the Worker, only if every field reads cleanly; text is set with textContent. */
function readScorer(raw: unknown): LiveScorer[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const s = raw as Record<string, unknown>;
  if (s.side !== 'home' && s.side !== 'away') return [];
  if (typeof s.name !== 'string' || s.name === '' || s.name.length > 60) return [];
  const minutes = Array.isArray(s.minutes)
    ? s.minutes.filter((m): m is string => typeof m === 'string' && MINUTE.test(m)).slice(0, 8)
    : [];
  const photo =
    typeof s.photo === 'string' && /^https:\/\/[^\s"'<>]+$/.test(s.photo) ? s.photo : undefined;
  if (minutes.length === 0 && !isCount(s.points)) return [];
  return [
    {
      side: s.side,
      name: s.name,
      ...(minutes.length > 0 && { minutes }),
      ...(minutes.length === 0 && isCount(s.points) && { points: s.points }),
      ...(s.own === true && { own: true }),
      ...(s.penalty === true && { penalty: true }),
      ...(photo && { photo }),
    },
  ];
}

export function liveBase(): string | undefined {
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const value = env?.PUBLIC_LIVE_SCORES_URL;
  return typeof value === 'string' && value !== '' ? value.replace(/\/+$/, '') : undefined;
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The Worker's answer, keeping only scores that read cleanly. */
export function readScores(json: unknown): LiveScore[] {
  if (typeof json !== 'object' || json === null) return [];
  const list = (json as { scores?: unknown }).scores;
  if (!Array.isArray(list)) return [];
  return list.flatMap((raw): LiveScore[] => {
    if (typeof raw !== 'object' || raw === null) return [];
    const s = raw as Record<string, unknown>;
    if (typeof s.ref !== 'string' || !['pre', 'in', 'post'].includes(String(s.state))) return [];
    const lines = Array.isArray(s.lines)
      ? s.lines.filter(
          (line): line is PersonLine =>
            typeof line === 'object' &&
            line !== null &&
            typeof (line as PersonLine).person === 'string',
        )
      : [];
    return [
      {
        ref: s.ref,
        state: s.state as LiveScore['state'],
        ...(isCount(s.home) && { home: s.home }),
        ...(isCount(s.away) && { away: s.away }),
        ...(typeof s.clock === 'string' && s.clock !== '' && { clock: s.clock.slice(0, 24) }),
        ...(lines.length > 0 && { lines }),
        ...(Array.isArray(s.scorers) && {
          scorers: s.scorers.slice(0, 16).flatMap(readScorer),
        }),
      },
    ];
  });
}

/** How long to wait before asking again: a minute while a match is on, five before, never after. */
export function nextAskIn(scores: readonly Pick<LiveScore, 'state'>[]): number | undefined {
  if (scores.some((score) => score.state === 'in')) return 60_000;
  if (scores.some((score) => score.state === 'pre')) return 300_000;
  return undefined;
}

const scoreLine = (score: LiveScore) =>
  score.home !== undefined && score.away !== undefined
    ? `${String(score.home)}–${String(score.away)}`
    : undefined;

/** Draws a person's numbers after their name, as the page does: "1 GOAL 1 ASSIST". */
function drawMarks(
  name: Element,
  lines: readonly PersonLine[],
  lang: InterfaceLanguage,
  sport: string | undefined,
) {
  const words = tonightWords(lang);
  // The row's styles are scoped to the component: new elements take its scope attribute too.
  const scope = [...name.attributes].filter((a) => a.name.startsWith('data-astro-cid'));
  const make = (className: string, text?: string) => {
    const element = document.createElement('span');
    element.className = className;
    for (const attribute of scope) element.setAttribute(attribute.name, attribute.value);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  for (const old of name.querySelectorAll('.marks')) old.remove();
  for (const line of lines) {
    const marks = personMarks(line);
    if (marks.length === 0) continue;
    const group = make('marks');
    group.setAttribute('role', 'img');
    group.setAttribute('aria-label', marks.map((m) => words[m.kind](m.count)).join(', '));
    for (const mark of marks) {
      const item = make('mark', String(mark.count));
      item.append(make('unit', words.unit(mark.kind, mark.count, sport).toLocaleUpperCase(lang)));
      group.append(item);
    }
    name.append(group);
  }
}

/**
 * Redraws a scoreboard's scorers as the page draws them. A photo the page already shows for that
 * name is kept; otherwise the source's photo is used.
 */
function drawScorers(
  list: HTMLElement,
  scorers: readonly LiveScorer[],
  lang: InterfaceLanguage,
  sport: string | undefined,
  ours: string | undefined,
) {
  const words = tonightWords(lang);
  const known = new Map(
    [...list.querySelectorAll<HTMLElement>('li')].flatMap((item) => {
      const img = item.querySelector('img');
      const who = item.dataset.name;
      return img && who ? [[who, img.getAttribute('src') ?? ''] as const] : [];
    }),
  );
  const scope = [...list.attributes].filter((a) => a.name.startsWith('data-astro-cid'));
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    for (const attribute of scope) element.setAttribute(attribute.name, attribute.value);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const items = orderScorers(scorers).map((scorer) => {
    const item = make(
      'li',
      [scorer.side, ours === scorer.side ? 'ours' : '', scorer.own ? 'own' : '']
        .filter(Boolean)
        .join(' '),
    );
    const minutes = make(
      'span',
      'minutes',
      scorer.minutes ? scorer.minutes.join(' ') : String(scorer.points ?? 0),
    );
    if (!scorer.minutes) {
      const points = words.unit('points', scorer.points ?? 0, sport).toLocaleUpperCase(lang);
      minutes.append(make('span', 'unit', ` ${points}`));
    }
    item.append(minutes);
    const who = make('span', 'who');
    const src = known.get(scorer.name) ?? scorer.photo;
    if (src) {
      const img = make('img', 'photo');
      img.src = src;
      img.alt = '';
      img.width = 24;
      img.height = 24;
      img.loading = 'lazy';
      who.append(img);
    }
    who.append(scorer.name);
    const unit = (text: string) => {
      who.append(make('span', 'unit', ` ${text.toLocaleUpperCase(lang)}`));
    };
    if (scorer.penalty) unit(words.penalty);
    if (scorer.own) unit(words.ownGoal);
    item.append(who);
    item.dataset.name = scorer.name;
    return item;
  });
  list.replaceChildren(...items);
}

/** Puts one score on every element that shows that match. */
export function applyScore(root: ParentNode, score: LiveScore) {
  const line = scoreLine(score);
  for (const element of root.querySelectorAll<HTMLElement>('[data-live-ref]')) {
    const key = element.dataset.liveSource
      ? `${element.dataset.liveSource}:${element.dataset.liveRef ?? ''}`
      : element.dataset.liveRef;
    if (key !== score.ref || score.state === 'pre') continue;
    if (!element.matches('[data-tonight-row]')) {
      // The Today line's match: the kick-off time becomes the score.
      if (line) element.textContent = line;
      continue;
    }
    const lang: InterfaceLanguage = element.dataset.lang === 'tr' ? 'tr' : 'en';
    const words = tonightWords(lang);
    const figure = element.querySelector('[data-figure]');
    const word = element.querySelector('[data-word]');
    const sides = element.querySelectorAll<HTMLElement>('[data-score]');
    if (sides.length > 0) {
      // A scoreboard: each team's own score; the right column stays the clock.
      for (const side of sides) {
        const value = side.dataset.score === 'home' ? score.home : score.away;
        if (value !== undefined) side.textContent = String(value);
      }
      const list = element.querySelector<HTMLElement>('[data-scorers]');
      if (list && score.scorers) {
        drawScorers(list, score.scorers, lang, element.dataset.sport, element.dataset.ours);
      }
    } else if (line && figure) figure.textContent = line;
    if (sides.length > 0 && score.state === 'in' && figure && word) {
      // A scoreboard being played: the minute is the figure.
      figure.textContent = score.clock ?? figure.textContent;
      word.textContent = words.on;
    } else if (word) {
      word.textContent =
        score.state === 'in'
          ? (score.clock ?? words.on)
          : element.dataset.sport === 'basketball'
            ? words.final
            : words.fullTime;
    }
    element.dataset.state = score.state === 'in' ? 'on' : 'over';
    element.dataset.live = 'true';
    if (score.state === 'post' && score.home !== undefined && score.away !== undefined) {
      const ours = element.dataset.ours;
      const [us, them] =
        ours === 'home'
          ? [score.home, score.away]
          : ours === 'away'
            ? [score.away, score.home]
            : [];
      if (us !== undefined && them !== undefined) {
        element.dataset.outcome = us > them ? 'win' : us < them ? 'loss' : 'draw';
      }
    }
    const name = element.querySelector('.name');
    if (name && score.lines) drawMarks(name, score.lines, lang, element.dataset.sport);
  }
}

/** The refs on the page that may still change. */
export function openRefs(root: ParentNode): string[] {
  const refs = new Set<string>();
  for (const element of root.querySelectorAll<HTMLElement>('[data-live-ref]')) {
    if (element.dataset.final === 'true') continue;
    const ref = element.dataset.liveSource
      ? `${element.dataset.liveSource}:${element.dataset.liveRef ?? ''}`
      : element.dataset.liveRef;
    if (ref) refs.add(ref);
  }
  return [...refs].slice(0, 12);
}

/** Starts asking for scores, if the page has matches that may change and a Worker is set. */
export function followScores(root: ParentNode, base = liveBase()) {
  if (!base) return;
  let refs = openRefs(root);
  if (refs.length === 0) return;
  let timer: number | undefined;
  const ask = async () => {
    timer = undefined;
    if (document.visibilityState !== 'visible') return;
    let scores: LiveScore[] = [];
    try {
      const response = await fetch(`${base}/scores?refs=${refs.map(encodeURIComponent).join(',')}`);
      if (response.ok) scores = readScores(await response.json());
    } catch {
      // A missed answer is tried again on the next turn; rows keep what they showed.
    }
    for (const score of scores) applyScore(root, score);
    const ended = new Set(scores.filter((s) => s.state === 'post').map((s) => s.ref));
    refs = refs.filter((ref) => !ended.has(ref));
    const wait =
      scores.length > 0 ? nextAskIn(scores.filter((s) => refs.includes(s.ref))) : 120_000;
    if (wait !== undefined && refs.length > 0) timer = window.setTimeout(() => void ask(), wait);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timer === undefined && refs.length > 0)
      void ask();
  });
  void ask();
}
