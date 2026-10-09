/**
 * §5d: "one more try" interactive. The brief's original framing was a slider
 * showing the expected payoff of NAIVELY persisting exactly N more times —
 * but that's a different, non-optimal policy with no basis in the cited
 * Sukhov model (only the optimal expected-value function V(w,f,T) exists
 * there). Rather than invent an uncited model, this shows the real thing:
 * as the reader drags "how much runway would you give yourself," the chart
 * plots the model's actual optimal expected value at their own observed
 * (successes, failures), and marks where the quit threshold falls on that
 * same axis. Confirmed with the user this is the honest substitution.
 */
import { expectedValue, quittingThreshold } from './stopping';
import { animateOnVisible } from './motion';

const MAX_T = 20;

export function renderOneMoreTrySlider(
  container: HTMLElement,
  successes: number,
  failures: number,
) {
  const threshold = quittingThreshold(successes, failures, 100);
  const width = 640;
  const height = 260;
  const margin = { left: 46, right: 20, top: 28, bottom: 36 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const values = Array.from({ length: MAX_T + 1 }, (_, T) => expectedValue(successes, failures, T));
  const maxV = Math.max(...values, 0.001);

  const x = (T: number) => margin.left + (T / MAX_T) * plotW;
  const y = (v: number) => margin.top + (1 - v / maxV) * plotH;

  const linePoints = values.map((v, T) => `${x(T)},${y(v)}`).join(' ');

  container.innerHTML = `
    <div class="try-slider chart-grow">
      <svg class="try-chart" viewBox="0 0 ${width} ${height}" role="img"
           aria-label="Expected value of optimal play as remaining attempts increase">
        <line x1="${margin.left}" x2="${margin.left + plotW}" y1="${margin.top + plotH}" y2="${margin.top + plotH}" class="axis-line" />
        ${
          threshold !== null && threshold <= MAX_T
            ? (() => {
                const lineX = x(threshold);
                // keep the label inside the plot area regardless of how close
                // the threshold sits to either edge
                const labelAnchor = lineX < margin.left + 90 ? 'start' : lineX > width - margin.right - 90 ? 'end' : 'middle';
                const labelX = Math.min(Math.max(lineX, margin.left + 4), width - margin.right - 4);
                return `<line x1="${lineX}" x2="${lineX}" y1="${margin.top}" y2="${margin.top + plotH}" class="try-threshold-line" />
               <text x="${labelX}" y="${margin.top - 4}" class="try-threshold-label" text-anchor="${labelAnchor}">model abandons here</text>`;
              })()
            : ''
        }
        <polyline points="${linePoints}" class="try-line" fill="none" />
        <circle id="try-dot" cx="${x(0)}" cy="${y(values[0])}" r="6" class="try-dot" />
      </svg>
      <div class="try-controls">
        <label for="try-range">how much runway would you give yourself?</label>
        <input type="range" id="try-range" min="0" max="${MAX_T}" step="1" value="0" />
        <p class="try-readout">
          <span id="try-readout-t">0</span> more attempts &mdash; expected value
          <strong id="try-readout-v">${values[0].toFixed(2)}</strong>
        </p>
      </div>
    </div>
  `;

  const range = container.querySelector<HTMLInputElement>('#try-range')!;
  const dot = container.querySelector<SVGCircleElement>('#try-dot')!;
  const readoutT = container.querySelector<HTMLElement>('#try-readout-t')!;
  const readoutV = container.querySelector<HTMLElement>('#try-readout-v')!;

  range.addEventListener('input', () => {
    const T = Number(range.value);
    dot.setAttribute('cx', String(x(T)));
    dot.setAttribute('cy', String(y(values[T])));
    readoutT.textContent = String(T);
    readoutV.textContent = values[T].toFixed(2);
  });

  animateOnVisible(container.querySelector('.chart-grow')!, 'is-visible');
}
