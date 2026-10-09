import { MemoryGrid } from './memorygrid';
import {
  MAX_FAILURES_PER_LEVEL,
  TOTAL_LEVELS,
  generatePuzzle,
  sequenceLengthForLevel,
} from './puzzles';

export interface AttemptRecord {
  level: number; // 1-indexed
  correct: boolean;
  nearMiss: boolean;
  /** how many leading tiles were recalled correctly */
  matchedPrefix: number;
}

export interface LadderResult {
  quitLevel: number; // 1-indexed level the reader was ON when they quit; 0 if they cleared the ladder
  finished: boolean;
  levelsRemaining: number;
  attempts: AttemptRecord[];
  lastAttemptWasNearMiss: boolean;
  timeToQuitSeconds: number;
  /** sequence length the reader was facing when they stopped */
  sequenceLengthAtQuit: number;
  attemptsOnFinalLevel: number;
  /** true if the reader quit before submitting a single sequence on their final level */
  quitBeforeAnyAttempt: boolean;
}

export type LadderEvent =
  | { type: 'levelStart'; level: number; sequenceLength: number; failuresHere: number }
  | { type: 'correct'; level: number }
  | { type: 'incorrect'; level: number; nearMiss: boolean; failuresHere: number }
  | { type: 'wall'; level: number }
  | { type: 'quit'; result: LadderResult }
  | { type: 'finished'; result: LadderResult };

type Listener = (e: LadderEvent) => void;

/**
 * Drives the memory span ladder. On a wrong sequence the reader gets a FRESH
 * sequence of the same length rather than a repeat of the one they just saw —
 * repeating it would turn a memory test into a re-watch. After
 * MAX_FAILURES_PER_LEVEL failures at one level we emit 'wall' so the UI can
 * nudge a decision, but we never force the session to end: quitting stays the
 * reader's call, which is the whole premise of the piece.
 */
export class Ladder {
  private container: HTMLElement;
  private grid: MemoryGrid | null = null;
  private currentLevel = 1; // 1-indexed
  private failuresAtLevel = 0;
  private attempts: AttemptRecord[] = [];
  private startedAt = Date.now();
  private listeners: Listener[] = [];
  private done = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  on(listener: Listener) {
    this.listeners.push(listener);
  }

  private emit(e: LadderEvent) {
    for (const l of this.listeners) l(e);
  }

  /** @param firstLeadMs delay before the very first flash (the "ready…" beat) */
  start(firstLeadMs?: number) {
    this.startedAt = Date.now();
    this.loadLevel(1, firstLeadMs);
  }

  private loadLevel(level: number, leadMs?: number) {
    this.currentLevel = level;
    this.failuresAtLevel = 0;
    this.presentAttempt(leadMs);
  }

  /** builds a fresh sequence at the current level and plays it */
  private presentAttempt(leadMs?: number) {
    const puzzle = generatePuzzle(this.currentLevel);

    this.grid?.destroy();
    this.grid = new MemoryGrid(this.container, puzzle, {
      onSubmit: (correct, nearMiss, matchedPrefix) =>
        this.handleSubmit(correct, nearMiss, matchedPrefix),
    });

    this.emit({
      type: 'levelStart',
      level: this.currentLevel,
      sequenceLength: sequenceLengthForLevel(this.currentLevel),
      failuresHere: this.failuresAtLevel,
    });

    this.grid.start(leadMs);
  }

  private handleSubmit(correct: boolean, nearMiss: boolean, matchedPrefix: number) {
    if (this.done) return;

    this.attempts.push({
      level: this.currentLevel,
      correct,
      nearMiss,
      matchedPrefix,
    });

    if (correct) {
      this.emit({ type: 'correct', level: this.currentLevel });
      window.setTimeout(() => {
        if (this.done) return;
        if (this.currentLevel >= TOTAL_LEVELS) {
          this.finish();
        } else {
          this.loadLevel(this.currentLevel + 1);
        }
      }, 620);
      return;
    }

    this.failuresAtLevel += 1;
    this.emit({
      type: 'incorrect',
      level: this.currentLevel,
      nearMiss,
      failuresHere: this.failuresAtLevel,
    });

    if (this.failuresAtLevel >= MAX_FAILURES_PER_LEVEL) {
      this.emit({ type: 'wall', level: this.currentLevel });
    }

    window.setTimeout(() => {
      if (this.done) return;
      this.presentAttempt();
    }, 760);
  }

  /** "I give up" */
  quit() {
    if (this.done) return;
    this.done = true;
    this.grid?.lock();
    this.emit({ type: 'quit', result: this.buildResult(this.currentLevel, false) });
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.emit({ type: 'finished', result: this.buildResult(0, true) });
  }

  private buildResult(quitLevel: number, finished: boolean): LadderResult {
    const last = this.attempts[this.attempts.length - 1];
    const finalLevel = finished ? TOTAL_LEVELS : quitLevel;
    const attemptsOnFinalLevel = this.attempts.filter((a) => a.level === finalLevel).length;
    return {
      quitLevel,
      finished,
      levelsRemaining: finished ? 0 : TOTAL_LEVELS - quitLevel,
      attempts: this.attempts,
      lastAttemptWasNearMiss: last?.nearMiss ?? false,
      timeToQuitSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      sequenceLengthAtQuit: sequenceLengthForLevel(finalLevel),
      attemptsOnFinalLevel,
      quitBeforeAnyAttempt: !finished && attemptsOnFinalLevel === 0,
    };
  }
}
