"""
Funnel analysis of the HarvardX Person-Course dataset (HXPC13_DI_v3).

Source: Harvard Dataverse, "HarvardX-MITx Person-Course Academic Year 2013 De-
Identified dataset, version 3.0" (HXPC13_DI_v3_11-13-2019.csv).
5 HarvardX courses, 338,223 registrations.

Funnel stages (as defined by the dataset's own columns):
  registered -> viewed==1 -> explored==1 -> certified==1

"explored" means the student accessed at least half the chapters;
"certified" means they earned a certificate (passed). These are the
dataset's own definitions, not ours.
"""
import json
import pandas as pd

RAW_PATH = "../raw/HXPC13_DI_v3_11-13-2019.csv"
OUT_PATH = "../output/harvardx_funnel.json"


def load():
    return pd.read_csv(RAW_PATH, na_values=["NA"], low_memory=False)


def funnel_for_course(df: pd.DataFrame) -> dict:
    registered = int(df["registered"].sum())
    viewed = int((df["viewed"] == 1).sum())
    explored = int((df["explored"] == 1).sum())
    certified = int((df["certified"] == 1).sum())

    return {
        "registered": registered,
        "viewed": viewed,
        "explored": explored,
        "certified": certified,
        "pct_viewed_of_registered": round(100 * viewed / registered, 2) if registered else None,
        "pct_explored_of_viewed": round(100 * explored / viewed, 2) if viewed else None,
        "pct_certified_of_explored": round(100 * certified / explored, 2) if explored else None,
        "pct_certified_of_registered": round(100 * certified / registered, 2) if registered else None,
    }


def main():
    df = load()
    results = {}
    for course_id, course_df in df.groupby("course_id"):
        results[course_id] = funnel_for_course(course_df)
        print(course_id, results[course_id])

    results["__all_courses_combined__"] = funnel_for_course(df)

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nsaved to {OUT_PATH}")


if __name__ == "__main__":
    main()
