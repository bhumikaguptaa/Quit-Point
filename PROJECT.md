# The Quit Point

An interactive data essay about quitting. The reader plays a mental-math
puzzle ladder that gets harder every level (procedurally generated — see Decisions below for
why this replaced the original chess-puzzle mechanic). A quit button is visible from the
start. Whenever they quit, the page reveals how close they were, compares their quit point to
the mathematically **optimal stopping point** (not to other readers — see Decisions below),
then zooms out to show the same quitting pattern across games, online courses, and language
apps using real public datasets.

Inspiration: [Pudding.cool](https://pudding.cool) — playful, data-dense, visually bold
long-form essays built on real datasets, not muted academic styling.

This file is the persistent source of truth for scope, decisions, and progress. Read it first
if resuming after an interruption — don't re-derive state from scratch.

---

## Key decisions (deviations from the original brief)

- **Ladder length: 8–10 levels, not 15.** Shorter ladder, same arc.
- **No peer/crowd ranking.** The brief originally planned a live backend logging every
  reader's session so later readers could be compared against accumulated crowd stats
  (quit-level histograms, near-miss rates, framing-variant splits). Dropped because this
  project won't get enough traffic for that to ever feel real — small-n "crowd" stats would
  look either empty or fake. Instead, the reader's quit point is compared only against:
  - the mathematically optimal stopping point (Sukhov et al. model), and
  - the real external datasets (Steam/PSN completion, HarvardX certification, Duolingo
    retention) via the small-multiples section.
  - **Consequence:** no backend/datastore is required at all. This is now a fully static
    site (HTML/TS/CSS, buildable with Vite, deployable to any static host — Vercel/Netlify/
    GitHub Pages). The "Technical architecture → Backend" section of the original brief
    (Supabase/Firebase session logging, framing_variant A/B, aggregate read endpoint) is
    **cut**. The framing A/B moment (act 7) is also cut since it depended on aggregating
    across sessions to show anything meaningful.
  - **Also cut, same reason:** the round-number quit-spike section (act 4 — "do people quit
    disproportionately at levels 5/10/15?"). That also needed a crowd histogram of quit
    levels across many readers, which no longer exists once the backend is gone. Rather than
    fabricate the stat, it's dropped. Confirmed with the user 2026-10-08.
- **Core mechanic swapped: chess puzzles → mental math puzzles (2026-10-08).** The user asked
  to replace the chess ladder with "small mental math puzzles that get increasingly
  difficult." Reasons weren't stated explicitly, but this removes the Lichess dataset
  dependency, the `chess.js` library, and all board-rendering code — a meaningfully simpler
  mechanic to build and maintain.
  - **New mechanic:** `web/src/puzzles.ts` now procedurally generates 10 levels, rotating
    through three puzzle families (arithmetic chains, number sequences, estimation), seeded
    deterministically per level (not fetched from an external dataset — there's no public
    "real puzzle" database for mental-math difficulty the way Lichess exists for chess).
  - **Near-miss redefined:** chess's "same destination square, wrong piece" doesn't carry
    over to a numeric answer. Near-miss is now "submitted answer within a small margin of
    the correct one" (`nearMissMargin` per puzzle, generally ~3-8% of the answer's magnitude,
    confirmed with the user as the simpler of two options discussed).
  - **Real bugs caught and fixed while building the generator** (see Phase 2 notes below):
    an order-of-operations mismatch between the displayed expression and the computed
    answer, and arithmetic operand ranges that produced puzzles too large to solve mentally
    (a multi-thousand multiplication at level 4, a 5-digit × 5-digit "rounded" question at
    level 10). Both fixed before shipping — verified by evaluating every displayed expression
    independently and comparing it to the generator's own answer.
  - **chess.js removed** from `package.json` — no longer a dependency. Bundle size dropped
    from ~54KB to ~17KB JS as a result.

---

## Phases

### Phase 1 — Data layer (data-analysis/) — ✅ DONE
Real public datasets, fetched/analyzed, with outputs saved as JSON for the frontend to cite.

**Note:** the Lichess puzzle work below (`select_puzzles.py` → the old `web/src/puzzles.ts`)
is now superseded by the chess→math pivot (see Decisions above) — `puzzles.ts` is a
procedural math-puzzle generator now, not Lichess data. Left here for history; the Sukhov
model and all other Phase 1 outputs are unaffected and still in active use.

- [x] Sukhov et al. (2025) optimal-stopping reproduction — `notebooks/analyze_sukhov.py`,
      `load_sukhov.py`. Reproduces paper's exclusion criteria (N=3390) from raw data.
- [x] Optimal stopping threshold model — `notebooks/optimal_strategy.py`. Core function the
      site will call (via `reader_comparison.py`) to classify a reader's quit as early/on-time.
- [x] `notebooks/reader_comparison.py` — bridges Sukhov model to the site's puzzle-ladder
      framing (arm→level, press→move attempt). `classify_quit(successes, failures, remaining)`.
- [x] HarvardX/MITx funnel — `notebooks/analyze_harvardx.py` → `output/harvardx_funnel.json`.
      Real numbers: combined across 5 courses, 338,223 registered → 1.94% certified.
      CS50x alone: 169,621 registered → 0.76% certified.
- [x] Duolingo retention — `notebooks/analyze_duolingo.py` → `output/duolingo_retention.json`.
      115,222 users; 56.7% are single-day-only; day-1 retention 43.3%, day-7 15.1%.
- [x] Steam achievement rarity — `notebooks/fetch_steam.py` → `output/steam_achievements.json`.
      Starfield: median achievement completion 14.2%, rarest 0.1%.
- [x] Puzzle ladder source data — `notebooks/select_puzzles.py` → `web/src/puzzles.ts`.
      10 real, difficulty-ranked Lichess puzzles (CC0 DB), ratings 800→2450, real FENs,
      verified solution lines. **Fix applied 2026-10-08:** the script's
      `subprocess.Popen(text=True)` piped into `io.TextIOWrapper` double-decoded and crashed;
      removed `text=True` since Popen already gave bytes. Re-ran successfully.

Note: `select_puzzles.py` currently picks 10 target ratings — needs trimming to match
whatever final ladder length (8–10) is chosen in Phase 2, and `setupMove`/`solution` format
should be double-checked against what `main.ts`'s board logic expects once that's built.

### Phase 2 — Site skeleton & puzzle engine — ✅ DONE
Scaffold removed. Originally built around a chess engine (`chess.js` + a hand-built board),
then rebuilt around procedural math puzzles after the 2026-10-08 pivot (see Decisions above).
The chess-era implementation notes are kept in git history / earlier PROJECT.md revisions if
ever needed; this section describes the current (math) implementation only.

- [x] `src/puzzles.ts` — procedural generator, `PUZZLES: Puzzle[]` (10 levels), rotating
      through `arithmetic` / `sequence` / `estimation` kinds, seeded deterministically per
      level via a small mulberry32 PRNG (stable across a session, not persisted anywhere).
      Each `Puzzle` carries `prompt`, `answer`, and `nearMissMargin`.
  - **Two real bugs found and fixed while verifying the generator** (by evaluating every
    displayed expression independently in Node and comparing it to the generator's own
    computed answer across all 10 levels — static review alone had missed both):
    1. Arithmetic expressions were displayed without parentheses (e.g. `"10 + 5 × 2"`) while
       the generator evaluated strictly left-to-right (`(10+5)×2=30`), but real operator
       precedence reads that same string as `20`. Fixed by always parenthesizing prior
       sub-results (`"(10 + 5) × 2"`), making the intended evaluation order unambiguous.
    2. Operand ranges initially let multiplication/percentage/rounding operands grow
       unbounded with level, producing puzzles no one could realistically solve mentally
       (a `5 × 12 × 33` chain, a `155 × 165` rounding question, `70% of 33522`). Reworked so
       ×/÷ operands stay small (2-12) regardless of level — difficulty scales through +/-
       operand size and operation *count*, not raw operand magnitude — and estimation puzzles
       always use "round" bases (multiples of 10/100) so the real mental shortcut (round,
       then multiply/take a percentage) stays available at every level.
- [x] `src/mathinput.ts` — `MathInput` class: renders one puzzle's prompt + a number input +
      submit button, flashes success/error state (including input border color + auto-select
      on wrong answer, so a reader can immediately retype), replaces the old chess `board.ts`.
- [x] `src/stopping.ts` — direct TS port of `optimal_strategy.py` + `reader_comparison.py`
      (`classifyQuit`), untouched by the chess→math pivot (model is puzzle-type-agnostic).
      **Verified numerically identical to the Python reference** across multiple
      (successes, failures) pairs via a side-by-side node/python run.
- [x] `src/ladder.ts` — `Ladder` class: owns the current `MathInput`, advances levels on a
      correct answer, tracks attempts (`correct`/`nearMiss`), emits events (`levelStart`,
      `correct`, `incorrect`, `quit`, `finished`). Produces a `LadderResult` with `quitLevel`,
      `levelsRemaining`, `attempts`, `lastAttemptWasNearMiss`, `timeToQuitSeconds` — unchanged
      shape from the chess-era version, so `sections.ts` needed only copy changes, not
      restructuring.
  - **Near-miss definition:** submitted answer within `puzzle.nearMissMargin` (roughly 3-8%
    of the answer's magnitude, puzzle-kind-dependent) of the correct value. Chosen over a
    stricter "off by exactly one plausible mistaken step" alternative — confirmed with the
    user as the simpler option.
- [x] `main.ts` updated: `#puzzle-board` div now hosts `.math-puzzle` (the math input card)
      instead of the chess board; otherwise unchanged (same quit/replay wiring).
- [x] `chess.js` removed from `package.json` — bundle size dropped from ~54KB to ~17KB JS.
- [x] `npx tsc --noEmit` and `npm run build` both pass clean.
- [x] **Verified live in a real browser** (Playwright + locally-installed Chromium, same
      method as Phase 4 below): puzzle prompt renders, wrong answer shows error state and
      does NOT advance the level, correct answer advances to the next level with the next
      puzzle kind in rotation (arithmetic → sequence confirmed), quit triggers the reveal
      flow correctly with the right `quitLevel`.
- [ ] Drag-and-drop was a chess-era requirement (board piece dragging) — not applicable to a
      number-input mechanic, so this is now moot rather than outstanding.
- [ ] Ladder length: still 10 levels (within the original 8–10 target).

### Phase 3 — Scroll sections / acts — ✅ DONE
Final section list (7 sections after cutting the framing A/B and the round-number spike
analysis — see Decisions above for why both were dropped):

1. Cold open — puzzle, playable immediately. (`#cold-open` in `main.ts`)
2. Instant reveal on quit — quit level, levels remaining, time on ladder. (`reveal-instant`)
3. Near-miss analysis — was the reader's last submitted answer within the near-miss margin of
   the correct one? (`reveal-near-miss`)
4. Optimal-stopping explainer — Sukhov et al. curve rendered as an SVG line chart, reader's
   own (failures, levels-remaining) point overlaid as a marker. (`reveal-stopping`)
5. Over-persistence counterweight — MTurk boring-task citation (~50% persisted for zero
   reward). (`reveal-over-persistence`)
6. Zoom out — small-multiples grid, one sequential-hue bar chart per real dataset: Steam
   achievement completion, HarvardX/MITx certification rate, Duolingo day-by-day retention.
   (`reveal-zoom-out`)
7. Closing argument coda + replay (board returns via a "play again" button that restarts the
   `Ladder`). (`reveal-coda`, `reveal-replay`)

All built in `web/src/sections.ts` (content/markup), `web/src/charts.ts` (the SVG stopping
curve + small-multiples bars), and `web/src/data.ts` (the real cited figures, copied in from
`data-analysis/output/*.json` — see note below on keeping these in sync).

### Phase 4 — Visual design & motion — ✅ DONE
- [x] Color tokens as CSS custom properties in `style.css`, redefined under both
      `prefers-color-scheme: dark` (guarded by `:not([data-theme='light'])`) and
      `[data-theme='dark']`, per the artifact-design dark-mode contract.
- [x] Typography: **Fraunces** (display/headlines), **Figtree** (body), **JetBrains Mono**
      (stats/data labels) — loaded via Google Fonts `<link>` in `index.html`. No default
      Inter/system stack.
- [x] Bright, confident palette: a punchy red (`--accent`) for the quit/replay CTA, single-hue
      blue for all magnitude charts (sequential encoding per the dataviz skill — never a
      rainbow), validated against the dataviz skill's CVD/contrast checks (see below).
- [x] Motion: count-up numbers (`sections.ts` `countUp`, eased, IntersectionObserver-triggered),
      scroll-triggered bar/line grow-in (`charts.ts` `animateOnVisible`), scroll-reveal on each
      section (`.reveal-section.in-view`), success/error flash + shake on puzzle submission.
      All paths check `prefers-reduced-motion` and skip straight to the end state when it's set.

**Dataviz skill was loaded and followed**: form chosen per dataset's job (magnitude →
sequential single-hue bars, not categorical/rainbow), the 3-slot categorical order
(`blue/orange/aqua`) was validated with `scripts/validate_palette.js` for the small-multiples
section (all-pairs, light mode: PASS on lightness/chroma/CVD, WARN on one slot's contrast —
mitigated with direct value labels per the skill's relief rule, not dismissed). Mark specs
followed: 4px-rounded bar fill, hairline recessive gridlines/tracks, 2px gap-style separation,
legends via chart titles (single-series-per-chart, so no swatch box needed), labels placed at
the bar's end rather than overflowing (`title=` attribute carries the full name when truncated).

**Two real bugs found and fixed during browser verification (see below):**
1. `.chart-grow.is-visible .bar-fill` was a descendant selector, but `.bar-fill` elements
   carry the `chart-grow` class directly (not a parent of it) — so the width transition
   never fired. Fixed to `.bar-fill.chart-grow.is-visible` (`style.css`).
2. The optimal-stopping chart's "you quit here" label and the rotated y-axis caption
   overlapped when the reader's point landed near the top-left (low failures, many levels
   remaining — the common case for an early quit). Fixed by clamping the label's position
   to stay inside the plot area and replacing the rotated y-axis label with a horizontal
   caption above the plot (`charts.ts`, `style.css`).

**Verification method:** no interactive browser tool was available via the harness, so
Playwright + a locally-installed Chromium were used directly (`npx playwright install
chromium`, then plain Playwright scripts) to load the dev server, click through the quit
flow, solve a real puzzle (verified level-2 loads correctly after solving level 1), scroll
every section into view, and screenshot each one in both light and dark mode. This is how
the two bugs above were actually caught — static review alone had missed both. Screenshots
were saved to `/tmp/claude-501/` during this session (not committed; regenerate if needed).

### Phase 5 — Deployment — ⬜ NOT STARTED
Static site only (no backend needed per Decisions above). Vite build → Vercel/Netlify/GitHub
Pages. `npm run build` in `web/` produces `dist/` and passes clean as of this session.

---

## File map

```
data-analysis/
  notebooks/          analysis + fetch scripts (Phase 1, done; select_puzzles.py is now
                       historical only — see Phase 1 note on the chess→math pivot)
  output/*.json        real cited figures for the site to pull from
  raw/                  source datasets (HarvardX CSV, Duolingo HLR, etc.; the Lichess puzzle
                         CSV is no longer used by the live site)
web/
  src/puzzles.ts        procedural math-puzzle generator, 10 levels (arithmetic/sequence/
                         estimation rotation) — see Phase 2 for the bugs found building it
  src/mathinput.ts        MathInput: renders a puzzle prompt + number input + submit
  src/ladder.ts            Ladder: level progression, attempt tracking, quit/finish events
  src/stopping.ts           TS port of optimal_strategy.py / reader_comparison.py (verified)
  src/data.ts                real cited figures, copied in from data-analysis/output/*.json
  src/charts.ts               SVG stopping-curve chart + small-multiples bar charts
  src/sections.ts              all 7 post-quit scroll sections (content + wiring)
  src/main.ts                   top-level wiring: cold open, quit, replay
  src/style.css                  full design system: tokens, typography, motion, math input,
                                  charts (chess board styles removed in the pivot)
  index.html                      real title/meta, Google Fonts (Fraunces/Figtree/JetBrains Mono)
PROJECT.md              this file
```

**Keeping `data.ts` in sync:** if any `data-analysis/notebooks/*.py` script is re-run and
produces different numbers in `data-analysis/output/*.json`, `web/src/data.ts` must be
updated by hand to match — there's no build-time pipeline connecting the two yet. Same for
`stopping.ts` vs `optimal_strategy.py`/`reader_comparison.py` if that model ever changes.

## Current status (as of 2026-10-08)

Phases 1–4 complete. The core mechanic was swapped from chess puzzles to procedurally
generated mental-math puzzles mid-session (see Decisions above) — the site is a fully
working, visually designed, real-data-backed single-page scroll essay: play the math ladder,
quit (or finish) at any point, scroll through a reveal built from real analysis and real
external datasets, replay. `npm run build` passes clean; the full flow (puzzle → quit → all 7
sections → replay) was verified live in a real browser via Playwright, in both light and dark
mode. Several real bugs were caught and fixed along the way (see Phase 2 and Phase 4 notes):
two in the original chess board logic (now moot post-pivot), two in the math puzzle
generator (an order-of-operations display bug, and operand ranges producing unsolvable
puzzles), and one CSS selector bug plus one chart label collision in the chart layer.

**What's left:**
- **Phase 5 (deployment)** — not started. Needs a target host picked (Vercel/Netlify/GitHub
  Pages all fit a static Vite build) and actually deployed.
- **Ladder length** — currently 10 puzzles (within the 8–10 target; no trim forced).
- Nothing else is known-broken, but this was verified by one person's (Claude's) pass through
  the flow, not real user testing — worth having the actual user click through it once too.
