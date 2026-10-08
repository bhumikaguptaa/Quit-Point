"""
Core function for the site's reveal section: given a reader's state at the
moment they quit a level (how many successes/failures they'd observed on
their current task, i.e. puzzle, and how many "pulls" / attempts they had
left before the ladder ends), classify their quit decision against the
optimal threshold from optimal_strategy.py.

NOTE: the Sukhov task maps onto our chess puzzle ladder loosely, not exactly:
  - their "arm" = our "puzzle level"
  - their "press" = our "attempt at a move" (not quite 1:1 -- a chess puzzle
    isn't a Bernoulli bandit) but the structural analogy (no-return quitting
    under uncertainty, finite remaining budget) is the honest part we are
    borrowing. We will present this as "the mathematically optimal
    stopping point for *this class of problem*", not as if chess puzzles
    were literally the Sukhov task.
"""
from optimal_strategy import quitting_threshold, MAX_T


def classify_quit(successes: int, failures: int, remaining: int) -> dict:
    """
    successes, failures: observed outcomes on the CURRENT arm/level before quitting
    remaining: how many pulls/attempts the optimal agent would still have budget for
               (bounded by MAX_T=100 in the original task; for our site this
               should be re-derived for whatever budget the puzzle ladder uses)
    """
    threshold = quitting_threshold(successes, failures, max_remaining=MAX_T)

    if threshold is None:
        optimal_call = "persist"  # optimal never quits this arm within the horizon
    else:
        optimal_call = "quit" if remaining >= threshold else "persist"

    reader_quit = True  # this function is only called when the reader DID quit

    if optimal_call == "quit":
        verdict = "on_time_or_late"  # optimal agrees quitting was (at least) justified
    else:
        verdict = "quit_early"  # optimal strategy would have persisted here

    return {
        "successes": successes,
        "failures": failures,
        "remaining": remaining,
        "threshold": threshold,
        "optimal_call": optimal_call,
        "verdict": verdict,
    }


if __name__ == "__main__":
    examples = [
        (0, 1, 50),
        (3, 1, 10),
        (3, 1, 50),
        (1, 3, 80),
        (5, 4, 3),
    ]
    for s, f, r in examples:
        print(classify_quit(s, f, r))
