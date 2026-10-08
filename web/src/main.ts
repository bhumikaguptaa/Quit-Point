import './style.css';
import { Ladder, type LadderResult } from './ladder';
import { buildRevealSections } from './sections';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <section id="cold-open">
    <p class="kicker">the quit point</p>
    <div id="puzzle-board" class="math-puzzle"></div>
    <button id="quit-btn" type="button">I give up</button>
  </section>
  <div id="reveal-root"></div>
`;

let ladder: Ladder;

function startLadder() {
  const boardContainer = document.querySelector<HTMLDivElement>('#puzzle-board')!;
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;

  revealRoot.innerHTML = '';
  quitBtn.hidden = false;

  ladder = new Ladder(boardContainer);
  ladder.on((event) => {
    if (event.type === 'quit' || event.type === 'finished') {
      onLadderEnd(event.result);
    }
  });
  quitBtn.addEventListener('click', () => ladder.quit(), { once: true });
  ladder.start();
}

function onLadderEnd(result: LadderResult) {
  const quitBtn = document.querySelector<HTMLButtonElement>('#quit-btn')!;
  const revealRoot = document.querySelector<HTMLDivElement>('#reveal-root')!;

  quitBtn.hidden = true;
  buildRevealSections(revealRoot, result);

  const replayBtn = document.querySelector<HTMLButtonElement>('#replay-btn');
  replayBtn?.addEventListener('click', () => {
    startLadder();
    document.querySelector('#cold-open')?.scrollIntoView({ behavior: 'smooth' });
  });
}

startLadder();
