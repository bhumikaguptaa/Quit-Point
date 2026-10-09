import {
  GRID_SIZE,
  TILE_COUNT,
  compareSequence,
  type Puzzle,
} from './puzzles';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FLASH_ON_MS = REDUCE_MOTION ? 420 : 380;
const FLASH_GAP_MS = REDUCE_MOTION ? 220 : 200;
const PRE_WATCH_MS = 500;

export interface MemoryGridCallbacks {
  /** fires once the reader has entered a full sequence */
  onSubmit: (isCorrect: boolean, isNearMiss: boolean, matchedPrefix: number) => void;
}

/**
 * Renders one level of the memory span task: flashes the sequence, then
 * accepts taps. Deliberately gives no per-tile correctness feedback during
 * input — the reader finds out only once the whole sequence is in, which is
 * what makes it a memory test rather than trial-and-error.
 *
 * One instance per attempt; call destroy() before creating the next.
 */
export class MemoryGrid {
  private el: HTMLElement;
  private puzzle: Puzzle;
  private callbacks: MemoryGridCallbacks;
  private entered: number[] = [];
  private phase: 'idle' | 'watching' | 'input' | 'locked' = 'idle';
  private timers: number[] = [];

  constructor(container: HTMLElement, puzzle: Puzzle, callbacks: MemoryGridCallbacks) {
    this.el = container;
    this.puzzle = puzzle;
    this.callbacks = callbacks;
    this.render();
  }

  /** flashes the sequence, then hands control to the reader */
  start() {
    this.phase = 'watching';
    this.setStatus('watch');
    this.entered = [];
    this.updateProgress();

    let t = PRE_WATCH_MS;
    this.puzzle.sequence.forEach((tile) => {
      this.timers.push(
        window.setTimeout(() => this.flashTile(tile), t),
      );
      t += FLASH_ON_MS + FLASH_GAP_MS;
    });

    this.timers.push(
      window.setTimeout(() => {
        this.phase = 'input';
        this.setStatus('input');
        this.el.classList.add('is-interactive');
      }, t),
    );
  }

  lock() {
    this.phase = 'locked';
    this.el.classList.remove('is-interactive');
    this.clearTimers();
  }

  destroy() {
    this.clearTimers();
    this.el.innerHTML = '';
    this.el.className = 'memory-grid';
  }

  private clearTimers() {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }

  private tileEl(index: number): HTMLElement | null {
    return this.el.querySelector(`[data-tile="${index}"]`);
  }

  private flashTile(index: number) {
    const tile = this.tileEl(index);
    if (!tile) return;
    tile.classList.add('is-flashing');
    this.timers.push(
      window.setTimeout(() => tile.classList.remove('is-flashing'), FLASH_ON_MS),
    );
  }

  private handleTap(index: number) {
    if (this.phase !== 'input') return;

    const tile = this.tileEl(index);
    if (tile) {
      tile.classList.remove('is-tapped');
      void tile.offsetWidth; // restart the pulse if the same tile is tapped twice
      tile.classList.add('is-tapped');
      this.timers.push(
        window.setTimeout(() => tile.classList.remove('is-tapped'), 240),
      );
    }

    this.entered.push(index);
    this.updateProgress();

    if (this.entered.length >= this.puzzle.sequence.length) {
      this.submit();
    }
  }

  private submit() {
    this.lock();
    const result = compareSequence(this.entered, this.puzzle.sequence);

    this.el.classList.add(result.correct ? 'is-correct' : 'is-wrong');
    this.setStatus(result.correct ? 'correct' : 'wrong');

    this.timers.push(
      window.setTimeout(() => {
        this.callbacks.onSubmit(result.correct, result.nearMiss, result.matchedPrefix);
      }, 520),
    );
  }

  private setStatus(state: 'watch' | 'input' | 'correct' | 'wrong') {
    const status = this.el.querySelector<HTMLElement>('.grid-status');
    if (!status) return;
    const text = {
      watch: 'watch',
      input: 'your turn',
      correct: 'correct',
      wrong: 'not quite',
    }[state];
    status.textContent = text;
    status.dataset.state = state;
  }

  private updateProgress() {
    const dots = this.el.querySelectorAll<HTMLElement>('.grid-progress i');
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-filled', i < this.entered.length);
    });
  }

  private render() {
    const tiles = Array.from({ length: TILE_COUNT }, (_, i) =>
      `<button type="button" class="grid-tile" data-tile="${i}" aria-label="Tile ${i + 1}"></button>`,
    ).join('');

    const dots = this.puzzle.sequence.map(() => '<i></i>').join('');

    this.el.className = 'memory-grid';
    this.el.style.setProperty('--grid-size', String(GRID_SIZE));
    this.el.innerHTML = `
      <p class="grid-status" data-state="watch">watch</p>
      <div class="grid-tiles" role="group" aria-label="Memory grid">${tiles}</div>
      <div class="grid-progress" aria-hidden="true">${dots}</div>
    `;

    this.el.querySelectorAll<HTMLElement>('.grid-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        this.handleTap(Number(tile.dataset.tile));
      });
    });
  }
}
