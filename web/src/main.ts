import './style.css';
import { Ladder, type LadderResult } from './ladder';
import { buildRevealSections, REVEAL_SECTION_IDS } from './sections';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <nav class="progress-rail" id="progress-rail" aria-hidden="true" hidden>
    ${REVEAL_SECTION_IDS.map((id) => `<i data-rail-for="${id}"></i>`).join('')}
  </nav>

  <section id="cold-open">
    <div class="landing" id="landing">
      <header class="cold-open-head">
        <h1 class="site-title">The Quit Point</h1>
        <p class="site-tagline">Watch the sequence. Tap it back. It gets longer.</p>
      </header>
      <button id="begin-btn" type="button" class="begin-btn">Begin</button>
    </div>

    <div class="play-area" id="play-area" hidden>
      <div class="countdown" id="countdown" aria-live="polite"></div>
      <div id="puzzle-board"></div>
      <div class="cold-open-foot">
        <button id="quit-btn" type="button">I give up</button>
        <p class="wall-nudge" id="wall-nudge" hidden>Three misses at this length. Keep going, or stop.</p>
      </div>
    </div>

    <p class="scroll-cue" id="scroll-cue" aria-hidden="true">keep scrolling &darr;</p>
  </section>
  <div id="reveal-root"></div>
`;

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ladder: Ladder;

function wireScrollCueDismiss() {
  const cue = document.querySelector<HTMLElement>('#scroll-cue');
  if (!cue) return;
  const dismiss = () => {
    cue.classList.add('is-gone');
    window.removeEventListener('scroll', dismiss);
  };
  window.addEventListener('scroll', dismiss, { once: true, passive: true });
}

function runCountdown(onDone: () => void) {
  const el = document.querySelector<HTMLElement>('#countdown')!;
  if (REDUCE_MOTION) {
    onDone();
    return;
  }
  const beats = ['ready', '2', '1'];
  let i = 0;
  el.hidden = false;
  const step = () => {
    if (i >= beats.length) {
      el.hidden = true;
      el.textContent = '';
      onDone();
      return;
    }
    el.textContent = beats[i];
    i += 1;
    window.setTimeout(step, 500);
  };
  step();
}

function beginLadder() {
  const landing = document.querySelector<HTMLElement>('#landing')!;
  const playArea = document.querySelector<HTMLElement>('#play-area')!;

  landing.hidden = true;
  playArea.hidden = false;

  runCountdown(() => startLadder());
}

function startLadder() {
  const boardContainer = document.querySelector<HTMLDivElement>('#puzzle-board')!;
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;
  const wallNudge = document.querySelector<HTMLParagraphElement>('#wall-nudge')!;
  const rail = document.querySelector<HTMLElement>('#progress-rail')!;

  revealRoot.innerHTML = '';
  quitBtn.hidden = false;
  wallNudge.hidden = true;
  rail.hidden = true;

  ladder = new Ladder(boardContainer);
  ladder.on((event) => {
    if (event.type === 'wall') {
      wallNudge.hidden = false;
    }
    if (event.type === 'quit' || event.type === 'finished') {
      onLadderEnd(event.result);
    }
  });
  quitBtn.addEventListener('click', () => ladder.quit(), { once: true });
  // the reader already saw the countdown once; replays go straight to watching
  ladder.start(600);
}

function onLadderEnd(result: LadderResult) {
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const wallNudge = document.querySelector<HTMLParagraphElement>('#wall-nudge')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;
  const scrollCue = document.querySelector<HTMLElement>('#scroll-cue')!;
  const rail = document.querySelector<HTMLElement>('#progress-rail')!;

  quitBtn.hidden = true;
  wallNudge.hidden = true;
  scrollCue.hidden = true;

  buildRevealSections(revealRoot, result);
  wireProgressRail(rail);
  rail.hidden = false;

  // A2: the reveal otherwise sits below the fold with no cue that the story
  // continues — scroll to it automatically rather than leaving a dead screen.
  const firstReveal = revealRoot.querySelector<HTMLElement>('.reveal-section');
  firstReveal?.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'start' });

  const replayBtn = document.querySelector<HTMLButtonElement>('#replay-btn');
  replayBtn?.addEventListener('click', () => {
    rail.hidden = true;
    document.querySelector<HTMLElement>('#landing')!.hidden = false;
    document.querySelector<HTMLElement>('#play-area')!.hidden = true;
    document.querySelector('#cold-open')?.scrollIntoView({ behavior: 'smooth' });
    const cue = document.querySelector<HTMLElement>('#scroll-cue')!;
    cue.hidden = false;
    cue.classList.remove('is-gone');
    wireScrollCueDismiss();
  });
}

function wireProgressRail(rail: HTMLElement) {
  const ticks = Array.from(rail.querySelectorAll<HTMLElement>('[data-rail-for]'));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        const tick = ticks.find((t) => t.dataset.railFor === id);
        if (!tick) continue;
        tick.classList.toggle('is-active', entry.isIntersecting);
        if (entry.isIntersecting) {
          // everything up to and including the active tick reads as "visited"
          const idx = ticks.indexOf(tick);
          ticks.forEach((t, i) => t.classList.toggle('is-passed', i < idx));
        }
      }
    },
    { threshold: 0.5 },
  );
  for (const id of REVEAL_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

wireScrollCueDismiss();
// NOT { once: true } — the landing screen reappears on every replay (see
// onLadderEnd's replay handler), so this listener has to fire every time
// Begin is clicked, not just the first. A one-shot listener here was the
// root cause of "play again doesn't reset": the button looked clickable but
// silently did nothing from the second run onward.
document.querySelector<HTMLButtonElement>('#begin-btn')!.addEventListener('click', beginLadder);
