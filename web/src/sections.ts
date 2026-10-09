import type { LadderResult } from './ladder';
import { TOTAL_LEVELS } from './puzzles';
import { OVER_PERSISTENCE, SUKHOV } from './data';
import { renderSmallMultiples } from './charts';
import { simulateGhost, type GhostRun } from './ghost';
import { runwayFromGhost, renderRunway } from './runway';
import { renderRace } from './race';
import { renderUnitGrid } from './unitgrid';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** every post-quit section, in scroll order — used by the progress rail */
export const REVEAL_SECTION_IDS = [
  'reveal-instant',
  'reveal-near-miss',
  'reveal-stopping',
  'reveal-ghost',
  'reveal-over-persistence',
  'reveal-zoom-out',
  'reveal-coda',
  'reveal-replay',
] as const;

function countUp(el: HTMLElement, target: number, suffix = '', duration = 900) {
  if (REDUCE_MOTION) {
    el.textContent = `${target}${suffix}`;
    return;
  }
  const start = performance.now();
  function tick(now: number) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    el.textContent = `${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function observeIn(el: Element) {
  if (REDUCE_MOTION) {
    el.classList.add('in-view');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.disconnect();
        }
      }
    },
    { threshold: 0.2 },
  );
  observer.observe(el);
}

/** Builds and inserts every post-quit scroll section. Called once, right after quit/finish. */
export function buildRevealSections(root: HTMLElement, result: LadderResult) {
  const totalLevels = TOTAL_LEVELS;
  const finalLevel = result.finished ? totalLevels : result.quitLevel;
  const ghost = simulateGhost(result.attempts, finalLevel, totalLevels);

  // reader's completion, same units as the Steam median (% of the whole thing)
  const readerCompletionPct = result.finished ? 100 : Math.round((result.quitLevel / totalLevels) * 100);

  root.innerHTML = `
    ${renderInstantReveal(result, totalLevels)}
    ${renderPacingBeat(result)}
    ${renderNearMiss(result)}
    ${renderStoppingExplainer(ghost)}
    ${renderGhost(ghost, result)}
    ${renderOverPersistence()}
    ${renderZoomOut()}
    ${renderCoda()}
    ${renderReplay()}
  `;

  // post-insert wiring that needs live DOM nodes
  wireCountUps(root);

  const runwayHost = root.querySelector<HTMLElement>('#runway-chart');
  if (runwayHost) renderRunway(runwayHost, runwayFromGhost(ghost));

  renderSmallMultiples(root.querySelector('#small-multiples')!, readerCompletionPct);

  const unitGridHost = root.querySelector<HTMLElement>('#mturk-units');
  if (unitGridHost) renderUnitGrid(unitGridHost, OVER_PERSISTENCE.approxPctWhoContinuedForNoReward);

  wireExpandables(root);

  for (const section of root.querySelectorAll('.reveal-section')) {
    observeIn(section);
  }
}

/* ============================================================
 * THE REVEAL
 * ============================================================ */

function renderInstantReveal(result: LadderResult, totalLevels: number): string {
  if (result.finished) {
    return `
      <section class="reveal-section section-reveal" id="reveal-instant">
        <div class="reveal-stack">
          <p class="kicker kicker-inverse">the reveal</p>
          <h2 class="reveal-headline">You cleared every length. All ${totalLevels} of them.</h2>
          <p class="reveal-lede">No quit point to measure &mdash; so there's nothing here for you. Scroll on anyway.</p>
        </div>
      </section>
    `;
  }
  return `
    <section class="reveal-section section-reveal" id="reveal-instant">
      <div class="reveal-stack">
        <p class="kicker kicker-inverse">the reveal</p>
        <div class="reveal-numeral">
          <span class="count-up" data-target="${result.sequenceLengthAtQuit}">0</span>
        </div>
        <h2 class="reveal-headline">tiles is where you stopped.</h2>
        <p class="reveal-lede">
          <mark class="you">${result.levelsRemaining} level${result.levelsRemaining === 1 ? '' : 's'}</mark>
          were still ahead of you.
        </p>
        <dl class="reveal-meta">
          <div><dt>time on the ladder</dt><dd>${result.timeToQuitSeconds}s</dd></div>
          <div><dt>tries at that length</dt><dd>${result.attemptsOnFinalLevel}</dd></div>
        </dl>
      </div>
    </section>
  `;
}

/** A single short line, alone, between dense sections — a place for the eye to rest. */
function renderPacingBeat(result: LadderResult): string {
  if (result.finished) return '';
  return `<p class="pacing-beat" aria-hidden="true">You stopped at ${result.sequenceLengthAtQuit}.</p>`;
}

/* ============================================================
 * NEAR MISS
 * ============================================================ */

function renderNearMiss(result: LadderResult): string {
  // A3: quitting before ever attempting the final level is its own case —
  // "broke down after 0 tiles" was a bug, not a finding.
  if (result.quitBeforeAnyAttempt) {
    return `
      <section class="reveal-section section-prose" id="reveal-near-miss">
        <div class="prose-inner">
          <p class="kicker">near miss?</p>
          <h2>You quit before you got a single sequence wrong.</h2>
          <p class="lede">
            No miss to measure &mdash; you walked away clean. That's <mark>rarer than it sounds</mark>:
            most people wait for at least one wrong answer before they call it.
          </p>
        </div>
      </section>
    `;
  }

  const near = result.lastAttemptWasNearMiss;
  const lastAttempt = result.attempts[result.attempts.length - 1];
  const matched = lastAttempt?.matchedPrefix ?? 0;

  return `
    <section class="reveal-section section-prose" id="reveal-near-miss">
      <div class="prose-inner">
        <p class="kicker">near miss?</p>
        <h2>${near ? 'You missed it by one tile.' : 'You lost the thread early.'}</h2>
        <p class="lede">${
          near
            ? `You had <mark class="you">${matched} of ${result.sequenceLengthAtQuit} tiles</mark> right
               before it came apart. People who get this close tend to persist longer. You didn't.`
            : `The sequence broke down after <mark>${matched} tile${matched === 1 ? '' : 's'}</mark>.
               Not a near miss &mdash; a cleaner quit than most.`
        }</p>
      </div>
    </section>
  `;
}

/* ============================================================
 * THE MATH — runway chart (C2)
 * ============================================================ */

function renderStoppingExplainer(ghost: GhostRun): string {
  const runway = runwayFromGhost(ghost);

  if (runway.modelStopAt === null) {
    return `
      <section class="reveal-section section-chart" id="reveal-stopping">
        <div class="prose-inner">
          <p class="kicker">the math</p>
          <h2>There's a mathematically optimal point to give up &mdash; you never needed it.</h2>
          <p class="lede">
            Sukhov et al. (2025, N=${SUKHOV.n.toLocaleString()}) modeled exactly this decision: keep
            trying an uncertain task, or walk. You never gave the model a wrong answer to react to,
            so there's no gap to show.
          </p>
        </div>
      </section>
    `;
  }

  const gap = Math.abs(runway.youStopAt - runway.modelStopAt);
  const gapSentence =
    gap === 0
      ? `You stopped on the <mark class="model">exact attempt</mark> the model would have.`
      : `The model would have walked <mark class="model">${gap} attempt${gap === 1 ? '' : 's'}</mark>
         before <mark class="you">you</mark> did.`;

  return `
    <section class="reveal-section section-chart" id="reveal-stopping">
      <div class="prose-inner">
        <p class="kicker">the math</p>
        <h2>${gap === 0 ? 'You stopped exactly when the math did.' : 'The model would have walked sooner.'}</h2>
        <p class="lede">${gapSentence}</p>
      </div>
      <figure id="runway-chart" class="chart-bleed"></figure>
      <div class="prose-inner">
        <details class="method-details">
          <summary>Show the method</summary>
          <p class="footnote">
            Sukhov et al. (2025, N=${SUKHOV.n.toLocaleString()}) modeled this as an optimal-stopping
            problem: keep trying an uncertain task, or abandon it, given how many failures you've
            stacked up and how much runway you have left. We're borrowing the model's structure, not
            claiming a memory span ladder is literally their task. In the original study "quit" means
            switching to a fresh task, not stopping altogether &mdash; this ladder has nothing to
            switch to, so we read the policy's "quit" as "this length isn't worth your remaining budget."
          </p>
        </details>
      </div>
    </section>
  `;
}

/* ============================================================
 * THE GHOST — two-lane race (C3)
 * ============================================================ */

function renderGhost(ghost: GhostRun, result: LadderResult): string {
  if (ghost.ghostQuitAttempt === null) {
    return `
      <section class="reveal-section section-chart invert" id="reveal-ghost">
        <div class="prose-inner">
          <p class="kicker kicker-inverse">the ghost</p>
          <h2>${result.finished ? 'The ghost never had to leave.' : 'You walked before you were wrong.'}</h2>
          <p class="lede">
            We ran the optimal strategy alongside your exact session. ${
              result.finished
                ? 'It never got a failure to react to, so it stayed to the end &mdash; same as you.'
                : 'You stopped clean, so there was nothing for it to disagree with.'
            }
          </p>
        </div>
      </section>
    `;
  }

  const headline = ghost.matchedOptimal
    ? 'You stopped exactly when the math did.'
    : `The ghost left ${ghost.extraAttempts} attempt${ghost.extraAttempts === 1 ? '' : 's'} before you did.`;

  return `
    <section class="reveal-section section-chart invert" id="reveal-ghost">
      <div class="prose-inner">
        <p class="kicker kicker-inverse">the ghost</p>
        <h2>${headline}</h2>
        <p class="lede">${
          ghost.matchedOptimal
            ? `Your first miss at ${result.sequenceLengthAtQuit} tiles was the model's cue to walk.
               <mark class="model">Most people don't stop there.</mark> Most people watch it again.`
            : `You missed on try ${ghost.ghostQuitAttempt}, then watched
               <mark class="you">${ghost.extraAttempts} more sequence${ghost.extraAttempts === 1 ? '' : 's'}</mark>
               at that same length before giving up.`
        }</p>
      </div>
      <div class="chart-bleed">${renderRace(ghost)}</div>
    </section>
  `;
}

/* ============================================================
 * THE OTHER FAILURE MODE — pull quote (C4 unit grid)
 * ============================================================ */

function renderOverPersistence(): string {
  return `
    <section class="reveal-section section-pullquote" id="reveal-over-persistence">
      <div class="pullquote-inner">
        <p class="kicker">the other failure mode</p>
        <p class="pullquote">
          <mark class="you count-up-mark"><span class="count-up" data-target="${OVER_PERSISTENCE.approxPctWhoContinuedForNoReward}" data-suffix="%">0%</span></mark>
          of MTurk workers kept clicking after the money stopped.
        </p>
        <div id="mturk-units" class="unit-grid-host"></div>
        <p class="footnote">Each square is one worker. Offered an unpaid, reward-free extension after the paid task ended, half carried on anyway. Both failure modes, same person: quit winnable tasks too late, persist with worthless ones for no reason at all.</p>
      </div>
    </section>
  `;
}

/* ============================================================
 * ZOOM OUT (C5: reader's row dropped into the Steam list)
 * ============================================================ */

function renderZoomOut(): string {
  return `
    <section class="reveal-section section-zoomout" id="reveal-zoom-out">
      <div class="prose-inner">
        <p class="kicker">zoom out</p>
        <h2>Almost no one finishes. You're one data point in a very long list.</h2>
      </div>
      <div id="small-multiples" class="zoomout-charts"></div>
    </section>
  `;
}

/* ============================================================
 * CODA / REPLAY
 * ============================================================ */

function renderCoda(): string {
  return `
    <section class="reveal-section section-coda" id="reveal-coda">
      <div class="prose-inner">
        <p class="kicker">closing argument</p>
        <h2>Content keeps getting longer. Completion keeps dropping.</h2>
        <p class="lede">
          Length signals value to people deciding whether to start, most of whom will
          <mark>never finish it anyway</mark>. The quit point isn't a failure of willpower.
          It's the most common outcome there is.
        </p>
      </div>
    </section>
  `;
}

function renderReplay(): string {
  return `
    <section class="reveal-section section-replay" id="reveal-replay">
      <div class="prose-inner">
        <h2>Try again?</h2>
        <p>New sequences every time. Same decision, waiting for you.</p>
        <button id="replay-btn" type="button">Play again</button>
      </div>
    </section>
  `;
}

/* ============================================================
 * wiring
 * ============================================================ */

function wireCountUps(root: HTMLElement) {
  for (const el of root.querySelectorAll<HTMLElement>('.count-up')) {
    const target = Number(el.dataset.target ?? '0');
    const suffix = el.dataset.suffix ?? '';
    observeAndCountUp(el, target, suffix);
  }
}

function observeAndCountUp(el: HTMLElement, target: number, suffix: string) {
  if (REDUCE_MOTION) {
    el.textContent = `${target}${suffix}`;
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          countUp(el, target, suffix);
          observer.disconnect();
        }
      }
    },
    { threshold: 0.5 },
  );
  observer.observe(el);
}

/** Keeps methodology out of the main read: collapsed by default, no JS beyond native <details>. */
function wireExpandables(_root: HTMLElement) {
  // native <details>/<summary> needs no JS wiring; kept as a named hook in
  // case expandables grow state (e.g. remembering open/closed) later.
}
