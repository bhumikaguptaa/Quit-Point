/**
 * §5a: "your session, replayed" — one small 3x3 grid per level attempted, the
 * real sequence drawn through it. Cleared levels in model-purple, the level
 * the reader stopped on in you-orange, levels never reached as dashed
 * outlines. Adapted from the reference kit's session-replay SVG pattern.
 *
 * Uses the LAST attempt recorded per level (if a level took retries, the
 * final sequence shown is the one that's representative of "what they saw
 * right before moving on or quitting").
 */
import { GRID_SIZE, TILE_COUNT, TOTAL_LEVELS } from './puzzles';
import type { AttemptRecord } from './ladder';
import { animateOnVisible } from './motion';

const SVG_NS = 'http://www.w3.org/2000/svg';
const S = 72;
const PAD = 11;
const GAP = (S - PAD * 2) / (GRID_SIZE - 1);

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

type LevelState = 'cleared' | 'stopped' | 'never';

export function renderSessionReplay(
  container: HTMLElement,
  attempts: AttemptRecord[],
  stopLevel: number, // 1-indexed level the reader stopped on; 0 if finished
  finished: boolean,
) {
  const lastLevel = finished ? TOTAL_LEVELS : stopLevel;
  const levels: { n: number; sequence: number[] | null; state: LevelState }[] = [];

  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    if (n > lastLevel && !finished) {
      levels.push({ n, sequence: null, state: 'never' });
      continue;
    }
    const levelAttempts = attempts.filter((a) => a.level === n);
    const last = levelAttempts[levelAttempts.length - 1];
    const sequence = last?.sequence ?? null;
    const cleared = n < lastLevel || finished;
    levels.push({ n, sequence, state: cleared ? 'cleared' : 'stopped' });
  }

  container.innerHTML = '';
  const strip = document.createElement('div');
  strip.className = 'replay-strip chart-grow';
  container.appendChild(strip);

  for (const level of levels) {
    const box = document.createElement('div');
    box.className = `replay-lvl${level.state === 'stopped' ? ' is-stop' : ''}`;

    const svg = el('svg', {
      viewBox: `0 0 ${S} ${S}`,
      width: S,
      height: S,
      role: 'img',
      'aria-label': `level ${level.n}${level.state === 'never' ? ', not reached' : ''}`,
    });

    const colorVar =
      level.state === 'cleared' ? '--mark-model' : level.state === 'stopped' ? '--mark-you' : '--mark-neutral';
    const color = `var(${colorVar})`;

    if (level.sequence) {
      const pts = level.sequence.map((idx) => [
        PAD + (idx % GRID_SIZE) * GAP,
        PAD + Math.floor(idx / GRID_SIZE) * GAP,
      ]);
      svg.appendChild(
        el('polyline', {
          points: pts.map((p) => p.join(',')).join(' '),
          fill: 'none',
          stroke: color,
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          opacity: '0.55',
        }),
      );
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = r * GRID_SIZE + c;
        const onPath = level.sequence?.includes(idx) ?? false;
        if (level.sequence) {
          svg.appendChild(
            el('circle', {
              cx: PAD + c * GAP,
              cy: PAD + r * GAP,
              r: onPath ? 6 : 3.2,
              fill: onPath ? color : 'var(--mark-neutral)',
              opacity: onPath ? '1' : '0.4',
            }),
          );
        } else {
          svg.appendChild(
            el('circle', {
              cx: PAD + c * GAP,
              cy: PAD + r * GAP,
              r: 3.2,
              fill: 'none',
              stroke: color,
              'stroke-width': '1.4',
              'stroke-dasharray': '2 2',
              opacity: '0.55',
            }),
          );
        }
      }
    }

    box.appendChild(svg);
    const cap = document.createElement('div');
    cap.className = 'replay-cap';
    cap.textContent = level.state === 'never' ? `lvl ${level.n}` : `lvl ${level.n} · ${level.sequence?.length ?? TILE_COUNT}`;
    box.appendChild(cap);
    strip.appendChild(box);
  }

  animateOnVisible(strip, 'is-visible');
}
