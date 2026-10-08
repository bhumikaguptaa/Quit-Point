import type { Puzzle } from './puzzles';

export interface MathInputCallbacks {
  /** Called when the reader submits an answer. isCorrect/isNearMiss are precomputed. */
  onSubmit: (value: number, isCorrect: boolean, isNearMiss: boolean) => void;
}

/**
 * Renders a single math puzzle: the prompt, a number input, and a submit
 * button. One instance per puzzle; call destroy() before creating the next.
 */
export class MathInput {
  private el: HTMLElement;
  private puzzle: Puzzle;
  private callbacks: MathInputCallbacks;
  private locked = false;
  private form: HTMLFormElement | null = null;

  constructor(container: HTMLElement, puzzle: Puzzle, callbacks: MathInputCallbacks) {
    this.el = container;
    this.puzzle = puzzle;
    this.callbacks = callbacks;
    this.render();
  }

  lock() {
    this.locked = true;
    if (this.form) {
      const input = this.form.querySelector('input');
      const button = this.form.querySelector('button');
      if (input) input.disabled = true;
      if (button) button.disabled = true;
    }
  }

  flashResult(correct: boolean) {
    this.el.classList.remove('flash-correct', 'flash-incorrect');
    // force reflow so re-triggering the same class restarts the animation
    void this.el.offsetWidth;
    this.el.classList.add(correct ? 'flash-correct' : 'flash-incorrect');
  }

  destroy() {
    this.el.innerHTML = '';
    this.el.classList.remove('flash-correct', 'flash-incorrect');
  }

  private render() {
    this.el.innerHTML = `
      <form class="math-form" autocomplete="off">
        <p class="math-prompt">${this.puzzle.prompt}</p>
        <input
          type="number"
          inputmode="numeric"
          class="math-answer-input"
          placeholder="your answer"
          aria-label="Your answer"
          required
        />
        <button type="submit" class="math-submit-btn">Submit</button>
      </form>
    `;
    this.form = this.el.querySelector('form');
    const input = this.el.querySelector<HTMLInputElement>('.math-answer-input')!;
    input.focus();

    this.form!.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.locked) return;
      const raw = input.value.trim();
      if (raw === '') return;
      const value = Number(raw);
      const diff = Math.abs(value - this.puzzle.answer);
      const isCorrect = diff === 0;
      const isNearMiss = !isCorrect && diff <= this.puzzle.nearMissMargin;

      if (!isCorrect) {
        input.classList.remove('input-error');
        void input.offsetWidth;
        input.classList.add('input-error');
        input.select();
      }

      this.callbacks.onSubmit(value, isCorrect, isNearMiss);
    });
  }
}
