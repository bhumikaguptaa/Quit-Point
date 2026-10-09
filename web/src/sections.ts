import type { LadderResult } from './ladder';
import { classifyQuit } from './stopping';
import { TOTAL_LEVELS } from './puzzles';
import { HARVARDX, DUOLINGO, OVER_PERSISTENCE, SUKHOV } from './data';
import { renderSmallMultiples, renderStoppingCurve } from './charts';
import { simulateGhost, type GhostRun } from './ghost';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const effectiveLevel = result.finished ? totalLevels : result.quitLevel;

  const levelAttempts = result.attempts.filter((a) => a.level === effectiveLevel);
  const successes = levelAttempts.filter((a) => a.correct).length;
  const failures = levelAttempts.filter((a) => !a.correct).length;
  const verdict = classifyQuit(successes, failures, result.levelsRemaining);

  const ghost = simulateGhost(result.attempts, effectiveLevel, totalLevels);

  root.innerHTML = `
    ${renderInstantReveal(result, totalLevels)}
    ${renderNearMiss(result)}
    ${renderStoppingExplainer()}
    ${renderGhost(ghost, result)}
    ${renderOverPersistence()}
    ${renderZoomOut()}
    ${renderCoda()}
    ${renderReplay()}
  `;

  // post-insert wiring that needs live DOM nodes
  wireCountUps(root, result, totalLevels);
  renderStoppingCurve(
    root.querySelector('#stopping-chart')!,
    result.finished ? null : { successes, failures, remaining: result.levelsRemaining },
  );
  renderSmallMultiples(root.querySelector('#small-multiples')!);
  wireVerdictText(root, verdict);

  for (const section of root.querySelectorAll('.reveal-section')) {
    observeIn(section);
  }
}

/**
 * The one hard colour cut in the piece. Oversized numeral bleeding past its
 * own column — deliberately NOT the eyebrow/headline/paragraph/card recipe
 * every other section used to follow.
 */
function renderInstantReveal(result: LadderResult, totalLevels: number): string {
  if (result.finished) {
    return `
      <section class="reveal-section section-reveal is-finished" id="reveal-instant">
        <div class="reveal-stack">
          <p class="kicker kicker-inverse">the reveal</p>
          <h2 class="reveal-headline">You cleared every length.</h2>
          <p class="reveal-sub">
            All ${totalLevels} of them, up to ${result.sequenceLengthAtQuit} tiles. No quit point to
            measure &mdash; so there's nothing here for you. Scroll on anyway.
          </p>
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
        <p class="reveal-headline">tiles is where you stopped.</p>
        <p class="reveal-sub">
          You held ${result.sequenceLengthAtQuit - 1} and reached for
          ${result.sequenceLengthAtQuit}. ${result.levelsRemaining} level${result.levelsRemaining === 1 ? '' : 's'}
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

function renderNearMiss(result: LadderResult): string {
  const near = result.lastAttemptWasNearMiss;
  const lastAttempt = result.attempts[result.attempts.length - 1];
  const matched = lastAttempt?.matchedPrefix ?? 0;

  return `
    <section class="reveal-section section-prose" id="reveal-near-miss">
      <div class="prose-inner">
        <p class="kicker">near miss?</p>
        <h2>${near ? 'You missed it by one tile.' : 'You lost the thread early.'}</h2>
        <p>${
          near
            ? `You had ${matched} of ${result.sequenceLengthAtQuit} tiles in the right order before it
               came apart &mdash; a near miss, not a guess. People who get this close tend to persist
               longer. You didn't.`
            : `The sequence broke down after ${matched} tile${matched === 1 ? '' : 's'}. You weren't
               being teased by closeness, which makes this a cleaner quit than most.`
        }</p>
      </div>
    </section>
  `;
}

/**
 * Edge-to-edge chart with the prose in a narrow column beside it, so the
 * climax chart isn't just another padded white card.
 */
function renderStoppingExplainer(): string {
  return `
    <section class="reveal-section section-chart" id="reveal-stopping">
      <div class="chart-lede">
        <p class="kicker">the math</p>
        <h2>There's a mathematically optimal point to give up.</h2>
        <p>
          Sukhov et al. (2025, N=${SUKHOV.n.toLocaleString()}) modeled exactly this kind of decision:
          keep trying an uncertain task, or abandon it for a fresh one. The optimal strategy depends
          on how many failures you've stacked up and how much runway you have left.
        </p>
        <p class="chart-explainer">
          The line is the model's quit threshold &mdash; how many levels you'd need left to make
          quitting the smart move, given your run at the length you stopped on. It drops to the
          floor almost immediately, which is the model saying "walk the moment you're wrong."
          Your dot is where you actually stood.
        </p>
      </div>
      <figure id="stopping-chart" class="chart-bleed"></figure>
      <div class="chart-foot">
        <p class="chart-note">
          We're borrowing their model's structure &mdash; a memory span ladder isn't literally the
          button-pressing task their participants did &mdash; but the shape of the decision (quit
          under uncertainty, with a finite budget) is the same.
        </p>
        <p id="verdict-text"></p>
      </div>
    </section>
  `;
}

function renderGhost(ghost: GhostRun, result: LadderResult): string {
  // reader never failed on their final level (quit cold, or finished the ladder)
  if (ghost.ghostQuitAttempt === null) {
    return `
      <section class="reveal-section section-prose" id="reveal-ghost">
        <div class="prose-inner">
          <p class="kicker">the ghost</p>
          <h2>${result.finished ? 'The ghost never had to leave.' : 'You walked before you were wrong.'}</h2>
          <p>
            We ran the optimal strategy against your exact session &mdash; a ghost watching the same
            sequences you watched. ${
              result.finished
                ? 'You never gave it a failure to react to. It stayed to the end, same as you.'
                : 'You stopped without missing a sequence at that length, so the model never got a reason to abandon it. There was nothing for the ghost to disagree with.'
            }
          </p>
        </div>
      </section>
    `;
  }

  const trackEls = ghost.attempts
    .map((a) => {
      const classes = [
        'ghost-cell',
        a.correct ? 'is-correct' : 'is-wrong',
        a.nearMiss ? 'is-near' : '',
        a.afterGhostLeft ? 'is-extra' : '',
        a.ghostQuitHere ? 'is-ghost-exit' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `
        <div class="${classes}" style="--i: ${a.index}">
          <span class="ghost-cell-dot"></span>
          <span class="ghost-cell-num">${a.index}</span>
        </div>
      `;
    })
    .join('');

  const headline = ghost.matchedOptimal
    ? 'You stopped exactly when the math did.'
    : `The ghost left ${ghost.extraAttempts} attempt${ghost.extraAttempts === 1 ? '' : 's'} before you did.`;

  const body = ghost.matchedOptimal
    ? `Your first missed sequence at ${result.sequenceLengthAtQuit} tiles was the model's cue to walk
       &mdash; and that's exactly where you stopped. Most people don't. Most people watch it again.`
    : `The optimal strategy walks at the first miss, once there's nothing banked to justify staying.
       You missed on try ${ghost.ghostQuitAttempt}, and then watched
       <strong>${ghost.extraAttempts}</strong> more sequence${ghost.extraAttempts === 1 ? '' : 's'}
       at that same length before giving up. That gap is the over-persistence, measured on you.`;

  return `
    <section class="reveal-section section-prose" id="reveal-ghost">
      <div class="prose-inner">
        <p class="kicker">the ghost</p>
        <h2>${headline}</h2>
        <p>
          We ran the optimal strategy against your exact session &mdash; a ghost sitting at
          ${result.sequenceLengthAtQuit} tiles alongside you, seeing every sequence you saw.
        </p>
        <div class="ghost-track-wrap">
          <div class="ghost-track-labels">
            <span class="ghost-legend"><i class="swatch-you"></i> your tries</span>
            <span class="ghost-legend"><i class="swatch-extra"></i> after the ghost left</span>
          </div>
          <div class="ghost-track">${trackEls}</div>
        </div>
        <p>${body}</p>
        <p class="chart-note">
          Caveat worth stating: in the original study "quit" means switching to a fresh task, not
          stopping altogether. This ladder has nothing to switch to, so we read it as "this level
          isn't worth your remaining budget."
        </p>
      </div>
    </section>
  `;
}

/** Pull-quote layout: the stat is the whole section, set large and inline. */
function renderOverPersistence(): string {
  return `
    <section class="reveal-section section-pullquote" id="reveal-over-persistence">
      <div class="pullquote-inner">
        <p class="kicker">the other failure mode</p>
        <p class="pullquote">
          Offered an unpaid, reward-free extension after the paid task ended,
          <span class="count-up pullquote-stat" data-target="${OVER_PERSISTENCE.approxPctWhoContinuedForNoReward}" data-suffix="%">0%</span>
          of MTurk participants kept working anyway.
        </p>
        <p class="pullquote-foot">
          People quit winnable tasks too late, and persist with worthless ones for no reason at
          all. Both failure modes, same person.
        </p>
      </div>
    </section>
  `;
}

/** Stat chips flowing inline like text, then the small multiples. */
function renderZoomOut(): string {
  return `
    <section class="reveal-section section-zoomout" id="reveal-zoom-out">
      <div class="prose-inner">
        <p class="kicker">zoom out</p>
        <h2>You're not alone. Almost no one finishes.</h2>
        <p class="stat-flow">
          <span class="stat-chip"><b>${HARVARDX.pctCertifiedOfRegistered}%</b> of ${HARVARDX.registered.toLocaleString()} HarvardX students certified</span>
          <span class="stat-chip"><b>${DUOLINGO.pctSingleDayOnly}%</b> of Duolingo learners never return after day one</span>
          <span class="stat-chip"><b>4.4%</b> median achievement rate, Assassin's Creed Valhalla</span>
        </p>
      </div>
      <div id="small-multiples" class="zoomout-charts"></div>
    </section>
  `;
}

function renderCoda(): string {
  return `
    <section class="reveal-section section-coda" id="reveal-coda">
      <div class="prose-inner">
        <p class="kicker">closing argument</p>
        <h2>Content keeps getting longer. Completion keeps dropping.</h2>
        <p>
          That's not a contradiction. Length signals value to people who are deciding whether to
          start &mdash; buyers, students, subscribers &mdash; most of whom will never finish it anyway.
          The quit point isn't a failure of willpower. It's the most common outcome there is.
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

function wireCountUps(root: HTMLElement, _result: LadderResult, _totalLevels: number) {
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

function wireVerdictText(root: HTMLElement, verdict: ReturnType<typeof classifyQuit>) {
  const el = root.querySelector<HTMLElement>('#verdict-text');
  if (!el) return;
  if (verdict.verdict === 'quit_early') {
    el.innerHTML = `<strong>You quit early.</strong> Given what you'd observed, the optimal strategy says you still had room to keep trying.`;
  } else {
    el.innerHTML = `<strong>Your timing checks out.</strong> The optimal strategy agrees: that was a reasonable, or even overdue, place to stop.`;
  }
}
