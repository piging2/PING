#!/usr/bin/env python3
"""test_tiktok_failure_classify.py -- plain-script deterministic test for
tiktok-failure-classify.py. Exit 0 all pass, exit 1 any failure.

Pins the classifier on the real 2026-09-16 TikTok Pass 3 (throttle) and
Pass 4 (abort) data plus synthetic edge cases.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUTREACH = os.path.dirname(HERE)
SCRIPT = os.path.join(OUTREACH, "tiktok-failure-classify.py")
PASSES = os.path.join(os.path.expanduser("~"),
                      "workspace/goals/ping-social-brand-launch/"
                      "hidden_files/engagement-passes")

PASS3_OUTCOMES = os.path.join(PASSES, "tiktok-outcomes-20260916-055303.json")
PASS4_RESULTS = os.path.join(PASSES, "tiktok-results-20260916-095100.json")

failures = []


def check(name, cond, extra=""):
    if cond:
        print(f"ok   {name}")
    else:
        print(f"FAIL {name} {extra}")
        failures.append(name)


def run(path, threshold=None, as_results=False):
    cmd = [sys.executable, SCRIPT]
    cmd += ["--results-file" if as_results else "--outcomes-json", path]
    if threshold is not None:
        cmd += ["--threshold", str(threshold)]
    return subprocess.run(cmd, capture_output=True, text=True)


def write_tmp(records, as_results):
    fd, path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"results": records} if as_results else records, f)
    return path


def verdict_of(res):
    return json.loads(res.stdout)["verdict"]


def main():
    # 1. clean pass -> exit 0, CLEAN
    recs = [
        {"action": "like", "ok": True,
         "note": "like registered (aria-pressed flipped true)"},
        {"action": "comment", "ok": True, "note": "comment text visible"},
    ]
    p = write_tmp(recs, False)
    r = run(p)
    check("clean-exit-0", r.returncode == 0, r.stderr)
    check("clean-verdict", verdict_of(r) == "CLEAN")

    # 2. real Pass 3 (9 nsc likes, 11 comments) -> SOFT_LIKE_THROTTLE, exit 1
    check("pass3-file-exists", os.path.isfile(PASS3_OUTCOMES))
    if os.path.isfile(PASS3_OUTCOMES):
        r = run(PASS3_OUTCOMES)
        check("pass3-exit-1", r.returncode == 1, r.stderr)
        rep = json.loads(r.stdout)
        check("pass3-throttle", rep["verdict"] == "SOFT_LIKE_THROTTLE",
              r.stdout[:200])
        check("pass3-counts", rep["like_no_state_change"] == 9 and
              rep["comments_executed"] == 11, r.stdout[:200])

    # 3. real Pass 4 (1 clean like + abort) -> RESTRICTION_SIGNAL, exit 1
    check("pass4-file-exists", os.path.isfile(PASS4_RESULTS))
    if os.path.isfile(PASS4_RESULTS):
        r = run(PASS4_RESULTS, as_results=True)
        check("pass4-exit-1", r.returncode == 1, r.stderr)
        rep = json.loads(r.stdout)
        check("pass4-restriction", rep["verdict"] == "RESTRICTION_SIGNAL",
              r.stdout[:200])
        check("pass4-abort-context", "abort_context" in rep and
              "matched phrase" in rep["abort_context"] and
              "EXCLUDING the video article" in rep["abort_context"],
              r.stdout[:300])

    # 4. button-not-found -> LAYOUT_SUSPECT
    recs = [
        {"type": "like", "ok": False, "note": "like button not found",
         "url": "https://www.tiktok.com/@x/video/1"},
    ]
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    check("layout-exit-1", r.returncode == 1, r.stderr)
    check("layout-verdict", verdict_of(r) == "LAYOUT_SUSPECT")

    # 5. malformed input -> exit 2
    fd, p = tempfile.mkstemp(suffix=".json")
    os.write(fd, b"{not json")
    os.close(fd)
    r = run(p)
    check("malformed-exit-2", r.returncode == 2, r.stderr)

    # 6. mixed throttle + abort -> MIXED_SIGNALS
    recs = json.load(open(PASS3_OUTCOMES)) + [
        {"action": "abort", "ok": False,
         "note": "possible checkpoint, rate limit, or block detected; "
                 "stopping pass"}]
    p = write_tmp(recs, False)
    r = run(p)
    check("mixed-exit-1", r.returncode == 1, r.stderr)
    rep = json.loads(r.stdout)
    check("mixed-verdict", rep["verdict"] == "MIXED_SIGNALS", r.stdout[:200])
    check("mixed-signals", set(rep["signals"]) ==
          {"SOFT_LIKE_THROTTLE", "RESTRICTION_SIGNAL"}, r.stdout[:200])

    # 7. sub-threshold (2 nsc + 1 comment) -> not throttle, UNRESOLVED_FAILURES
    recs = [
        {"action": "like", "ok": False,
         "note": "click sent, no aria-pressed=true observed"},
        {"action": "like", "ok": False,
         "note": "click sent, no aria-pressed=true observed"},
        {"action": "comment", "ok": True, "note": "comment text visible"},
    ]
    p = write_tmp(recs, False)
    r = run(p)
    check("subthreshold-exit-1", r.returncode == 1, r.stderr)
    check("subthreshold-verdict",
          verdict_of(r) == "UNRESOLVED_FAILURES", r.stdout[:200])
    # ...but at threshold=2 it IS throttle (threshold honored)
    r = run(p, threshold=2)
    check("threshold-honored", verdict_of(r) == "SOFT_LIKE_THROTTLE")

    # 8. empty results -> NO_ACTION, exit 0
    p = write_tmp([], True)
    r = run(p, as_results=True)
    check("empty-exit-0", r.returncode == 0, r.stderr)
    check("empty-verdict", verdict_of(r) == "NO_ACTION")

    # 9. no args -> exit 2
    r = subprocess.run([sys.executable, SCRIPT], capture_output=True, text=True)
    check("noargs-exit-2", r.returncode == 2, r.stderr)

    # 10. results-file and outcomes-json forms agree on Pass 3 shape
    recs = json.load(open(PASS3_OUTCOMES))
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    check("forms-agree", verdict_of(r) == "SOFT_LIKE_THROTTLE" and
          r.returncode == 1)

    # 11. NON-MASKING: comments landed but likes failed -> PARTIAL_LIKE_FAILURE
    recs = [
        {"type": "like", "ok": False, "fail_class": "NO_STATE_CHANGE_UNKNOWN",
         "note": "click sent, no aria-pressed=true observed",
         "url": "https://www.tiktok.com/@x/video/1"},
        {"type": "like", "ok": False, "fail_class": "NO_STATE_CHANGE_UNKNOWN",
         "note": "click sent, no aria-pressed=true observed",
         "url": "https://www.tiktok.com/@x/video/2"},
        {"type": "like", "ok": False, "fail_class": "NO_STATE_CHANGE_UNKNOWN",
         "note": "click sent, no aria-pressed=true observed",
         "url": "https://www.tiktok.com/@x/video/3"},
        {"type": "comment", "ok": True, "fail_class": "COMMENT_APPLIED",
         "note": "comment text visible",
         "url": "https://www.tiktok.com/@x/video/1"},
    ]
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    rep = json.loads(r.stdout)
    check("nomask-exit-1", r.returncode == 1, r.stderr)
    check("nomask-like-verdict", rep["like_verdict"] == "THROTTLE_SIGNAL",
          r.stdout[:300])
    check("nomask-comment-verdict", rep["comment_verdict"] == "CLEAN",
          r.stdout[:300])
    check("nomask-overall", rep["overall_class"] == "PARTIAL_FAILURE",
          r.stdout[:300])
    check("nomask-suggested",
          rep["suggested_pass_class"] == "PARTIAL_LIKE_FAILURE",
          r.stdout[:300])

    # 12. new driver fail_class values classify explicitly
    recs = [
        {"type": "like", "ok": False, "fail_class": "NO_STATE_CHANGE_REMOUNT",
         "note": "control remounted", "url": "https://www.tiktok.com/@x/video/1"},
        {"type": "like", "ok": False,
         "fail_class": "NO_STATE_CHANGE_RESTRICTED",
         "note": "restriction surface matched", "url": "https://www.tiktok.com/@x/video/2"},
        {"type": "like", "ok": False,
         "fail_class": "SELECTOR_NOT_FOUND_HIDDEN",
         "note": "degraded UI", "url": "https://www.tiktok.com/@x/video/3"},
        {"type": "like", "ok": True, "fail_class": "LIKE_APPLIED_LATE",
         "note": "like registered late", "url": "https://www.tiktok.com/@x/video/4"},
    ]
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    rep = json.loads(r.stdout)
    check("newclasses-counts", rep["counts"].get("CONTROL_REMOUNT") == 1 and
          rep["counts"].get("RESTRICTION_SURFACE") == 1 and
          rep["counts"].get("SELECTOR_NOT_FOUND") == 1 and
          rep["counts"].get("LIKE_EXECUTED") == 1, r.stdout[:300])
    check("newclasses-like-verdict", rep["like_verdict"] == "RESTRICTION",
          r.stdout[:300])
    check("newclasses-restriction-signal",
          "RESTRICTION_SIGNAL" in rep["signals"], r.stdout[:300])
    check("newclasses-exit-1", r.returncode == 1, r.stderr)

    # 13. abort with matched_phrase surfaces it deterministically
    recs = [
        {"type": "abort", "ok": False, "fail_class": "PASS_ABORT_RESTRICTION",
         "matched_phrase": "try again later",
         "note": "possible checkpoint, rate limit, or block detected"},
    ]
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    rep = json.loads(r.stdout)
    check("abort-phrase-surfaced",
          rep.get("abort_matched_phrases") == ["try again later"],
          r.stdout[:300])
    check("abort-overall", rep["overall_class"] == "ABORTED",
          r.stdout[:300])

    # 14. comment-only clean pass -> overall CLEAN, like NO_ATTEMPTS
    recs = [
        {"type": "comment", "ok": True, "fail_class": "COMMENT_APPLIED",
         "note": "comment text visible",
         "url": "https://www.tiktok.com/@x/video/1"},
    ]
    p = write_tmp(recs, True)
    r = run(p, as_results=True)
    rep = json.loads(r.stdout)
    check("comment-only-clean", r.returncode == 0
          and rep["overall_class"] == "CLEAN"
          and rep["like_verdict"] == "NO_ATTEMPTS", r.stdout[:300])

    if failures:
        print(f"\n{len(failures)} FAILURES: {failures}")
        return 1
    print("\nall pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
