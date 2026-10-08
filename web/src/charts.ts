/**
 * Hand-built SVG charts. Follows dataviz skill conventions: thin marks, 4px
 * rounded bar ends, sequential single-hue for magnitude, direct labels
 * (sparingly), legends for >=2 series, hairline recessive gridlines, a 2px
 * surface gap between adjacent bars, scroll-triggered grow-in respecting
 * prefers-reduced-motion.
 */
import { STEAM, HARVARDX, DUOLINGO } from './data';
import { quittingThreshold } from './stopping';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateOnVisible(el: Element, className: string) {
  if (REDUCE_MOTION) {
    el.classList.add(className);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.classList.add(className);
          observer.disconnect();
        }
      }
    },
    { threshold: 0.3 },
  );
  observer.observe(el);
}

/** Small multiples: one sequential-hue bar chart per real dataset, same scale (0-100%). */
export function renderSmallMultiples(container: HTMLElement) {
  container.innerHTML = `
    <div class="small-multiples">
      ${steamChart()}
      ${harvardxChart()}
      ${duolingoChart()}
    </div>
  `;
  for (const svg of container.querySelectorAll('.chart-grow')) {
    animateOnVisible(svg, 'is-visible');
  }
}

function barRow(label: string, pct: number, maxPct: number, sublabel?: string): string {
  const widthPct = Math.max(1, (pct / maxPct) * 100);
  return `
    <div class="bar-row">
      <span class="bar-label" title="${label}">${label}</span>
      <div class="bar-track">
        <div class="bar-fill chart-grow" style="--target-width: ${widthPct}%"></div>
      </div>
      <span class="bar-value">${pct.toFixed(1)}%${sublabel ? ` <span class="bar-sublabel">${sublabel}</span>` : ''}</span>
    </div>
  `;
}

function steamChart(): string {
  const sorted = [...STEAM.games].sort((a, b) => a.medianPct - b.medianPct);
  const max = Math.max(...sorted.map((g) => g.medianPct));
  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>Median % of players who unlock each achievement</h3>
        <p class="chart-source">${STEAM.source}</p>
      </figcaption>
      ${sorted.map((g) => barRow(g.name, g.medianPct, max)).join('')}
    </figure>
  `;
}

function harvardxChart(): string {
  const sorted = [...HARVARDX.courses].sort((a, b) => a.pctCertified - b.pctCertified);
  const max = Math.max(...sorted.map((c) => c.pctCertified));
  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>% of registered students who earned a certificate</h3>
        <p class="chart-source">${HARVARDX.source} — ${HARVARDX.registered.toLocaleString()} registered, ${HARVARDX.certified.toLocaleString()} certified overall</p>
      </figcaption>
      ${sorted.map((c) => barRow(c.name, c.pctCertified, max)).join('')}
    </figure>
  `;
}

function duolingoChart(): string {
  const max = 100;
  return `
    <figure class="small-multiple">
      <figcaption>
        <h3>% of learners still active, by day since signup</h3>
        <p class="chart-source">${DUOLINGO.source} — n=${DUOLINGO.nUsers.toLocaleString()}</p>
      </figcaption>
      ${DUOLINGO.retentionByDay
        .map((d) => barRow(`day ${d.day}`, d.pct, max))
        .join('')}
    </figure>
  `;
}

/**
 * Optimal-stopping explainer chart: a line over "remaining pulls" showing
 * the quitting threshold curve, with the reader's own quit point overlaid
 * as a marker. successes/failures are the reader's final-level record.
 */
export function renderStoppingCurve(
  container: HTMLElement,
  readerPoint: { successes: number; failures: number; remaining: number } | null,
) {
  const width = 640;
  const height = 320;
  const padding = { top: 24, right: 24, bottom: 40, left: 48 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxFailures = 9;
  const points: { failures: number; threshold: number }[] = [];
  for (let f = 0; f <= maxFailures; f++) {
    const t = quittingThreshold(0, f, 100);
    points.push({ failures: f, threshold: t ?? 100 });
  }

  const xScale = (f: number) => padding.left + (f / maxFailures) * plotW;
  const yScale = (t: number) => padding.top + plotH - (Math.min(t, 100) / 100) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.failures)} ${yScale(p.threshold)}`)
    .join(' ');

  let readerMarker = '';
  if (readerPoint) {
    const cx = xScale(Math.min(readerPoint.failures, maxFailures));
    const cy = yScale(Math.min(readerPoint.remaining, 100));
    // keep the label inside the plot area regardless of where the point falls
    const labelAbove = cy - padding.top > 24;
    const labelY = labelAbove ? cy - 14 : cy + 22;
    const labelX = Math.min(Math.max(cx, padding.left + 48), padding.left + plotW - 48);
    readerMarker = `
      <circle cx="${cx}" cy="${cy}" r="7" class="reader-point" />
      <circle cx="${cx}" cy="${cy}" r="7" class="reader-point-ring" />
      <text x="${labelX}" y="${labelY}" class="reader-point-label" text-anchor="middle">you quit here</text>
    `;
  }

  container.innerHTML = `
    <svg class="stopping-chart chart-grow" viewBox="0 0 ${width} ${height}" role="img"
         aria-label="Optimal quitting threshold as failures accumulate on the current task">
      <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${padding.left + plotW}" y2="${padding.top + plotH}" class="axis-line" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotH}" class="axis-line" />
      <path d="${pathD}" class="stopping-line" fill="none" />
      ${readerMarker}
      <text x="${padding.left + plotW / 2}" y="${height - 6}" class="axis-caption" text-anchor="middle">failures observed on current level</text>
      <text x="16" y="${padding.top - 8}" class="axis-caption" text-anchor="start">levels needed to justify quitting</text>
    </svg>
  `;
  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
