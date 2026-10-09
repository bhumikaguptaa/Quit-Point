import './style.css';
import { Ladder, type LadderResult } from './ladder';
import { buildRevealSections } from './sections';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <section id="cold-open">
    <header class="cold-open-head">
      <h1 class="site-title">The Quit Point</h1>
      <p class="site-tagline">Watch the sequence. Tap it back. It gets longer.</p>
    </header>
    <div id="puzzle-board"></div>
    <div class="cold-open-foot">
      <button id="quit-btn" type="button">I give up</button>
      <p class="wall-nudge" id="wall-nudge" hidden>Three misses at this length. Keep going, or stop.</p>
    </div>
  </section>
  <div id="reveal-root"></div>
`;

let ladder: Ladder;

function startLadder() {
  const boardContainer = document.querySelector<HTMLDivElement>('#puzzle-board')!;
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;
  const wallNudge = document.querySelector<HTMLParagraphElement>('#wall-nudge')!;

  revealRoot.innerHTML = '';
  quitBtn.hidden = false;
  wallNudge.hidden = true;

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
  ladder.start();
}

function onLadderEnd(result: LadderResult) {
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const wallNudge = document.querySelector<HTMLParagraphElement>('#wall-nudge')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;

  quitBtn.hidden = true;
  wallNudge.hidden = true;
  buildRevealSections(revealRoot, result);

  const replayBtn = document.querySelector<HTMLButtonElement>('#replay-btn');
  replayBtn?.addEventListener('click', () => {
    startLadder();
    document.querySelector('#cold-open')?.scrollIntoView({ behavior: 'smooth' });
  });
}

startLadder();
