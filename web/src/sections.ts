import type { LadderResult } from './ladder';
import { classifyQuit } from './stopping';
import { PUZZLES } from './puzzles';
import { HARVARDX, DUOLINGO, OVER_PERSISTENCE, SUKHOV } from './data';
import { renderSmallMultiples, renderStoppingCurve } from './charts';

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
  const totalLevels = PUZZLES.length;
  const effectiveLevel = result.finished ? totalLevels : result.quitLevel;

  const levelAttempts = result.attempts.filter((a) => a.level === effectiveLevel);
  const successes = levelAttempts.filter((a) => a.correct).length;
  const failures = levelAttempts.filter((a) => !a.correct).length;
  const verdict = classifyQuit(successes, failures, result.levelsRemaining);

  root.innerHTML = `
    ${renderInstantReveal(result, totalLevels)}
    ${renderNearMiss(result)}
    ${renderStoppingExplainer()}
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

function renderInstantReveal(result: LadderResult, totalLevels: number): string {
  if (result.finished) {
    return `
      <section class="reveal-section" id="reveal-instant">
        <h2>You cleared every level.</h2>
        <p>All ${totalLevels}, solved. No quit point to measure &mdash; so there's nothing here for you. Scroll on anyway.</p>
      </section>
    `;
  }
  return `
    <section class="reveal-section" id="reveal-instant">
      <h2>You quit at level <span class="count-up" data-target="${result.quitLevel}">0</span>.</h2>
      <p><span class="count-up" data-target="${result.levelsRemaining}">0</span> level${result.levelsRemaining === 1 ? '' : 's'} were still ahead of you, out of ${totalLevels} total.</p>
      <p class="stat-mono">time on the ladder: ${result.timeToQuitSeconds}s</p>
    </section>
  `;
}

function renderNearMiss(result: LadderResult): string {
  const near = result.lastAttemptWasNearMiss;
  return `
    <section class="reveal-section" id="reveal-near-miss">
      <h2>${near ? 'Your last answer was close.' : 'Your last answer wasn’t close.'}</h2>
      <p>${
        near
          ? 'You were within a small margin of the right number — a near miss, not a wild guess. People who get this close tend to persist longer. You didn’t.'
          : 'Not a near miss — you walked away from something that wasn’t teasing you with closeness. That’s a cleaner quit than most.'
      }</p>
    </section>
  `;
}

function renderStoppingExplainer(): string {
  return `
    <section class="reveal-section" id="reveal-stopping">
      <h2>There's a mathematically optimal point to give up.</h2>
      <p>
        Sukhov et al. (2025, N=${SUKHOV.n.toLocaleString()}) modeled exactly this kind of decision:
        keep trying an uncertain task, or abandon it for a fresh one. The optimal strategy depends
        on how many failures you've stacked up and how much runway you have left.
      </p>
      <div id="stopping-chart" class="chart-container"></div>
      <p class="chart-note">
        We're borrowing their model's structure &mdash; a chess puzzle isn't literally a Bernoulli
        bandit &mdash; but the shape of the decision (quit under uncertainty, with a finite
        budget) is the same.
      </p>
      <p id="verdict-text"></p>
    </section>
  `;
}

function renderOverPersistence(): string {
  return `
    <section class="reveal-section" id="reveal-over-persistence">
      <h2>But people don't just quit too early.</h2>
      <p>
        In MTurk studies where the paid task ended and participants were offered an unpaid,
        reward-free extension, roughly <span class="count-up" data-target="${OVER_PERSISTENCE.approxPctWhoContinuedForNoReward}" data-suffix="%">0%</span>
        kept working anyway.
      </p>
      <p>People quit winnable tasks too late, and persist with worthless ones for no reason at all. Both.</p>
    </section>
  `;
}

function renderZoomOut(): string {
  return `
    <section class="reveal-section" id="reveal-zoom-out">
      <h2>You're not alone. Almost no one finishes.</h2>
      <p>
        Across ${HARVARDX.courses.length} HarvardX/MITx courses, ${HARVARDX.registered.toLocaleString()} people
        registered. ${HARVARDX.pctCertifiedOfRegistered}% finished with a certificate.
        Most language learners on Duolingo don't come back after day one
        (${DUOLINGO.pctSingleDayOnly}% are single-day users). Most Steam achievements are
        unlocked by a small minority of players who bought the game.
      </p>
      <div id="small-multiples"></div>
    </section>
  `;
}

function renderCoda(): string {
  return `
    <section class="reveal-section" id="reveal-coda">
      <h2>Content keeps getting longer. Completion keeps dropping.</h2>
      <p>
        That's not a contradiction. Length signals value to people who are deciding whether to
        start &mdash; buyers, students, subscribers &mdash; most of whom will never finish it anyway.
        The quit point isn't a failure of willpower. It's the most common outcome there is.
      </p>
    </section>
  `;
}

function renderReplay(): string {
  return `
    <section class="reveal-section" id="reveal-replay">
      <h2>Try again?</h2>
      <p>The board's still there.</p>
      <button id="replay-btn" type="button">Play again</button>
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
