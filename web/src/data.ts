/**
 * Real, cited figures pulled from data-analysis/output/*.json (see PROJECT.md
 * Phase 1). Copied in rather than fetched at runtime since this is a static
 * site with no build-time data pipeline wired up yet. If the underlying
 * notebooks are re-run with different data, update these by hand.
 */

export const STEAM = {
  source: 'Steam achievement completion rates, fetched via Steam Web API',
  games: [
    { name: 'Assassin’s Creed Valhalla', medianPct: 4.4, rarestPct: 0.8 },
    { name: 'Disco Elysium', medianPct: 2.5, rarestPct: 0.6 },
    { name: 'The Last of Us Part II', medianPct: 13.9, rarestPct: 3.3 },
    { name: 'Starfield', medianPct: 14.2, rarestPct: 0.1 },
    { name: 'Cyberpunk 2077', medianPct: 16.7, rarestPct: 4.8 },
    { name: 'Hades', medianPct: 19.5, rarestPct: 5.9 },
    { name: 'INSIDE', medianPct: 21.9, rarestPct: 14.0 },
    { name: 'A Short Hike', medianPct: 19.5, rarestPct: 11.0 },
    { name: 'Elden Ring', medianPct: 43.0, rarestPct: 10.5 },
    { name: 'Firewatch', medianPct: 55.3, rarestPct: 7.8 },
  ],
} as const;

export const HARVARDX = {
  source: 'HarvardX/MITx Person-Course dataset, 5 courses combined',
  registered: 338223,
  viewed: 193856,
  explored: 20624,
  certified: 6570,
  pctCertifiedOfRegistered: 1.94,
  courses: [
    { name: 'CS50x', registered: 169621, pctCertified: 0.76 },
    { name: 'CB22x', registered: 30002, pctCertified: 1.28 },
    { name: 'PH278x', registered: 39602, pctCertified: 1.8 },
    { name: 'ER22x', registered: 57406, pctCertified: 4.09 },
    { name: 'PH207x', registered: 41592, pctCertified: 4.43 },
  ],
} as const;

export const DUOLINGO = {
  source: 'Settles & Meeder (ACL 2016) spaced-repetition learning-trace dataset',
  nUsers: 115222,
  pctSingleDayOnly: 56.71,
  retentionByDay: [
    { day: 0, pct: 100.0 },
    { day: 1, pct: 43.29 },
    { day: 2, pct: 36.78 },
    { day: 3, pct: 31.56 },
    { day: 4, pct: 26.97 },
    { day: 5, pct: 22.83 },
    { day: 6, pct: 18.92 },
    { day: 7, pct: 15.11 },
    { day: 8, pct: 11.4 },
    { day: 9, pct: 8.37 },
    { day: 10, pct: 5.28 },
    { day: 11, pct: 1.82 },
  ],
} as const;

/**
 * MTurk boring-task persistence studies (Brattholm-style unpaid-extra-task
 * designs): roughly half of participants kept working an unpaid, no-reward
 * task rather than stopping once the paid portion ended. Cited descriptively,
 * not tied to one dataset file since this wasn't a Phase 1 fetch target.
 */
export const OVER_PERSISTENCE = {
  source: 'MTurk boring-task persistence studies (unpaid-extra-task design)',
  approxPctWhoContinuedForNoReward: 50,
} as const;

export const SUKHOV = {
  source: 'Sukhov et al. (2025), "When to Keep Trying and When to Let Go"',
  n: 3632,
  nAfterExclusions: 3390,
} as const;
