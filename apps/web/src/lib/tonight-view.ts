/**
 * Keeps the Tonight rows true to the clock in the browser: a row the page was built with as
 * "Tonight 21:45" turns "Under way" at kick-off and "Ended" after, without a reload. Each row
 * carries what it needs in data attributes; text is set with textContent only.
 */
import type { InterfaceLanguage } from './evidence.js';
import { tonightStatus } from './tonight.js';

interface RowData {
  kind: 'match' | 'show';
  sport?: 'football' | 'basketball';
  startsAt: string;
  result?: { home: number; away: number };
}

function update(root: ParentNode, now: Date) {
  for (const row of root.querySelectorAll<HTMLElement>('[data-tonight-row]')) {
    // A row the live scores have reached shows the source's word, not the clock's.
    if (row.dataset.live === 'true') continue;
    let data: RowData;
    try {
      data = JSON.parse(row.dataset.tonightRow ?? '') as RowData;
    } catch {
      continue;
    }
    const lang: InterfaceLanguage = row.dataset.lang === 'tr' ? 'tr' : 'en';
    const status = tonightStatus(data, lang, now);
    row.dataset.state = status.state;
    const figure = row.querySelector('[data-figure]');
    const word = row.querySelector('[data-word]');
    if (figure) figure.textContent = status.figure;
    if (word) word.textContent = status.word;
  }
}

export function showTonight(root: ParentNode) {
  if (!root.querySelector('[data-tonight-row]')) return;
  update(root, new Date());
  window.setInterval(() => {
    if (document.visibilityState === 'visible') update(root, new Date());
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') update(root, new Date());
  });
}
