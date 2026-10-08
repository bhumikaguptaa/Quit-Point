"""
Select 10 real, difficulty-ranked chess puzzles from the public Lichess
puzzle database (CC0, https://database.lichess.org/#puzzles) for the site's
puzzle ladder, and emit them as a TypeScript module.

Difficulty ladder: 10 target ratings spread from ~800 (easy) to ~2400
(very hard), picking the closest-rated, reasonably popular puzzle to each
target so the ladder has a real difficulty curve rather than random puzzles.

Lichess puzzle CSV's `Moves` column: the FEN is the position BEFORE the
opponent's setup move. The first move in `Moves` is that opponent move
(played automatically, not something the solver does); the remaining moves
alternate solver/opponent and ARE the actual solution line. We only want the
player-facing solution, so we advance the FEN past that first move and keep
the rest as the "solution" the site checks against.
"""
import csv
import io
import json
import subprocess

RAW_PATH = "../raw/lichess_db_puzzle.csv.zst"
OUT_TS_PATH = "../../web/src/puzzles.ts"

TARGET_RATINGS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2150, 2300, 2450]
MIN_POPULARITY = 80  # 0-100 scale in the dataset; avoid obscure/low-quality puzzles
MIN_PLAYS = 1000


def stream_rows():
    proc = subprocess.Popen(
        ["zstd", "-d", "-c", RAW_PATH], stdout=subprocess.PIPE, bufsize=1 << 20
    )
    reader = csv.DictReader(io.TextIOWrapper(proc.stdout, encoding="utf-8"))
    yield from reader
    proc.wait()


def main():
    # one pass: for each target rating, keep the single closest-matching
    # candidate seen so far (reservoir-style, no need to hold all rows)
    best = {t: None for t in TARGET_RATINGS}

    for row in stream_rows():
        rating = int(row["Rating"])
        popularity = int(row["Popularity"])
        nb_plays = int(row["NbPlays"])
        if popularity < MIN_POPULARITY or nb_plays < MIN_PLAYS:
            continue

        closest_target = min(TARGET_RATINGS, key=lambda t: abs(t - rating))
        dist = abs(closest_target - rating)

        current = best[closest_target]
        if current is None or dist < current["dist"]:
            best[closest_target] = {"dist": dist, "row": row}

    puzzles = []
    for target in TARGET_RATINGS:
        entry = best[target]
        if entry is None:
            print(f"WARNING: no puzzle found near rating {target}")
            continue
        row = entry["row"]
        moves = row["Moves"].split()
        puzzles.append(
            {
                "id": row["PuzzleId"],
                "fen": row["FEN"],
                "setupMove": moves[0],
                "solution": moves[1:],
                "rating": int(row["Rating"]),
                "themes": row["Themes"].split(),
            }
        )
        print(f"target {target}: picked {row['PuzzleId']} (actual rating {row['Rating']}, "
              f"popularity {row['Popularity']}, plays {row['NbPlays']})")

    write_ts(puzzles)


def write_ts(puzzles: list[dict]) -> None:
    header = '''export interface Puzzle {
  id: string;
  fen: string;
  /** Opponent's setup move (UCI), played automatically to reach the puzzle position. */
  setupMove: string;
  /** Solution moves in UCI form, alternating player/opponent, starting with the player. */
  solution: string[];
  rating: number;
  themes: string[];
}

/**
 * 10 real, difficulty-ranked puzzles from the public Lichess puzzle database
 * (CC0, https://database.lichess.org/#puzzles), selected by
 * data-analysis/notebooks/select_puzzles.py. Verified solutions, not
 * hand-authored.
 */
export const PUZZLES: Puzzle[] = '''
    body = json.dumps(puzzles, indent=2)
    with open(OUT_TS_PATH, "w") as f:
        f.write(header + body + ";\n")
    print(f"\nwrote {len(puzzles)} puzzles to {OUT_TS_PATH}")


if __name__ == "__main__":
    main()
