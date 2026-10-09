/**
 * TypeScript port of data-analysis/notebooks/optimal_strategy.py +
 * reader_comparison.py. Keep this in sync with those files if the model
 * changes — see PROJECT.md Phase 1 for provenance (Sukhov et al. 2025,
 * "When to Keep Trying and When to Let Go").
 */

const MAX_T = 100;
const A0 = 1;
const B0 = 1;

const vCache = new Map<string, number>();

function V(w: number, f: number, T: number): number {
  if (T === 0) return 0;
  const key = `${w},${f},${T}`;
  const cached = vCache.get(key);
  if (cached !== undefined) return cached;

  const a = A0 + w;
  const b = B0 + f;
  const pSuccess = a / (a + b);
  const pFailure = b / (a + b);

  const persistValue = pSuccess * (1 + V(w + 1, f, T - 1)) + pFailure * V(w, f + 1, T - 1);

  const a0Ratio = A0 / (A0 + B0);
  const b0Ratio = B0 / (A0 + B0);
  const quitValue = a0Ratio * (1 + V(1, 0, T - 1)) + b0Ratio * V(0, 1, T - 1);

  const result = Math.max(persistValue, quitValue);
  vCache.set(key, result);
  return result;
}

export function optimalAction(w: number, f: number, T: number): 'persist' | 'quit' {
  if (T === 0) return 'persist';

  const a = A0 + w;
  const b = B0 + f;
  const pSuccess = a / (a + b);
  const pFailure = b / (a + b);

  const persistValue = pSuccess * (1 + V(w + 1, f, T - 1)) + pFailure * V(w, f + 1, T - 1);

  const a0Ratio = A0 / (A0 + B0);
  const b0Ratio = B0 / (A0 + B0);
  const quitValue = a0Ratio * (1 + V(1, 0, T - 1)) + b0Ratio * V(0, 1, T - 1);

  return persistValue >= quitValue ? 'persist' : 'quit';
}

/** Smallest remaining-pulls T at which it's optimal to quit; null if always persist within MAX_T. */
export function quittingThreshold(successes: number, failures: number, maxRemaining = MAX_T): number | null {
  for (let T = 1; T <= maxRemaining; T++) {
    if (optimalAction(successes, failures, T) === 'quit') return T;
  }
  return null;
}

export interface QuitVerdict {
  successes: number;
  failures: number;
  remaining: number;
  threshold: number | null;
  optimalCall: 'quit' | 'persist';
  verdict: 'on_time_or_late' | 'quit_early';
}

/**
 * successes/failures: observed outcomes on the CURRENT level before quitting.
 * remaining: how many levels (bounded by MAX_T) the optimal agent would still
 * have budget for. Mirrors reader_comparison.py's classify_quit.
 */
export function classifyQuit(successes: number, failures: number, remaining: number): QuitVerdict {
  const threshold = quittingThreshold(successes, failures, MAX_T);
  const optimalCall: 'quit' | 'persist' =
    threshold === null ? 'persist' : remaining >= threshold ? 'quit' : 'persist';

  const verdict: 'on_time_or_late' | 'quit_early' = optimalCall === 'quit' ? 'on_time_or_late' : 'quit_early';

  return { successes, failures, remaining, threshold, optimalCall, verdict };
}
