"""
Reproduce the key behavioral findings from Sukhov et al. (2025) directly
from raw press-level data, as a sanity check before building site content
on top of this dataset.

Paper exclusion criteria (Results section):
  - participants who failed the comprehension quiz more than once, OR
  - participants who persisted with a button whose failures exceeded
    successes by 20 or more
  -> excludes 242 participants, final N = 3390
     (0.9: 1151, 0.8: 1125, 0.7: 1114)
"""
import pandas as pd
from load_sukhov import load_raw

pd.set_option("display.width", 160)


def segments_for_participant(press_data):
    """
    Turn a flat list of 100 presses into a list of 'arm segments':
    each segment = one contiguous run on a single button_number, with
    running successes/failures at each press and whether it ended in
    a quit (True) or ran out the clock (False, only possible for the
    last segment).
    """
    segments = []
    current_button = None
    succ = fail = 0
    seg_presses = []

    for i, p in enumerate(press_data):
        if current_button is None:
            current_button = p["button_number"]
        elif p["button_number"] != current_button:
            # the arm changed -> previous segment ended in a quit
            segments.append({"button": current_button, "presses": seg_presses, "quit": True})
            current_button = p["button_number"]
            seg_presses = []
            succ = fail = 0

        seg_presses.append(p)

    # final segment never "quit" - task just ended
    segments.append({"button": current_button, "presses": seg_presses, "quit": False})
    return segments


def participant_max_overpersistence(press_data):
    """Max (failures - successes) ever sustained on a single arm, used for exclusion rule."""
    segments = segments_for_participant(press_data)
    worst = 0
    for seg in segments:
        s = f = 0
        for p in seg["presses"]:
            if p["outcome"] == 1:
                s += 1
            else:
                f += 1
            worst = max(worst, f - s)
    return worst


def quiz_failed_more_than_once(row):
    # quiz_failed in the raw data appears to be a count of failed attempts
    return row["quiz_failed"] > 1


def apply_exclusions(data: pd.DataFrame) -> pd.DataFrame:
    keep_mask = []
    for _, row in data.iterrows():
        if quiz_failed_more_than_once(row):
            keep_mask.append(False)
            continue
        if participant_max_overpersistence(row["press_data"]) >= 20:
            keep_mask.append(False)
            continue
        keep_mask.append(True)
    return data[pd.Series(keep_mask, index=data.index)]


def main():
    data = load_raw()
    print("raw N:", len(data))

    clean = apply_exclusions(data)
    print("post-exclusion N:", len(clean))
    print("expected from paper: 3390 (1151 + 1125 + 1114)")
    print(clean["probability_truncation"].value_counts())

    # Feature 1 check: persistence rate when an arm has 0 failures so far
    # Feature 2 check: average number of arms explored per participant
    n_arms_list = []
    persist_no_fail_total = 0
    persist_no_fail_stayed = 0

    for _, row in clean.iterrows():
        segments = segments_for_participant(row["press_data"])
        n_arms_list.append(len(segments))

        for seg in segments:
            s = f = 0
            for i, p in enumerate(seg["presses"]):
                is_last_press_in_segment = i == len(seg["presses"]) - 1
                if f == 0 and not is_last_press_in_segment:
                    # decision point: currently 0 failures, did they press again (stay)?
                    persist_no_fail_total += 1
                    persist_no_fail_stayed += 1  # they did press again by definition (not last)
                if p["outcome"] == 1:
                    s += 1
                else:
                    f += 1
            # also need the decision at the very end of a quit segment with 0 failures
            if seg["quit"] and f == 0:
                persist_no_fail_total += 1
                persist_no_fail_stayed += 0  # they quit despite 0 failures

    avg_arms = sum(n_arms_list) / len(n_arms_list)
    print(f"\naverage arms explored: {avg_arms:.1f}  (paper reports ~7.7-10.7 depending on cap group)")
    print(f"persistence rate with 0 failures: {persist_no_fail_stayed/persist_no_fail_total:.3f} "
          f"(paper reports >0.97)")


if __name__ == "__main__":
    main()
