/**
 * Draws the saved list on its page. Built with text nodes only: titles come from this
 * browser's own storage and are never treated as markup.
 */
import type { InterfaceLanguage } from './evidence.js';
import { safeStorage } from './follow.js';
import { savedStories, unsaveStory } from './saved.js';

export function showSaved(root: ParentNode) {
  const page = root.querySelector<HTMLElement>('[data-saved]');
  const list = page?.querySelector('[data-saved-list]');
  const empty = page?.querySelector<HTMLElement>('[data-saved-empty]');
  if (!page || !list || !empty) return;
  const lang: InterfaceLanguage = page.dataset.lang === 'tr' ? 'tr' : 'en';
  let sections: Record<string, string> = {};
  try {
    sections = JSON.parse(page.dataset.sections ?? '{}') as Record<string, string>;
  } catch {
    sections = {};
  }
  const storage = safeStorage();

  const draw = () => {
    list.replaceChildren();
    const stories = savedStories(storage);
    empty.hidden = stories.length > 0;
    for (const story of stories) {
      const version = story[lang];
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = version.href;
      const section = document.createElement('span');
      section.className = 'section';
      section.textContent = sections[story.section] ?? '';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = version.title;
      link.append(section, title);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = page.dataset.remove ?? '';
      remove.addEventListener('click', () => {
        unsaveStory(storage, story.id);
        draw();
      });
      item.append(link, remove);
      list.append(item);
    }
  };
  draw();
}
