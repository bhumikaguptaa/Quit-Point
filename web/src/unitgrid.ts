import { animateOnVisible } from './motion';

/** C4: "each square is one worker" — borrowed directly from the essential-words
 * unit-grid pattern. 100 squares, N filled, animated fill on scroll-into-view. */
export function renderUnitGrid(container: HTMLElement, filledPct: number) {
  const filled = Math.round(filledPct);
  const squares = Array.from(
    { length: 100 },
    (_, i) => `<span class="u${i < filled ? ' fill' : ''}" style="--i:${i}"></span>`,
  ).join('');
  container.innerHTML = `<div class="units chart-grow">${squares}</div>`;
  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
