/**
 * Draws "Since you last read" on a Contents screen: followed stories in this bulletin that moved
 * since the reader last saw them, each with one line per change. Built with text nodes only.
 */
import type { InterfaceLanguage } from './evidence.js';
import { followed, movedStories, safeStorage, type StoryNow } from './follow.js';
import { changeLine } from './follow-words.js';

export function showMoved(root: ParentNode) {
  const box = root.querySelector<HTMLElement>('[data-since]');
  const list = box?.querySelector('[data-since-list]');
  if (!box || !list) return;
  let stories: StoryNow[];
  try {
    stories = JSON.parse(box.dataset.since ?? '[]') as StoryNow[];
  } catch {
    return;
  }
  const lang: InterfaceLanguage = box.dataset.lang === 'tr' ? 'tr' : 'en';
  const moved = movedStories(followed(safeStorage()), stories);
  if (moved.length === 0) return;

  for (const { story, changes } of moved) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = story.href;
    link.dataset.section = story.section;
    const title = document.createElement('span');
    title.className = 'since-title';
    title.textContent = story.title;
    link.append(title);
    for (const change of changes) {
      const line = document.createElement('span');
      line.className = 'since-change';
      line.textContent = changeLine(change, lang);
      link.append(line);
    }
    item.append(link);
    list.append(item);
  }
  box.hidden = false;
}
