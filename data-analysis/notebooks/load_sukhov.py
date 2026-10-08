"""
Loader for the Sukhov et al. (2025) 'pursue vs quit' behavioral dataset.

Source: https://github.com/sukhovn/OptimalQuittingExperiment
File: full_experiment_data.pkl (3,632 participants, pre-exclusion)
Paper excludes 242 participants (failed quiz >1x, or persisted with a button
20+ failures worse than successes) -> final N = 3,390 (1151 + 1125 + 1114).

The pickle was saved with an older pandas internals format; pandas 2.3's
new_block() rejects the slice/ndarray placement it contains, so we patch it
to accept both before unpickling.
"""
import pickle
import pandas as pd
import pandas.core.internals.blocks as blocks_mod
import pandas._libs.internals as libinternals

_orig_new_block = blocks_mod.new_block


def _patched_new_block(values, placement, ndim=None, refs=None):
    if not isinstance(placement, libinternals.BlockPlacement):
        placement = libinternals.BlockPlacement(placement)
    return _orig_new_block(values, placement, ndim=ndim, refs=refs)


blocks_mod.new_block = _patched_new_block
blocks_mod.new_block_2d = _patched_new_block


def load_raw(path="../raw/OptimalQuittingExperiment/full_experiment_data.pkl"):
    with open(path, "rb") as f:
        return pickle.load(f)


def presses_to_long_df(row):
    """Expand one participant's press_data list into a tidy per-press DataFrame."""
    df = pd.DataFrame(row["press_data"])
    df["subjectID"] = row["subjectID"]
    df["probability_truncation"] = row["probability_truncation"]
    return df


def build_long_presses(data: pd.DataFrame) -> pd.DataFrame:
    """Full tidy press-level table across all participants."""
    frames = [presses_to_long_df(r) for _, r in data.iterrows()]
    long_df = pd.concat(frames, ignore_index=True)
    return long_df


if __name__ == "__main__":
    data = load_raw()
    print("participants (pre-exclusion):", len(data))
    long_df = build_long_presses(data)
    print("total presses:", len(long_df))
    print(long_df.head())
