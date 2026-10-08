import { MathInput } from './mathinput';
import { PUZZLES, type Puzzle } from './puzzles';

export interface AttemptRecord {
  level: number; // 1-indexed
  correct: boolean;
  nearMiss: boolean;
}

export interface LadderResult {
  quitLevel: number; // 1-indexed level the reader was ON when they quit; 0 if they finished all levels
  finished: boolean;
  levelsRemaining: number;
  attempts: AttemptRecord[];
  lastAttemptWasNearMiss: boolean;
  timeToQuitSeconds: number;
}

export type LadderEvent =
  | { type: 'levelStart'; level: number; total: number }
  | { type: 'correct'; level: number }
  | { type: 'incorrect'; level: number; nearMiss: boolean }
  | { type: 'quit'; result: LadderResult }
  | { type: 'finished'; result: LadderResult };

type Listener = (e: LadderEvent) => void;

/**
 * Drives the mental-math puzzle ladder: owns the current MathInput instance,
 * advances levels on a correct answer, and produces a LadderResult when the
 * reader quits or clears the whole ladder. Never exposes "level N of M"
 * beyond what the caller chooses to render.
 */
export class Ladder {
  private puzzles: Puzzle[];
  private container: HTMLElement;
  private input: MathInput | null = null;
  private currentLevel = 0; // 0-indexed into this.puzzles
  private attempts: AttemptRecord[] = [];
  private startedAt = Date.now();
  private listeners: Listener[] = [];
  private done = false;

  constructor(container: HTMLElement, puzzles: Puzzle[] = PUZZLES) {
    this.puzzles = puzzles;
    this.container = container;
  }

  on(listener: Listener) {
    this.listeners.push(listener);
  }

  private emit(e: LadderEvent) {
    for (const l of this.listeners) l(e);
  }

  start() {
    this.startedAt = Date.now();
    this.loadLevel(0);
  }

  private loadLevel(index: number) {
    this.currentLevel = index;
    const puzzle = this.puzzles[index];

    this.input?.destroy();
    this.input = new MathInput(this.container, puzzle, {
      onSubmit: (_value, isCorrect, isNearMiss) => this.handleSubmit(isCorrect, isNearMiss),
    });

    this.emit({ type: 'levelStart', level: index + 1, total: this.puzzles.length });
  }

  private handleSubmit(isCorrect: boolean, isNearMiss: boolean) {
    this.attempts.push({ level: this.currentLevel + 1, correct: isCorrect, nearMiss: isNearMiss });
    this.input?.flashResult(isCorrect);

    if (isCorrect) {
      this.emit({ type: 'correct', level: this.currentLevel + 1 });
      this.input?.lock();
      window.setTimeout(() => {
        if (this.currentLevel + 1 >= this.puzzles.length) {
          this.finish();
        } else {
          this.loadLevel(this.currentLevel + 1);
        }
      }, 600);
    } else {
      this.emit({ type: 'incorrect', level: this.currentLevel + 1, nearMiss: isNearMiss });
    }
  }

  /** Called when the reader presses "I give up". */
  quit() {
    if (this.done) return;
    this.done = true;
    this.input?.lock();

    const result = this.buildResult(this.currentLevel + 1, false);
    this.emit({ type: 'quit', result });
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    const result = this.buildResult(0, true);
    this.emit({ type: 'finished', result });
  }

  private buildResult(quitLevel: number, finished: boolean): LadderResult {
    const last = this.attempts[this.attempts.length - 1];
    return {
      quitLevel,
      finished,
      levelsRemaining: finished ? 0 : this.puzzles.length - (this.currentLevel + 1),
      attempts: this.attempts,
      lastAttemptWasNearMiss: last?.nearMiss ?? false,
      timeToQuitSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}
