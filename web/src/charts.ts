/**
 * Hand-built SVG/DOM charts. Bars follow dataviz skill conventions: thin
 * marks, rounded ends, legends for >=2 series, scroll-triggered grow-in
 * respecting prefers-reduced-motion. Color roles (you / model / context) are
 * assigned via CSS classes rather than inline fills — see style.css's
 * semantic palette section.
 */
import { STEAM, HARVARDX, DUOLINGO } from './data';
import { animateOnVisible } from './motion';

/**
 * Small multiples: one sequential bar chart per real dataset. C5: the reader's
 * own result is inserted into the Steam list as a "you"-colored row in the
 * same sorted order, so that section is about the reader, not just other
 * people — `readerCompletionPct` is the % of the ladder they got through
 * (0-100), matching units with the Steam median-completion metric.
 */
export function renderSmallMultiples(container: HTMLElement, readerCompletionPct: number) {
  container.innerHTML = `
    <div class="small-multiples">
      ${steamChart(readerCompletionPct)}
      ${harvardxChart()}
      ${duolingoChart()}
    </div>
  `;
  for (const svg of container.querySelectorAll('.chart-grow')) {
    animateOnVisible(svg, 'is-visible');
  }
}

function barRow(label: string, pct: number, maxPct: number, opts: { you?: boolean } = {}): string {
  const widthPct = Math.max(1, (pct / maxPct) * 100);
  return `
    <div class="bar-row${opts.you ? ' me' : ''}">
      <span class="bar-name" title="${label}">${label}</span>
      <div class="bar-track">
        <div class="bar-fill chart-grow" style="--target-width: ${widthPct}%"></div>
      </div>
      <span class="bar-val">${pct.toFixed(1)}%</span>
    </div>
  `;
}

function steamChart(readerCompletionPct: number): string {
  const rows: { name: string; pct: number; you?: boolean }[] = [
    ...STEAM.games.map((g) => ({ name: g.name, pct: g.medianPct })),
    { name: 'You, this session', pct: readerCompletionPct, you: true },
  ];
  rows.sort((a, b) => a.pct - b.pct);
  const max = Math.max(...rows.map((r) => r.pct));

  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>You finished more of this ladder than the median player finishes of their games &mdash; or less. Here's where you land.</h3>
        <p class="chart-source">${STEAM.source}</p>
      </figcaption>
      <div class="bars">
        ${rows.map((r) => barRow(r.name, r.pct, max, { you: r.you })).join('')}
      </div>
    </figure>
  `;
}

function harvardxChart(): string {
  const sorted = [...HARVARDX.courses].sort((a, b) => a.pctCertified - b.pctCertified);
  const max = Math.max(...sorted.map((c) => c.pctCertified));
  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>${HARVARDX.pctCertifiedOfRegistered}% of ${HARVARDX.registered.toLocaleString()} HarvardX students finished with a certificate.</h3>
        <p class="chart-source">${HARVARDX.source} &mdash; ${HARVARDX.certified.toLocaleString()} certified overall</p>
      </figcaption>
      <div class="bars">
        ${sorted.map((c) => barRow(c.name, c.pctCertified, max)).join('')}
      </div>
    </figure>
  `;
}

function duolingoChart(): string {
  const max = 100;
  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>${DUOLINGO.pctSingleDayOnly}% of Duolingo learners never come back after day one.</h3>
        <p class="chart-source">${DUOLINGO.source} &mdash; n=${DUOLINGO.nUsers.toLocaleString()}</p>
      </figcaption>
      <div class="bars">
        ${DUOLINGO.retentionByDay.map((d) => barRow(`day ${d.day}`, d.pct, max)).join('')}
      </div>
    </figure>
  `;
}
