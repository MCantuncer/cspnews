/**
 * Live scores on the page (docs/design/decisions/tonight.md): rows on the Tonight list and the
 * Today line's match carry `data-live-ref` ("espn:soccer/uefa.nations/401"). While one of them may
 * be playing and the tab is open, the page asks the live scores Worker (apps/live) for them: every
 * minute while a match is on, every five minutes while one has yet to start, and never once all
 * are over. Without `PUBLIC_LIVE_SCORES_URL` nothing is asked and rows move on by the clock.
 */
import type { PersonLine } from '@cspnews/core';

import type { InterfaceLanguage } from './evidence.js';
import { ICONS } from './icons.js';
import { personMarks, tonightWords, type MarkKind } from './tonight.js';

export interface LiveScore {
  readonly ref: string;
  readonly state: 'pre' | 'in' | 'post';
  readonly home?: number;
  readonly away?: number;
  readonly clock?: string;
  readonly lines?: readonly PersonLine[];
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

const MARK_ICONS: Record<MarkKind, keyof typeof ICONS> = {
  goals: 'goal',
  assists: 'assist',
  points: 'points',
  rebounds: 'rebound',
};

function drawMarks(name: Element, lines: readonly PersonLine[], lang: InterfaceLanguage) {
  const words = tonightWords(lang);
  for (const old of name.querySelectorAll('.marks')) old.remove();
  for (const line of lines) {
    const marks = personMarks(line);
    if (marks.length === 0) continue;
    const group = document.createElement('span');
    group.className = 'marks';
    group.setAttribute('role', 'img');
    group.setAttribute('aria-label', marks.map((m) => words[m.kind](m.count)).join(', '));
    for (const mark of marks) {
      const item = document.createElement('span');
      item.className = 'mark';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({
        width: '16',
        height: '16',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.75',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      })) {
        svg.setAttribute(key, value);
      }
      // The icon markup is our own constant, never data from the feed.
      svg.innerHTML = ICONS[MARK_ICONS[mark.kind]];
      item.append(svg, document.createTextNode(String(mark.count)));
      group.append(item);
    }
    name.append(group);
  }
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
    if (line && figure) figure.textContent = line;
    if (word) {
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
    if (name && score.lines) drawMarks(name, score.lines, lang);
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
