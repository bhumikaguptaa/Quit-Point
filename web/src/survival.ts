/**
 * §5b (partial — see PROJECT.md): a real survival curve for the one dataset
 * where we actually have ordered progression data (Duolingo, day-by-day
 * retention). Steam and HarvardX are endpoint percentages per game/course,
 * not a progression, so plotting them as curves would mean inventing
 * intermediate points — the brief itself warns against exactly this kind of
 * fabrication, so they stay as the existing sorted bar lists in charts.ts.
 *
 * The reader's own drop-off is marked on the same axes: their % of the
 * ladder completed, placed at the closest matching day on the curve purely
 * as a visual anchor (not a claim that ladder levels equal Duolingo days).
 */
import { DUOLINGO } from './data';
import { animateOnVisible } from './motion';

export function renderSurvivalCurve(container: HTMLElement, readerCompletionPct: number) {
  const width = 700;
  const height = 320;
  const margin = { left: 46, right: 24, top: 18, bottom: 40 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const data = DUOLINGO.retentionByDay;
  const maxDay = data[data.length - 1].day;

  const x = (day: number) => margin.left + (day / maxDay) * plotW;
  const y = (pct: number) => margin.top + (1 - pct / 100) * plotH;

  // place the reader's marker at the day whose retention is closest to
  // their own completion %, so it reads as "about this far along the curve"
  let closestDay = 0;
  let closestDiff = Infinity;
  for (const d of data) {
    const diff = Math.abs(d.pct - readerCompletionPct);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestDay = d.day;
    }
  }
  const readerX = x(closestDay);
  const readerY = y(readerCompletionPct);

  const gridLines = [0, 25, 50, 75, 100]
    .map(
      (v) => `
        <line x1="${margin.left}" x2="${margin.left + plotW}" y1="${y(v)}" y2="${y(v)}" class="axis-gridline" />
        <text x="${margin.left - 9}" y="${y(v) + 4}" class="axis-t" text-anchor="end">${v}%</text>
      `,
    )
    .join('');

  const dayTicks = [0, 3, 6, 9, maxDay]
    .map((d) => `<text x="${x(d)}" y="${height - 16}" class="axis-t" text-anchor="middle">day ${d}</text>`)
    .join('');

  const linePoints = data.map((d) => `${x(d.day)},${y(d.pct)}`).join(' ');
  const areaPoints = `${linePoints} ${x(maxDay)},${y(0)} ${x(0)},${y(0)}`;

  const dots = data.map((d) => `<circle cx="${x(d.day)}" cy="${y(d.pct)}" r="3" class="survival-dot" />`).join('');

  container.innerHTML = `
    <svg class="survival-chart chart-grow" viewBox="0 0 ${width} ${height}" role="img"
         aria-label="Share of Duolingo learners still active by day, with your own drop-off point marked">
      ${gridLines}
      <line x1="${readerX}" x2="${readerX}" y1="${margin.top}" y2="${margin.top + plotH}" class="survival-reader-line" />
      <polygon points="${areaPoints}" class="survival-area" />
      <polyline points="${linePoints}" class="survival-line" fill="none" />
      ${dots}
      ${dayTicks}
      <circle cx="${readerX}" cy="${readerY}" r="6.5" class="survival-reader-dot" />
      <text x="${Math.min(readerX + 11, width - margin.right - 90)}" y="${readerY - 9}" class="survival-end-label you">you stopped here</text>
      <text x="${x(maxDay) - 6}" y="${y(data[data.length - 1].pct) - 10}" class="survival-end-label model" text-anchor="end">Duolingo</text>
    </svg>
    <p class="chart-source">${DUOLINGO.source} &mdash; n=${DUOLINGO.nUsers.toLocaleString()}. Your position is
      placed at the closest matching retention %, not a literal day-for-level comparison.</p>
  `;

  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
