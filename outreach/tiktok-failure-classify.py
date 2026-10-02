#!/usr/bin/env python3
"""tiktok-failure-classify.py -- deterministic classifier over TikTok pass results.

READ-ONLY: never writes, never touches the browser, drivers, or cron bodies.
Turns the re-reasoned Pass 3 / Pass 4 failure diagnoses into a fixed gate.

  action classes : LIKE_EXECUTED / COMMENT_EXECUTED / EXECUTED
                   LIKE_NO_STATE_CHANGE (no-state-change signature; CAUSE
                     UNKNOWN unless evidence says otherwise)
                   SELECTOR_NOT_FOUND (layout/degraded-UI signal)
                   CONTROL_REMOUNT (hydration/rerender race signal)
                   RESTRICTION_SURFACE (explicit platform restriction signal)
                   PASS_ABORT (driver self-abort; abort records now carry the
                     matched phrase, so the evidence is auditable)
                   NOT_ATTEMPTED / OTHER_FAILURE / UNCLASSIFIED
  pass verdicts  : CLEAN | NO_ACTION | SOFT_LIKE_THROTTLE | LAYOUT_SUSPECT
                   RESTRICTION_SIGNAL | MIXED_SIGNALS | UNRESOLVED_FAILURES
  per-action     : like_verdict / comment_verdict, and overall_class
                   (CLEAN | PARTIAL_FAILURE | ABORTED | NO_ACTION).

NON-MASKING RULE (2026-09-24 fix): overall_class is CLEAN only when every
attempted action is ok AND there are no aborts. Like-specific failures are
always visible in like_verdict; a pass where comments landed but likes
failed is PARTIAL_FAILURE with like_verdict=SOFT_LIKE_THROTTLE, never
CLEAN. The suggested_pass_class mapping gives workers a non-conflating
label to log.

Rules (pinned to observed driver notes, 2026-09-15/16):
  SOFT_LIKE_THROTTLE: likes failing with the no-state-change signature
    >= --threshold (default 3) while at least one comment executed.
    (Pass 3, 2026-09-16: 9/9 tail likes failed, 11/11 comments executed.)
  LAYOUT_SUSPECT: any "button not found" note. (Passes 1-2, 2026-09-15:
    TikTok moved like/comment controls to div[role=button][data-e2e=...];
    fixed in tk-engage.js 21:05 cycle.)
  RESTRICTION_SIGNAL: any PASS_ABORT record or any RESTRICTION_SURFACE
    action class. Since the 2026-09-24 driver change, abort records carry
    the matched phrase and the scan that produced them excludes video
    captions, so the old caption-false-positive ambiguity is gone; fail
    closed on the named evidence either way.

Exit codes: 0 = overall_class in (CLEAN, NO_ACTION) (no failure signals)
            1 = a failure signal was classified (verdict in the JSON)
            2 = usage error or unreadable input (fail closed)
"""
import argparse
import json
import sys

DEFAULT_THRESHOLD = 3

VERDICTS = (
    "CLEAN", "NO_ACTION", "SOFT_LIKE_THROTTLE", "LAYOUT_SUSPECT",
    "RESTRICTION_SIGNAL", "MIXED_SIGNALS", "UNRESOLVED_FAILURES",
)

ABORT_CONTEXT_NOTE = (
    "Since the 2026-09-24 driver change, the restriction scan covers only "
    "page chrome (body children EXCLUDING the video article subtree, where "
    "captions live) and every abort record carries the matched phrase plus a "
    "text snippet. A caption containing 'slow down' can no longer trip it. "
    "Fail closed on the named evidence either way."
)


def classify_action(a):
    """Return the deterministic action class for one result/outcome record.

    New (2026-09-24) driver records carry an explicit `fail_class`; it takes
    precedence over note-text matching. Old note shapes still classify via
    the legacy note matches below.
    """
    if not isinstance(a, dict):
        return "UNCLASSIFIED"
    atype = str(a.get("type") or a.get("action") or "").lower()
    ok = a.get("ok")
    fail_class = str(a.get("fail_class") or "")
    note = str(a.get("note") or "")
    n = note.lower()
    if atype == "abort":
        return "PASS_ABORT"
    # Explicit driver evidence classes (2026-09-24 tk-engage.js schema).
    if fail_class in ("LIKE_APPLIED", "LIKE_APPLIED_LATE", "ALREADY_LIKED"):
        return "LIKE_EXECUTED"
    if fail_class == "COMMENT_APPLIED":
        return "COMMENT_EXECUTED"
    if fail_class == "COMMENT_NOT_VISIBLE":
        return "OTHER_FAILURE"
    if fail_class == "COMMENT_SUBMIT_DISABLED":
        return "SELECTOR_NOT_FOUND"
    if fail_class == "NO_STATE_CHANGE_UNKNOWN":
        return "LIKE_NO_STATE_CHANGE"
    if fail_class == "NO_STATE_CHANGE_REMOUNT":
        return "CONTROL_REMOUNT"
    if fail_class == "NO_STATE_CHANGE_RESTRICTED":
        return "RESTRICTION_SURFACE"
    if fail_class in ("SELECTOR_NOT_FOUND_ABSENT", "SELECTOR_NOT_FOUND_HIDDEN"):
        return "SELECTOR_NOT_FOUND"
    # Legacy note-based classification (pre-2026-09-24 driver notes).
    if ok is True:
        if "aria-pressed flipped true" in n or "like registered" in n:
            return "LIKE_EXECUTED"
        if "comment" in n or atype == "comment":
            return "COMMENT_EXECUTED"
        return "EXECUTED"
    if ok is False:
        if "no aria-pressed" in n:
            return "LIKE_NO_STATE_CHANGE"
        if "not found" in n:
            return "SELECTOR_NOT_FOUND"
        if not note.strip():
            return "NOT_ATTEMPTED"
        return "OTHER_FAILURE"
    if not note.strip():
        return "NOT_ATTEMPTED"
    return "UNCLASSIFIED"


def classify(records, threshold=DEFAULT_THRESHOLD):
    classes = [classify_action(a) for a in records]
    types = []
    for a in records:
        if isinstance(a, dict):
            types.append(str(a.get("type") or a.get("action") or "").lower())
        else:
            types.append("")
    counts = {}
    for c in classes:
        counts[c] = counts.get(c, 0) + 1

    n_nsc = counts.get("LIKE_NO_STATE_CHANGE", 0)
    n_nf = counts.get("SELECTOR_NOT_FOUND", 0)
    n_remount = counts.get("CONTROL_REMOUNT", 0)
    n_restricted = counts.get("RESTRICTION_SURFACE", 0)
    n_abort = counts.get("PASS_ABORT", 0)
    n_comments = counts.get("COMMENT_EXECUTED", 0)
    n_like_exec = counts.get("LIKE_EXECUTED", 0)
    n_other = counts.get("OTHER_FAILURE", 0) + counts.get("UNCLASSIFIED", 0)
    n_fail = n_nsc + n_nf + n_remount + n_restricted + n_abort + n_other

    # Per-action-type verdicts: like-specific failures stay visible as
    # like-specific. This is the non-masking rule: comment yield never hides
    # like yield.
    likes_attempted = sum(1 for t, c in zip(types, classes)
                          if t == "like" and c != "NOT_ATTEMPTED")
    comments_attempted = sum(1 for t, c in zip(types, classes)
                             if t == "comment" and c != "NOT_ATTEMPTED")
    like_failed = n_nsc + n_nf + n_remount + n_restricted
    comment_failed = sum(1 for t, c in zip(types, classes)
                         if t == "comment" and c in
                         ("OTHER_FAILURE", "SELECTOR_NOT_FOUND", "UNCLASSIFIED"))

    throttle = n_nsc >= threshold and n_comments >= 1
    layout = n_nf >= 1
    restrict = n_abort >= 1 or n_restricted >= 1

    signals = []
    if throttle:
        signals.append("SOFT_LIKE_THROTTLE")
    if layout:
        signals.append("LAYOUT_SUSPECT")
    if restrict:
        signals.append("RESTRICTION_SIGNAL")

    if likes_attempted == 0:
        like_verdict = "NO_ATTEMPTS"
    elif n_restricted >= 1:
        like_verdict = "RESTRICTION"
    elif throttle:
        like_verdict = "THROTTLE_SIGNAL"
    elif like_failed == n_nf and n_nf >= 1:
        like_verdict = "SELECTOR_ISSUE"
    elif like_failed > 0 and n_like_exec == 0:
        like_verdict = "ALL_FAILED"
    elif like_failed > 0:
        like_verdict = "PARTIAL_FAILURE"
    else:
        like_verdict = "CLEAN"

    if comments_attempted == 0:
        comment_verdict = "NO_ATTEMPTS"
    elif comment_failed > 0 and n_comments == 0:
        comment_verdict = "ALL_FAILED"
    elif comment_failed > 0:
        comment_verdict = "PARTIAL_FAILURE"
    else:
        comment_verdict = "CLEAN"

    if not records:
        verdict = "NO_ACTION"
    elif len(signals) == 1:
        verdict = signals[0]
    elif len(signals) > 1:
        verdict = "MIXED_SIGNALS"
    elif n_fail > 0:
        verdict = "UNRESOLVED_FAILURES"
    else:
        verdict = "CLEAN"

    # overall_class never masks like-specific failures: CLEAN requires every
    # attempted action ok and no aborts.
    if not records or (likes_attempted == 0 and comments_attempted == 0
                       and n_abort == 0):
        overall_class = "NO_ACTION"
    elif n_abort >= 1:
        overall_class = "ABORTED"
    elif (like_verdict == "CLEAN"
          and comment_verdict in ("CLEAN", "NO_ATTEMPTS")):
        overall_class = "CLEAN"
    elif likes_attempted == 0 and comment_verdict == "CLEAN":
        overall_class = "CLEAN"
    else:
        overall_class = "PARTIAL_FAILURE"

    if overall_class == "PARTIAL_FAILURE" and like_verdict != "CLEAN" \
            and comment_verdict == "CLEAN":
        suggested = "PARTIAL_LIKE_FAILURE"
    else:
        suggested = {"CLEAN": "CLEAN_PASS", "NO_ACTION": "NO_ACTION",
                     "ABORTED": "ABORTED",
                     "PARTIAL_FAILURE": "PARTIAL_FAILURE"}[overall_class]

    detail = {
        "verdict": verdict,
        "signals": signals,
        "threshold": threshold,
        "counts": counts,
        "like_no_state_change": n_nsc,
        "like_control_remount": n_remount,
        "like_restriction_surface": n_restricted,
        "like_executed": n_like_exec,
        "likes_attempted": likes_attempted,
        "comments_executed": n_comments,
        "comments_attempted": comments_attempted,
        "aborts": n_abort,
        "like_verdict": like_verdict,
        "comment_verdict": comment_verdict,
        "overall_class": overall_class,
        "suggested_pass_class": suggested,
    }
    if restrict:
        detail["abort_context"] = ABORT_CONTEXT_NOTE
        abort_notes = sorted({
            str(a.get("note") or "")
            for a, c in zip(records, classes) if c == "PASS_ABORT"
        })
        detail["abort_notes"] = abort_notes
        matched = sorted({
            str(a.get("matched_phrase") or "")
            for a in records if isinstance(a, dict) and a.get("matched_phrase")
        })
        if matched:
            detail["abort_matched_phrases"] = matched
    return detail


def load_records(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]          # driver results file
    if isinstance(data, list):
        return data                      # outcomes-json list
    raise ValueError("unrecognized input shape: expected "
                     '{"results":[...]} or a list of outcome records')


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Classify TikTok pass failures deterministically (read-only).")
    ap.add_argument("--results-file", default=None,
                    help="driver results JSON {'results':[...]}")
    ap.add_argument("--outcomes-json", default=None,
                    help="outcomes-json list [{'action','ok','note',...}]")
    ap.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD,
                    help="min LIKE_NO_STATE_CHANGE count for SOFT_LIKE_THROTTLE")
    args = ap.parse_args(argv)

    path = args.results_file or args.outcomes_json
    if not path:
        ap.print_usage(sys.stderr)
        return 2
    if args.threshold < 1:
        print("threshold must be >= 1", file=sys.stderr)
        return 2
    try:
        records = load_records(path)
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print(f"unreadable input: {e}", file=sys.stderr)
        return 2

    report = classify(records, threshold=args.threshold)
    report["input"] = path
    print(json.dumps(report, indent=2, sort_keys=True))
    # Exit on overall_class, not on the legacy verdict: a pass where comments
    # landed but likes failed is PARTIAL_FAILURE (exit 1), never CLEAN.
    return 0 if report["overall_class"] in ("CLEAN", "NO_ACTION") else 1


if __name__ == "__main__":
    sys.exit(main())
