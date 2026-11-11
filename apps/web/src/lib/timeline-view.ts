import { EVIDENCE, evidenceWord, type InterfaceLanguage } from './evidence.js';
import { ICONS, type IconName } from './icons.js';
import { compactStations, type Timeline, type TimelinePoint } from './timeline.js';

/**
 * Builds the timeline in the browser, for pages that read their story at run time (Hot News).
 * The markup matches src/components/story/Timeline.astro, so src/styles/timeline.css styles
 * both.
 */
export function timelineElement(timeline: Timeline, lang: InterfaceLanguage): HTMLElement {
  const details = el('details', `tl tl--${timeline.kind}`);
  const summary = el('summary', 'tl__toggle');
  const head = el('span', 'tl__head');
  const heading = el('h2', 'tl__heading', timeline.heading);
  head.append(heading, icon('more', 'tl__chevron'));

  const stations = compactStations(timeline.points);
  const across = el('ol', 'tl__across');
  across.style.setProperty('--n', String(stations.length));
  for (const station of stations) {
    if (station.kind === 'gap') {
      const li = el('li', 'tl__station tl__gap');
      li.append(el('span', 'tl__when'), el('span', 'tl__dot', `+${String(station.hidden)}`));
      across.append(li);
    } else {
      across.append(stationElement(station.point, lang, false));
    }
  }
  summary.append(head, across);

  const down = el('ol', 'tl__down');
  down.append(...timeline.points.map((point) => stationElement(point, lang, true)));
  details.append(summary, down);
  return details;
}

function stationElement(point: TimelinePoint, lang: InterfaceLanguage, open: boolean) {
  const li = el('li', point.current ? 'tl__station tl__current' : 'tl__station');
  const dot = el('span', 'tl__dot');
  dot.setAttribute('aria-hidden', 'true');
  const title = el('span', 'tl__title');
  if (point.label) {
    const style = EVIDENCE[point.label];
    const mark = el('span', 'tl__ev');
    mark.style.setProperty('--ev', `var(${style.token})`);
    const word = evidenceWord(point.label, lang);
    mark.append(icon(style.icon), open ? word : el('span', 'tl__ev-word', word));
    title.append(mark);
  } else {
    title.textContent = point.title;
  }
  li.append(el('span', 'tl__when', point.when), dot, title);
  if (open && point.detail) li.append(el('span', 'tl__detail', point.detail));
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The same SVG as Icon.astro; the icon markup is our own constant, never feed data. */
function icon(name: IconName, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({
    class: `icon ${className}`.trim(),
    width: '18',
    height: '18',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  })) {
    svg.setAttribute(key, value);
  }
  svg.innerHTML = ICONS[name];
  return svg;
}
