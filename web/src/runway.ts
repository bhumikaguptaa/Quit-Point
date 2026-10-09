/**
 * C2 replacement: "the model would have stopped at X, you stopped at Y."
 *
 * Framing note: this is attempts-within-the-final-level, not levels-across-
 * the-ladder. The model only ever produces a stopping point in terms of
 * attempts at the length you got stuck on — confirmed against optimal_action:
 * the policy never quits on an earlier LEVEL than the reader, since every
 * earlier level was solved to get there. A "model stops at level 5" framing
 * would not be backed by what the function actually computes.
 *
 * Never-hide-a-chart rule: a reader who quit with zero wrong answers on
 * their final length gives the model nothing to react to, so there's no
 * finite "model stop" attempt. The fix is NOT to hide the chart — it's to
 * draw the honest version of that state: your marker sits at the one
 * attempt you made, and the model's track runs off the right edge with a
 * fade, because it had no reason to stop yet and would have kept going
 * indefinitely. That's a stronger image than a missing chart, not a weaker
 * one, and it was verified against three outcomes (clean quit, quit after
 * misses, finished the ladder) rather than leaving any of them as prose only.
 */
import type { GhostRun } from './ghost';
import { animateOnVisible } from './motion';

export interface RunwayData {
  trackLength: number;
  /** 1-indexed attempt the model would have walked on; null = it never got a reason to (runs off the edge) */
  modelStopAt: number | null;
  youStopAt: number;
}

export function runwayFromGhost(ghost: GhostRun): RunwayData {
  const youStopAt = ghost.attempts.length;
  const modelStopAt = ghost.ghostQuitAttempt;
  const trackLength = Math.max(youStopAt, modelStopAt ?? 0, 1);
  return { trackLength, modelStopAt, youStopAt };
}

export function renderRunway(container: HTMLElement, data: RunwayData): void {
  const { youStopAt, modelStopAt } = data;

  if (modelStopAt === null) {
    renderCleanQuitRunway(container, youStopAt);
    return;
  }

  const trackLength = data.trackLength;
  const pct = (n: number) => `${((n - 0.5) / trackLength) * 100}%`;
  const lower = Math.min(modelStopAt, youStopAt);
  const upper = Math.max(modelStopAt, youStopAt);
  const gapLeft = pct(lower);
  const gapWidth = `${((upper - lower) / trackLength) * 100}%`;

  const ticks = Array.from({ length: trackLength }, (_, i) => `<span class="tick">${i + 1}</span>`).join('');

  const gapAttempts = upper - lower;
  const gapLabel =
    gapAttempts === 0
      ? 'no gap, same attempt'
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
}

/**
 * Clean-quit state: your marker sits at the attempt you made, the model's
 * track fades off the right edge of the frame rather than resolving to a
 * point — it never got a reason to stop. Mirrors the reference kit's
 * `.runoff` treatment exactly (a gradient from the model color to transparent).
 */
function renderCleanQuitRunway(container: HTMLElement, youStopAt: number): void {
  // show a few ticks of "still climbing" runway past where the reader stopped
  const visibleTicks = youStopAt + 6;
  const youPct = `${(youStopAt / visibleTicks) * 100}%`;

  const ticks = Array.from({ length: visibleTicks }, (_, i) => `<span class="tick">${i + 1}</span>`).join('');

  container.innerHTML = `
    <div class="runway chart-grow is-clean-quit">
      <span class="flag you" style="left:${youPct}">you stopped</span>
      <div class="track">
        <div class="runoff" style="left:${youPct}"></div>
        <span class="node you" style="left:${youPct}"></span>
      </div>
      <span class="flag mod">the model was still going &rarr;</span>
      <div class="tickrow">${ticks}</div>
    </div>
  `;
  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
