/**
 * C3 replacement: the ghost as two literal parallel tracks.
 *
 * Your track: one dot per attempt you actually made, filled You-color.
 * Model track: one dot per attempt the policy would have made before
 * walking, filled Model-color, then empty/dashed from there on — or, if it
 * never had a reason to walk (clean quit), a fading trail of model-colored
 * dots running past your stop point to show it was still climbing. See
 * runway.ts for the full rationale on never leaving a branch chart-less.
 */
import type { GhostRun } from './ghost';

const CLEAN_QUIT_FADE_DOTS = 6;

export function renderRace(ghost: GhostRun): string {
  const total = ghost.attempts.length;

  if (ghost.ghostQuitAttempt === null) {
    return renderCleanQuitRace(total);
  }

  const modelLength = ghost.ghostQuitAttempt;

  const youDots = Array.from(
    { length: total },
    () => '<span class="dot on-you"></span>',
  ).join('');

  const modelDots = Array.from({ length: total }, (_, i) =>
    i < modelLength ? '<span class="dot on-mod"></span>' : '<span class="dot off"></span>',
  ).join('');

  return `
    <div class="race">
      <div class="lane">
        <span class="lane-name you">you</span>
        <div class="dots">${youDots}<span class="stopmark">stopped at ${total}</span></div>
      </div>
      <div class="lane">
        <span class="lane-name mod">model</span>
        <div class="dots">${modelDots}<span class="stopmark">walks at ${modelLength}</span></div>
      </div>
    </div>
  `;
}

function renderCleanQuitRace(total: number): string {
  const youDots = Array.from(
    { length: total },
    () => '<span class="dot on-you"></span>',
  ).join('');

  const modelDots = Array.from({ length: total + CLEAN_QUIT_FADE_DOTS }, (_, i) => {
    const opacity = Math.max(0.12, 1 - i * 0.14).toFixed(2);
    return `<span class="dot fade" style="opacity:${opacity}"></span>`;
  }).join('');

  return `
    <div class="race">
      <div class="lane">
        <span class="lane-name you">you</span>
        <div class="dots">${youDots}<span class="stopmark">stopped at ${total}</span></div>
      </div>
      <div class="lane">
        <span class="lane-name mod">model</span>
        <div class="dots">${modelDots}<span class="stopmark">still climbing</span></div>
      </div>
    </div>
  `;
}
