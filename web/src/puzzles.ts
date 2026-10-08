/**
 * Mental math puzzle ladder: 10 levels, increasing difficulty, rotating
 * between three puzzle families so the ladder doesn't feel repetitive.
 * Unlike the earlier chess-puzzle version, these are procedurally generated
 * (seeded per level, not fetched from an external dataset) since there's no
 * equivalent public "real puzzle" database for mental math difficulty bands.
 */

export type PuzzleKind = 'arithmetic' | 'sequence' | 'estimation';

export interface Puzzle {
  level: number; // 1-indexed
  kind: PuzzleKind;
  /** The puzzle text shown to the reader, e.g. "47 + 38" or "2, 6, 12, 20, ?" */
  prompt: string;
  answer: number;
  /** Margin within which a wrong answer counts as a "near miss" (see stopping chart framing). */
  nearMissMargin: number;
}

function arithmeticPuzzle(level: number): Puzzle {
  // difficulty scales via number size and operation count, kept within what's
  // actually doable in your head: +/- operands grow with level, but ×/÷
  // operands stay small (2-12) regardless of level, since multiplying two
  // large numbers mentally isn't "harder", it's just a calculator problem.
  const rng = mulberry32(level * 7919);
  const ops = level <= 3 ? 1 : level <= 6 ? 2 : 3;
  const startMax = 10 + level * 8;

  let expr = String(randInt(rng, 2, startMax));
  let value = Number(expr);
  let appliedOps = 0;

  for (let i = 0; i < ops; i++) {
    const opPool = level <= 2 ? ['+', '-'] : level <= 5 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
    const op = opPool[randInt(rng, 0, opPool.length - 1)];

    if (op === '÷') {
      const divisors = [2, 3, 4, 5, 6].filter((d) => value !== 0 && value % d === 0);
      if (divisors.length === 0) continue; // no clean divisor available, skip this step
      const n = divisors[randInt(rng, 0, divisors.length - 1)];
      expr = appliedOps > 0 ? `(${expr}) ÷ ${n}` : `${expr} ÷ ${n}`;
      value /= n;
      appliedOps++;
      continue;
    }

    const n = op === '×' ? randInt(rng, 2, 12) : randInt(rng, 2, startMax);
    expr = appliedOps > 0 ? `(${expr}) ${op} ${n}` : `${expr} ${op} ${n}`;
    if (op === '+') value += n;
    else if (op === '-') value -= n;
    else if (op === '×') value *= n;
    appliedOps++;
  }

  return {
    level,
    kind: 'arithmetic',
    prompt: expr,
    answer: Math.round(value),
    nearMissMargin: Math.max(1, Math.round(Math.abs(value) * 0.05)),
  };
}

function sequencePuzzle(level: number): Puzzle {
  const rng = mulberry32(level * 104729);
  const length = 5;
  let seq: number[];
  let next: number;

  if (level <= 3) {
    // arithmetic sequence
    const start = randInt(rng, 1, 10);
    const step = randInt(rng, 2, 6 + level);
    seq = Array.from({ length }, (_, i) => start + i * step);
    next = start + length * step;
  } else if (level <= 6) {
    // geometric-ish / growing-difference sequence
    const start = randInt(rng, 1, 5);
    const step = randInt(rng, 2, 4);
    seq = [start];
    for (let i = 1; i < length; i++) seq.push(seq[i - 1] + step * i);
    next = seq[length - 1] + step * length;
  } else {
    // Fibonacci-style recursive sequence with a random seed pair
    const a0 = randInt(rng, 1, 5);
    const b0 = randInt(rng, 1, 5);
    seq = [a0, b0];
    for (let i = 2; i < length; i++) seq.push(seq[i - 1] + seq[i - 2]);
    next = seq[length - 1] + seq[length - 2];
  }

  return {
    level,
    kind: 'sequence',
    prompt: `${seq.join(', ')}, ?`,
    answer: next,
    nearMissMargin: Math.max(1, Math.round(Math.abs(next) * 0.05)),
  };
}

function estimationPuzzle(level: number): Puzzle {
  const rng = mulberry32(level * 193939);
  // base is always a round number (a multiple of 10 or 100) so "% of" stays
  // mentally tractable even as the base grows with level
  const magnitude = level <= 5 ? 10 : 100;
  const base = randInt(rng, 2 + level, 20 + level * 4) * magnitude;
  const pctOf = randInt(rng, 2, 9) * 10; // 20%, 30%, ... 90%

  const usePercent = level % 2 === 0;
  if (usePercent) {
    return {
      level,
      kind: 'estimation',
      prompt: `${pctOf}% of ${base}`,
      answer: Math.round((pctOf / 100) * base),
      nearMissMargin: Math.max(2, Math.round(base * 0.03)),
    };
  }

  // product of two numbers each rounded to a "nice" leading value, so the
  // actual mental technique (round, multiply, done) stays available at
  // every level instead of becoming a raw big-number multiplication
  const roundTo = level <= 3 ? 10 : level <= 6 ? 20 : 50;
  const a = randInt(rng, 2, 6 + level) * roundTo;
  const b = randInt(rng, 2, 4 + Math.floor(level / 2)) * roundTo;
  return {
    level,
    kind: 'estimation',
    prompt: `about how much is ${a} × ${b}?`,
    answer: a * b,
    nearMissMargin: Math.max(10, Math.round(a * b * 0.08)),
  };
}

const KIND_ROTATION: PuzzleKind[] = ['arithmetic', 'sequence', 'estimation'];

function generatePuzzle(level: number): Puzzle {
  const kind = KIND_ROTATION[(level - 1) % KIND_ROTATION.length];
  if (kind === 'arithmetic') return arithmeticPuzzle(level);
  if (kind === 'sequence') return sequencePuzzle(level);
  return estimationPuzzle(level);
}

export const TOTAL_LEVELS = 10;
export const PUZZLES: Puzzle[] = Array.from({ length: TOTAL_LEVELS }, (_, i) => generatePuzzle(i + 1));

// small deterministic PRNG so puzzle generation is stable across a session
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
