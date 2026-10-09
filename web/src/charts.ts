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
 * Optimal-stopping explainer chart: the quitting threshold (y) as a function
 * of failures observed on the current level (x), computed for the reader's
 * OWN success count — not a fixed w=0 — since the model's threshold depends
 * heavily on how many successes preceded the failures (e.g. with 2 successes
 * and 1 failure the threshold is 12 remaining levels; with 0 successes and 1
 * failure it's 1). The reader's own (failures, levels-remaining-at-quit)
 * point is plotted on the same axes: above the line means they had MORE
 * remaining levels than the model required to justify quitting (they could
 * have kept going), on/below the line means their quit was at or past the
 * model's threshold.
 */
export function renderStoppingCurve(
  container: HTMLElement,
  readerPoint: { successes: number; failures: number; remaining: number } | null,
) {
  const width = 640;
  const height = 380;
  const padding = { top: 48, right: 24, bottom: 48, left: 56 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxFailures = 8;
  // threshold values span orders of magnitude (1 to 39+) and crash from
  // "effectively infinite" to single digits almost immediately, so a linear
  // y-axis crushes nearly the whole curve into a few pixels at the bottom.
  // Log2 scale keeps the real shape readable: ticks land on 1, 2, 4, 8, 16, 32+.
  const yCap = 32;
  const yFloor = 1;
  const readerSuccesses = readerPoint?.successes ?? 0;

  const points: { failures: number; threshold: number | null }[] = [];
  for (let f = 0; f <= maxFailures; f++) {
    points.push({ failures: f, threshold: quittingThreshold(readerSuccesses, f, 100) });
  }

  const xScale = (f: number) => padding.left + (f / maxFailures) * plotW;
  const logFloor = Math.log2(yFloor);
  const logCap = Math.log2(yCap);
  const yScale = (t: number) => {
    const clamped = Math.min(Math.max(t, yFloor), yCap);
    const logT = Math.log2(clamped);
    return padding.top + plotH - ((logT - logFloor) / (logCap - logFloor)) * plotH;
  };

  // build the line only across the defined (non-null) stretch; null points
  // (threshold undefined, i.e. "always persist") are drawn as a flat
  // off-the-top dashed run so the gap is honest rather than interpolated
  const definedPoints = points.filter((p): p is { failures: number; threshold: number } => p.threshold !== null);
  const pathD = definedPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.failures)} ${yScale(p.threshold)}`)
    .join(' ');

  // At f=0 the threshold is infinite (never optimal to quit), so the curve
  // genuinely has no finite value there. Rather than leave two disconnected
  // floating segments, draw the off-the-top run as a dashed line and join it
  // to the first finite point with a dashed vertical drop — the break is
  // still visible (dashes = clipped/not-a-real-value) but the curve reads as
  // one continuous fall off a cliff.
  const firstDefinedIdx = points.findIndex((p) => p.threshold !== null);
  let undefinedRunD = '';
  if (firstDefinedIdx > 0) {
    const yTop = yScale(yCap);
    const first = points[firstDefinedIdx] as { failures: number; threshold: number };
    const dropX = xScale(first.failures);
    undefinedRunD = [
      `M ${xScale(0)} ${yTop}`,
      `L ${dropX} ${yTop}`,
      `L ${dropX} ${yScale(first.threshold)}`,
    ].join(' ');
  }

  // y-axis ticks: powers of 2, matching the log scale
  const yTicks = [1, 2, 4, 8, 16, 32].filter((t) => t <= yCap);
  const yTickEls = yTicks
    .map((t) => {
      const y = yScale(t);
      const label = t === yCap ? `${yCap}+` : String(t);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${padding.left + plotW}" y2="${y}" class="chart-gridline" />
        <text x="${padding.left - 10}" y="${y + 4}" class="axis-tick" text-anchor="end">${label}</text>
      `;
    })
    .join('');

  const xTickEls = points
    .map((p) => {
      const x = xScale(p.failures);
      return `<text x="${x}" y="${padding.top + plotH + 20}" class="axis-tick" text-anchor="middle">${p.failures}</text>`;
    })
    .join('');

  let readerMarker = '';
  if (readerPoint) {
    const clampedFailures = Math.min(readerPoint.failures, maxFailures);
    const clampedRemaining = Math.min(readerPoint.remaining, yCap);
    const cx = xScale(clampedFailures);
    const cy = yScale(clampedRemaining);
    const labelAbove = cy - padding.top > 28;
    const labelY = labelAbove ? cy - 14 : cy + 24;
    // anchor the label to the right of the dot so it never straddles the
    // dashed vertical drop that sits at the first finite threshold
    const labelX = Math.min(cx + 14, padding.left + plotW - 96);
    // three staged pieces: the drop guide, then the dot, then the label.
    // CSS staggers them after the threshold line finishes drawing.
    readerMarker = `
      <line class="reader-drop" x1="${cx}" y1="${padding.top + plotH}" x2="${cx}" y2="${cy}" />
      <circle cx="${cx}" cy="${cy}" r="7" class="reader-point-ring" />
      <circle cx="${cx}" cy="${cy}" r="7" class="reader-point" />
      <text x="${labelX}" y="${labelY}" class="reader-point-label" text-anchor="start">you stopped here</text>
    `;
  }

  container.innerHTML = `
    <svg class="stopping-chart chart-grow" viewBox="0 0 ${width} ${height}" role="img"
         aria-label="Optimal quitting threshold as failures accumulate on the current task, for your observed success count">
      ${yTickEls}
      <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${padding.left + plotW}" y2="${padding.top + plotH}" class="axis-line" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotH}" class="axis-line" />
      ${undefinedRunD ? `<path d="${undefinedRunD}" class="stopping-line stopping-line-undefined" fill="none" />` : ''}
      <path d="${pathD}" class="stopping-line" fill="none" />
      ${readerMarker}
      ${xTickEls}
      <text x="${padding.left + plotW / 2}" y="${height - 10}" class="axis-caption" text-anchor="middle">sequences missed at this length</text>
      <text x="${padding.left}" y="20" class="axis-caption" text-anchor="start">levels remaining needed to justify quitting</text>
    </svg>
  `;
  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
