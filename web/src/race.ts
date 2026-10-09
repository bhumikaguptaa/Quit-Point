/**
 * C3 replacement: the ghost as two literal parallel tracks instead of one
 * row of mostly-hollow boxes with a floating "ghost leaves" label.
 *
 * Your track: one dot per attempt you actually made, filled You-color.
 * Model track: one dot per attempt the policy would have made before
 * walking, filled Model-color, then empty/dashed from there on.
 */
import type { GhostRun } from './ghost';

export function renderRace(ghost: GhostRun): string {
  const total = ghost.attempts.length;
  const modelLength = ghost.ghostQuitAttempt ?? total;

  const youDots = Array.from(
    { length: total },
    () => '<span class="dot on-you"></span>',
  ).join('');

  const modelDots = Array.from({ length: total }, (_, i) =>
    i < modelLength ? '<span class="dot on-mod"></span>' : '<span class="dot off"></span>',
  ).join('');

  const youStop = `stopped at ${total}`;
  const modStop = ghost.ghostQuitAttempt === null ? 'never had to leave' : `walks at ${modelLength}`;

  return `
    <div class="race">
      <div class="lane">
        <span class="lane-name you">you</span>
        <div class="dots">${youDots}<span class="stopmark">${youStop}</span></div>
      </div>
      <div class="lane">
        <span class="lane-name mod">model</span>
        <div class="dots">${modelDots}<span class="stopmark">${modStop}</span></div>
      </div>
    </div>
  `;
}
