/**
 * Memory span ladder (digit-span / Corsi block-tapping paradigm).
 *
 * A 3x3 grid of tiles flashes a sequence; the reader taps it back in order.
 * Level N shows a sequence of length N + 2, so level 1 is 3 tiles. There is
 * no visible cap — the reader only knows it keeps growing.
 *
 * Replaces the earlier mental-arithmetic generator. Corsi span is a real
 * validated paradigm, which keeps the "backed by research" framing without
 * the engineering cost of a chess board.
 */

export const GRID_SIZE = 3;
export const TILE_COUNT = GRID_SIZE * GRID_SIZE;
export const TOTAL_LEVELS = 10;

/** Failures allowed at one level before the reader is nudged to decide. */
export const MAX_FAILURES_PER_LEVEL = 3;

export interface Puzzle {
  level: number; // 1-indexed
  /** tile indices (0..TILE_COUNT-1) in flash order */
  sequence: number[];
}

export function sequenceLengthForLevel(level: number): number {
  return level + 2;
}

/**
 * A fresh sequence for a level. Avoids repeating the same tile back-to-back —
 * consecutive repeats are ambiguous to watch (one long flash vs two) and would
 * make failures a UI artifact rather than a memory result.
 */
export function generateSequence(level: number): number[] {
  const length = sequenceLengthForLevel(level);
  const seq: number[] = [];
  while (seq.length < length) {
    const next = Math.floor(Math.random() * TILE_COUNT);
    if (seq.length > 0 && next === seq[seq.length - 1]) continue;
    seq.push(next);
  }
  return seq;
}

export function generatePuzzle(level: number): Puzzle {
  return { level, sequence: generateSequence(level) };
}

/** Builds a fresh ladder. Called on load and on every replay. */
export function generateLadder(): Puzzle[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => generatePuzzle(i + 1));
}

export interface SequenceComparison {
  correct: boolean;
  /** how many leading tiles matched before the first error */
  matchedPrefix: number;
  /** all-but-the-last-one-or-two correct, or an adjacent transposition */
  nearMiss: boolean;
}

/**
 * Near-miss: either the reader got everything but the final 1-2 tiles, or they
 * swapped two adjacent tiles. Both read as "you almost had it" rather than
 * "you were guessing".
 */
export function compareSequence(submitted: number[], expected: number[]): SequenceComparison {
  let matchedPrefix = 0;
  while (
    matchedPrefix < submitted.length &&
    matchedPrefix < expected.length &&
    submitted[matchedPrefix] === expected[matchedPrefix]
  ) {
    matchedPrefix++;
  }

  const correct = matchedPrefix === expected.length && submitted.length === expected.length;
  if (correct) return { correct: true, matchedPrefix, nearMiss: false };

  const missedByAtMostTwo =
    submitted.length === expected.length && matchedPrefix >= expected.length - 2;

  const isAdjacentTransposition =
    submitted.length === expected.length &&
    matchedPrefix === expected.length - 2 &&
    submitted[matchedPrefix] === expected[matchedPrefix + 1] &&
    submitted[matchedPrefix + 1] === expected[matchedPrefix];

  return {
    correct: false,
    matchedPrefix,
    nearMiss: missedByAtMostTwo || isAdjacentTransposition,
  };
}
