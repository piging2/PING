#!/usr/bin/env python3
"""Deterministic unit cases for the newness-evidence gate (self-audit
2026-09-24). A b-new-business-radar item qualifies as a new-business hit
ONLY with explicit dated evidence resolving within 90 days before the run
date. Thin website, zero reviews, "appears new", and unverified agent
assertions are INSUFFICIENT, never qualifying. Failing items may still
stage as ordinary newly-discovered prospects; they never count as radar hits.
"""
import importlib.util
import os
import sys
from datetime import date

TANDEM = os.path.expanduser("~/workspace/tandem")


def load():
    spec = importlib.util.spec_from_file_location(
        "newness_evidence", f"{TANDEM}/newness_evidence.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


RD = date(2026, 9, 24)  # run 20260924-210718


def main():
    ne = load()
    failures = []

    def check(name, entry, want):
        got = ne.classify_newness(entry, RD)["verdict"]
        ok = got == want
        print(("PASS " if ok else "FAIL ") + name +
              f" (want={want} got={got})")
        if not ok:
            failures.append(name)

    # Case 1: production, run 20260924-210718. Quoted SOS filing 2025-01-18
    # is 615 days old -> WINDOW_FAIL.
    check("sos-2025-01-18 window-fail",
          "Garage Doors And More LLC. Filed with the Colorado Secretary of "
          "State on January 18, 2025. Grand Junction garage door company.",
          "WINDOW_FAIL")

    # Case 2: production, run 20260924-210718. "new Facebook page with zero
    # reviews" contradicted by dated 2021 reviews -> no newness date at all.
    check("contradicted-new-page insufficient",
          "Resolve Garage Motor. New Facebook page with zero reviews. "
          "Reviews from March 2023 mention same-day garage door service.",
          "INSUFFICIENT")

    # Case 3: production, run 20260924-210718. "opened its doors in 2026"
    # is a bare year: parse_timing returns None -> INSUFFICIENT.
    check("bare-year-2026 insufficient",
          "Pure Air. Montrose HVAC startup that opened its doors in 2026.",
          "INSUFFICIENT")

    # Case 4: prior round. JK Lawncare LLC Formed August 27, 2025
    # (388 days old on 2026-09-24) -> WINDOW_FAIL.
    check("formed-2025-08-27 window-fail",
          "JK Lawncare LLC - Grand Junction - Landscaping. "
          "Formed August 27, 2025.",
          "WINDOW_FAIL")

    # Case 5: in-window formation date, 67 days before run -> OK.
    check("form-date-2026-07-19 ok",
          "BDK Properties LLC - Montrose - Property services. "
          "Form Date 2026-07-19 per Colorado SOS.",
          "OK")

    # Case 6: fresher than 60 days is strictly fresher signal -> OK
    # (34 days before run).
    check("formed-2026-08-21 ok",
          "Top Notch Garage Door LLC. Formed 2026-08-21, Grand Junction.",
          "OK")

    # Case 7: dated grand-opening announcement, 40 days before run -> OK.
    check("grand-opening-dated ok",
          "Coven Plumbing. Grand opening celebration held August 15, 2026 "
          "in Loma.",
          "OK")

    # Case 8: inference language only -> INSUFFICIENT.
    check("appears-new insufficient",
          "Some business. Appears new: thin website, no reviews found, "
          "brand-new looking profile.",
          "INSUFFICIENT")

    # Case 9: "in business since 2005" resolves far outside window.
    check("since-2005 window-fail",
          "EMC Roofing LLC. Independent roofer, in business since 2005.",
          "WINDOW_FAIL")

    # Case 10: review dates are NOT newness dates (keyword filter must not
    # match "reviews") -> INSUFFICIENT, not WINDOW_FAIL.
    check("review-date-not-newness insufficient",
          "Acme HVAC. Grand Junction. Customer reviews from 2021 and 2022 "
          "praise fast service.",
          "INSUFFICIENT")

    # Case 11: undated chamber new-member claim -> INSUFFICIENT.
    check("undated-new-member insufficient",
          "Delta Doors And More LLC. Welcomed as a new chamber member this "
          "year.",
          "INSUFFICIENT")

    # Case 12: month-year fallback resolves (66 days before run) -> OK.
    check("month-year-2026-07 ok",
          "Some business. Formed July 2026 according to SOS records.",
          "OK")

    # Case 13: older-than-window with multiple dates, at least one aged
    # -> WINDOW_FAIL (formation date rules).
    check("mixed-dates-one-aged window-fail",
          "K Line Plumbing. Founded in 2019. Recent press release 2026-08-01 "
          "announces expansion.",
          "WINDOW_FAIL")

    # Case 14: production, run 20260926-030517. Explicit future date
    # ("ribbon cutting set for November 10, 2026", run 2026-09-24) is not
    # opening evidence -> excluded, no other dates -> INSUFFICIENT.
    check("future-date-excluded insufficient",
          "Kooler Garage Doors. Grand opening ribbon cutting set for "
          "November 10, 2026, founder says the location opened recently.",
          "INSUFFICIENT")

    # Case 15: in-window filing + future celebration -> OK on the filing;
    # the future date is excluded, not fatal.
    check("in-window-plus-future ok",
          "Beta Plumbing. Filed with the Colorado SOS on August 15, 2026. "
          "Grand opening celebration planned for December 1, 2026.",
          "OK")

    # Case 16: aged formation date + future celebration -> WINDOW_FAIL on
    # the aged date; the future date does not rescue it.
    check("aged-plus-future window-fail",
          "Gamma Electric. Founded March 3, 2025. Ribbon cutting for the "
          "new showroom set for November 10, 2026.",
          "WINDOW_FAIL")

    # Case 17: determinism - same input twice, same verdict.
    entry = "BDK Properties LLC. Form Date 2026-07-19 per Colorado SOS."
    v1 = ne.classify_newness(entry, RD)["verdict"]
    v2 = ne.classify_newness(entry, RD)["verdict"]
    ok = v1 == v2 == "OK"
    print(("PASS " if ok else "FAIL ") + f"determinism (v1={v1} v2={v2})")
    if not ok:
        failures.append("determinism")

    print()
    if failures:
        print(f"{len(failures)} FAILURES: {failures}")
        sys.exit(1)
    print("all newness-evidence cases pass")


if __name__ == "__main__":
    main()
