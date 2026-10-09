/**
 * C2 replacement: "the model would have stopped at X, you stopped at Y."
 *
 * The old chart plotted the Sukhov threshold function directly (log-scale
 * y-axis, "levels remaining needed to justify quitting") and was accurate but
 * unreadable to a general audience — plus the x-domain ran 0-8 while the data
 * only ever reached 1, and the reader's dot didn't line up with the dashed
 * threshold line it was meant to be compared against.
 *
 * Replaced with a single sentence, drawn: a track of attempt markers, a
 * Model-colored node where the optimal policy would have walked, a You-colored
 * node where the reader actually stopped, and the gap between them shaded.
 *
 * Framing note: this is attempts-within-the-final-level, not levels-across-
 * the-ladder. The model only ever produces a stopping point in terms of
 * attempts at the length you got stuck on — confirmed against optimal_action:
 * the policy never quits on an earlier LEVEL than the reader, since every
 * earlier level was solved to get there. A "model stops at level 5" framing
 * would not be backed by what the function actually computes.
 */
import type { GhostRun } from './ghost';
import { animateOnVisible } from './motion';

export interface RunwayData {
  /** total attempts to show on the track (at least enough to cover both markers) */
  trackLength: number;
  /** 1-indexed attempt the model would have walked on; null if it never got the chance to */
  modelStopAt: number | null;
  /** 1-indexed attempt the reader actually stopped on */
  youStopAt: number;
}

export function runwayFromGhost(ghost: GhostRun): RunwayData {
  const youStopAt = ghost.attempts.length;
  const modelStopAt = ghost.ghostQuitAttempt;
  const trackLength = Math.max(youStopAt, modelStopAt ?? 0, 1);
  return { trackLength, modelStopAt, youStopAt };
}

export function renderRunway(container: HTMLElement, data: RunwayData): string {
  const { trackLength, modelStopAt, youStopAt } = data;

  if (modelStopAt === null) {
    // reader never missed on their final length — nothing for the model to
    // react to, so there's no gap to draw. Handled by the caller's copy
    // branch; this chart simply doesn't render.
    container.innerHTML = '';
    return '';
  }

  const pct = (n: number) => `${((n - 0.5) / trackLength) * 100}%`;
  const lower = Math.min(modelStopAt, youStopAt);
  const upper = Math.max(modelStopAt, youStopAt);
  const gapLeft = pct(lower);
  const gapWidth = `${((upper - lower) / trackLength) * 100}%`;

  const ticks = Array.from({ length: trackLength }, (_, i) => `<span class="tick">${i + 1}</span>`).join('');

  const gapAttempts = upper - lower;
  const gapLabel =
    gapAttempts === 0
      ? 'no gap &mdash; same attempt'
      : `${gapAttempts} attempt${gapAttempts === 1 ? '' : 's'} of runway`;

  container.innerHTML = `
    <div class="runway chart-grow">
      <span class="gap-label" style="left:${((lower + upper) / 2 / trackLength) * 100}%">${gapLabel}</span>
      <span class="flag you" style="left:${pct(youStopAt)}">you stopped</span>
      <div class="track">
        <div class="gap-fill" style="left:${gapLeft};width:${gapWidth}"></div>
        <span class="node you" style="left:${pct(youStopAt)}"></span>
        <span class="node mod" style="left:${pct(modelStopAt)}"></span>
      </div>
      <span class="flag mod" style="left:${pct(modelStopAt)}">model walks</span>
      <div class="tickrow">${ticks}</div>
    </div>
  `;
  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
  return container.innerHTML;
}
