/**
 * The one-minute page shows one story card at a time (docs/design/decisions/in-one-minute.md).
 * The cards sit in a row that scrolls sideways and snaps, so swiping works with no script; this
 * file adds the progress marks, the count and the previous and next buttons.
 */

/** The card in view: the nearest whole step from the start, kept inside the row. */
export function cardAt(scrollLeft: number, step: number, count: number): number {
  if (count <= 0 || step <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(Math.abs(scrollLeft) / step)));
}

/** Wires every card row on the page to its marks, count and buttons. */
export function setupBriefCards(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-cards]').forEach((deck) => {
    const row = deck.querySelector<HTMLElement>('[data-cards-row]');
    const cards = row ? [...row.querySelectorAll<HTMLElement>('[data-card]')] : [];
    if (!row || cards.length === 0) return;

    const marks = [...deck.querySelectorAll<HTMLElement>('[data-card-mark]')];
    const count = deck.querySelector<HTMLElement>('[data-card-count]');
    const previous = deck.querySelector<HTMLButtonElement>('[data-card-previous]');
    const next = deck.querySelector<HTMLButtonElement>('[data-card-next]');
    const total = cards.length;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = -1;

    const step = () => {
      const [first, second] = cards;
      return second && first ? second.offsetLeft - first.offsetLeft : row.clientWidth;
    };

    const show = (index: number) => {
      if (index === current) return;
      current = index;
      marks.forEach((mark, i) => mark.classList.toggle('on', i <= index));
      if (count)
        count.textContent = `${String(Math.min(index + 1, marks.length))} / ${String(marks.length)}`;
      if (previous) previous.disabled = index === 0;
      if (next) next.disabled = index === total - 1;
      cards.forEach((card, i) => {
        card.inert = i !== index;
      });
    };

    const go = (index: number) => {
      const target = cards[Math.min(total - 1, Math.max(0, index))];
      if (!target) return;
      row.scrollTo({
        left: target.offsetLeft - (cards[0]?.offsetLeft ?? 0),
        behavior: smooth ? 'smooth' : 'auto',
      });
    };

    row.addEventListener(
      'scroll',
      () => {
        show(cardAt(row.scrollLeft, step(), total));
      },
      {
        passive: true,
      },
    );
    previous?.addEventListener('click', () => {
      go(current - 1);
    });
    next?.addEventListener('click', () => {
      go(current + 1);
    });
    deck.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') go(current + 1);
      else if (event.key === 'ArrowLeft') go(current - 1);
      else return;
      event.preventDefault();
    });

    deck.querySelectorAll<HTMLElement>('[data-cards-controls]').forEach((el) => {
      el.hidden = false;
    });
    show(0);
  });
}
