/**
 * "The ghost": replays the Sukhov optimal-stopping policy against the
 * reader's ACTUAL attempt sequence and reports where the policy would have
 * walked away.
 *
 * Modelling caveat (surfaced in the UI, not hidden here): in Sukhov et al.
 * "quit" means abandoning the current arm for a FRESH one from the same
 * pool — it does not mean ending the session. This ladder has no equivalent
 * move: levels only get harder and there is nothing to switch to. So we read
 * the policy's "quit" as "this level is no longer worth your remaining
 * budget", which on this ladder is effectively "stop here".
 *
 * Two facts verified against the model (and the reason this section measures
 * attempts rather than levels):
 *
 * 1. The ghost never quits on an EARLIER level than the reader. The reader
 *    only fails on the level they are stuck on — every level before it they
 *    solved, which is how they advanced — so the ghost sails through those
 *    with zero failures and never faces a quit decision. Both arrive at the
 *    final level together.
 * 2. On that final level, with 0-1 successes banked, the policy quits on the
 *    FIRST failure. A reader can bank at most one success per level, so the
 *    ghost essentially always walks at the reader's first wrong answer.
 *
 * The real gap is therefore every attempt the reader made after their first
 * wrong answer on the level they quit on.
 */
import type { AttemptRecord } from './ladder';
import { optimalAction } from './stopping';

export interface GhostAttempt {
  /** 1-indexed position within the final level's attempt sequence */
  index: number;
  correct: boolean;
  nearMiss: boolean;
  /** true on the attempt at which the policy would have walked away */
  ghostQuitHere: boolean;
  /** true for attempts the reader made after the ghost had already gone */
  afterGhostLeft: boolean;
}

export interface GhostRun {
  /** the level both the reader and the ghost ended on */
  level: number;
  attempts: GhostAttempt[];
  /** 1-indexed attempt the ghost quit on; null if it never did (reader solved/never failed) */
  ghostQuitAttempt: number | null;
  /** attempts the reader made after the ghost walked away */
  extraAttempts: number;
  /** reader stopped at exactly the policy's moment */
  matchedOptimal: boolean;
}

/**
 * @param attempts     every attempt the reader made, in order
 * @param stopLevel    1-indexed level the reader quit on (or last level if finished)
 * @param totalLevels  ladder length
 */
export function simulateGhost(
  attempts: AttemptRecord[],
  stopLevel: number,
  totalLevels: number,
): GhostRun {
  const levelAttempts = attempts.filter((a) => a.level === stopLevel);
  const remaining = Math.max(1, totalLevels - stopLevel);

  const out: GhostAttempt[] = [];
  let ghostQuitAttempt: number | null = null;
  let w = 0;
  let f = 0;

  levelAttempts.forEach((attempt, i) => {
    const index = i + 1;
    let ghostQuitHere = false;

    if (ghostQuitAttempt === null) {
      if (attempt.correct) {
        w += 1;
      } else {
        f += 1;
        if (optimalAction(w, f, remaining) === 'quit') {
          ghostQuitHere = true;
          ghostQuitAttempt = index;
        }
      }
    }

    out.push({
      index,
      correct: attempt.correct,
      nearMiss: attempt.nearMiss,
      ghostQuitHere,
      afterGhostLeft: ghostQuitAttempt !== null && !ghostQuitHere,
    });
  });

  const extraAttempts = ghostQuitAttempt === null ? 0 : levelAttempts.length - ghostQuitAttempt;

  return {
    level: stopLevel,
    attempts: out,
    ghostQuitAttempt,
    extraAttempts,
    matchedOptimal: ghostQuitAttempt !== null && extraAttempts === 0,
  };
}
