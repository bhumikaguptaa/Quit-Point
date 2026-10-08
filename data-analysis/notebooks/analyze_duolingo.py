"""
Retention/attrition analysis of the Duolingo Half-Life Regression dataset
(Settles & Meeder, ACL 2016): 12.85M lexeme-review events from real Duolingo
users, learning various languages.

Source: https://doi.org/10.7910/DVN/N8XJME
File: settles.acl16.learning_traces.13m.csv.gz (streamed, not loaded whole --
13M rows of raw per-review data is too much to hold in memory as a DataFrame
comfortably; we only need a few aggregates per user).

Each row is one review session for one lexeme (word form) by one user, with
a unix `timestamp`. We don't have explicit "session" or "quit" events, so we
derive attrition the same way real product analytics would from event logs:

  - first_ts / last_ts per user -> "lifespan in days" (day of first activity
    to day of last activity, inclusive)
  - distinct active days per user
  - day-N retention: of users whose first activity was on day 0, what
    fraction have ANY activity on day N or later (classic survival curve)

This mirrors the "when do people stop" framing we want for the site's
zoom-out data grid, using real per-user timestamps rather than the paper's
own (different) half-life modeling target.
"""
import csv
import gzip
import json
from collections import defaultdict

RAW_PATH = "../raw/settles.acl16.learning_traces.13m.csv.gz"
OUT_PATH = "../output/duolingo_retention.json"

SECONDS_PER_DAY = 86400


def stream_user_day_sets():
    """Two passes over the file (it's gzip-streamed, not held in memory, so
    this is cheap): first pass gets each user's true first_ts; second pass
    buckets every row straight into a day-offset, so we only ever hold small
    per-user sets of day-indices (at most ~a few hundred ints each), never
    raw per-row timestamps."""
    first_ts = {}
    with gzip.open(RAW_PATH, "rt", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            uid = row["user_id"]
            ts = int(row["timestamp"])
            if uid not in first_ts or ts < first_ts[uid]:
                first_ts[uid] = ts
            if i % 2_000_000 == 0:
                print(f"  ...pass 1: {i:,} rows")

    day_offsets = defaultdict(set)
    with gzip.open(RAW_PATH, "rt", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            uid = row["user_id"]
            ts = int(row["timestamp"])
            day_offsets[uid].add((ts - first_ts[uid]) // SECONDS_PER_DAY)
            if i % 2_000_000 == 0:
                print(f"  ...pass 2: {i:,} rows")

    return day_offsets


def main():
    print("streaming dataset (this takes a few minutes for 12.85M rows)...")
    day_offsets = stream_user_day_sets()
    n_users = len(day_offsets)
    print(f"total distinct users: {n_users:,}")

    lifespans = []
    active_day_counts = []

    for uid, days in day_offsets.items():
        lifespan = max(days) + 1  # day 0 to last active day, inclusive
        lifespans.append(lifespan)
        active_day_counts.append(len(days))

    # retention curve: fraction of all users with activity on day N or later
    # (any later day counts since this is "still active / ever came back",
    # not "active on exactly day N"). Computed from each user's max active
    # day (a single pass), not a fresh scan per day.
    max_active_day = {uid: max(days) for uid, days in day_offsets.items()}
    horizon = min(31, max(max_active_day.values()) + 1)
    retention_curve = {}
    for d in range(horizon):
        still_active = sum(1 for m in max_active_day.values() if m >= d)
        retention_curve[d] = round(100 * still_active / n_users, 2)

    lifespans.sort()

    def pct(p):
        idx = min(len(lifespans) - 1, int(len(lifespans) * p))
        return lifespans[idx]

    results = {
        "n_users": n_users,
        "lifespan_days_median": pct(0.5),
        "lifespan_days_p25": pct(0.25),
        "lifespan_days_p75": pct(0.75),
        "pct_users_single_day_only": round(
            100 * sum(1 for l in lifespans if l == 1) / n_users, 2
        ),
        "retention_curve_pct_by_day": retention_curve,
    }

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print(json.dumps(results, indent=2))
    print(f"\nsaved to {OUT_PATH}")


if __name__ == "__main__":
    main()
