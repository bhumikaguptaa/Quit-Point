"""
Recompute the optimal pursue-vs-quit strategy from Sukhov et al. (2025).

Uses the authors' own recurrence as written in their FiniteBernoulliStopping.ipynb
(not the slightly different Eq. 4 shorthand in the paper's main text appendix,
which turned out to omit the quit branch's immediate-reward term and does not
reproduce their published Table 1). State is parameterized by prior (alpha0,
beta0) = (1,1) plus observed wins w and fails f on the CURRENT arm:

  V(w, f, T, N) = max(
      persist:  (a0+w)/(a0+b0+w+f)  [immediate reward]
              + (a0+w)/(a0+b0+w+f) * V(w+1, f,   T-1, N)
              + (b0+f)/(a0+b0+w+f) * V(w,   f+1, T-1, N),

      quit:     a0/(a0+b0)  [immediate reward on new arm's first press]
              + a0/(a0+b0) * V(1, 0, T-1, N-1)
              + b0/(a0+b0) * V(0, 1, T-1, N-1)
  )

with V(w, f, 0, N) = 0 (no presses left) and N = remaining *arms*, which the
paper sets to effectively unlimited (N >> T) -- so we drop N from the state
entirely and let quit always transition using the flat (1,1) prior.
"""
from functools import lru_cache

MAX_T = 100  # total presses in the real experiment
A0, B0 = 1, 1  # flat prior


@lru_cache(maxsize=None)
def V(w: int, f: int, T: int) -> float:
    if T == 0:
        return 0.0

    a, b = A0 + w, B0 + f
    p_success = a / (a + b)
    p_failure = b / (a + b)

    persist_value = p_success * (1 + V(w + 1, f, T - 1)) + p_failure * V(w, f + 1, T - 1)

    a0_ratio = A0 / (A0 + B0)
    b0_ratio = B0 / (A0 + B0)
    quit_value = a0_ratio * (1 + V(1, 0, T - 1)) + b0_ratio * V(0, 1, T - 1)

    return max(persist_value, quit_value)


@lru_cache(maxsize=None)
def optimal_action(w: int, f: int, T: int) -> str:
    """'persist' or 'quit' at (w, f) observed on current arm, T pulls remaining."""
    if T == 0:
        return "persist"

    a, b = A0 + w, B0 + f
    p_success = a / (a + b)
    p_failure = b / (a + b)

    persist_value = p_success * (1 + V(w + 1, f, T - 1)) + p_failure * V(w, f + 1, T - 1)

    a0_ratio = A0 / (A0 + B0)
    b0_ratio = B0 / (A0 + B0)
    quit_value = a0_ratio * (1 + V(1, 0, T - 1)) + b0_ratio * V(0, 1, T - 1)

    return "persist" if persist_value >= quit_value else "quit"


def quitting_threshold(successes: int, failures: int, max_remaining=MAX_T) -> int | None:
    """
    Smallest number of remaining pulls T such that optimal_action == 'quit'
    at observed (successes, failures) on the current arm.
    Returns None if never optimal to quit within max_remaining (i.e. "always persist").
    """
    for T in range(1, max_remaining + 1):
        if optimal_action(successes, failures, T) == "quit":
            return T
    return None


def reproduce_table_1():
    """Reproduce the published Table 1 grid: successes 0-9 x failures 1-9."""
    print(f"{'succ\\fail':>10}", *[f"{f:>6}" for f in range(1, 10)])
    for s in range(10):
        row = []
        for f in range(1, 10):
            t = quitting_threshold(s, f)
            row.append(f"{t if t is not None else '-':>6}")
        print(f"{s:>10}", *row)


if __name__ == "__main__":
    reproduce_table_1()
