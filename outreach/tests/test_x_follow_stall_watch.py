#!/usr/bin/env python3
"""Deterministic test for x-follow-stall-watch.py.

Runs the real script (subprocess) against synthetic batch logs with a fixed
--now, asserting the typed state and exit code. Plain-script style: exit 0
all green, exit 1 on any failure.
"""
import os
import subprocess
import sys
import tempfile

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "x-follow-stall-watch.py")

CASES = [
    # (name, log lines, --now, expected state prefix, expected exit)
    ("complete",
     ["- 2026-09-15 22:43:01 UTC: batch start",
      "- 2026-09-15 22:43:20 UTC: @a -> rc=0 :: [x] followed @a",
      "- 2026-09-15 22:43:21 UTC: batch complete"],
     "2026-09-16 04:50:00 UTC", "COMPLETE", 0),

    ("stalled_in_pacing_sleep",
     ["- 2026-09-15 22:52:32 UTC: batch start",
      "- 2026-09-15 22:52:32 UTC: @a -> rc=0 :: [x] followed @a",
      "- 2026-09-15 22:52:32 UTC: pacing: sleeping 665s before @b"],
     "2026-09-16 04:50:00 UTC", "STALLED", 1),

    ("pacing_not_yet_expired_is_running",
     ["- 2026-09-15 22:52:32 UTC: batch start",
      "- 2026-09-15 22:52:32 UTC: @a -> rc=0 :: [x] followed @a",
      "- 2026-09-15 22:52:32 UTC: pacing: sleeping 665s before @b"],
     "2026-09-15 22:55:00 UTC", "RUNNING", 0),

    ("halted_on_restriction",
     ["- 2026-09-15 22:43:01 UTC: batch start",
      "- 2026-09-15 22:44:00 UTC: @a -> rc=3 :: [x] RESTRICTED",
      "- 2026-09-15 22:44:00 UTC: HALT: restriction signal on @a; stopping batch per red-line rule"],
     "2026-09-16 04:50:00 UTC", "HALTED_RESTRICTION", 1),

    ("stalled_at_start",
     ["- 2026-09-15 22:43:01 UTC: batch start"],
     "2026-09-16 04:50:00 UTC", "STALLED_AT_START", 1),

    ("follow_result_stale_unknown",
     ["- 2026-09-15 22:43:01 UTC: batch start",
      "- 2026-09-15 22:43:20 UTC: @a -> rc=0 :: [x] followed @a"],
     "2026-09-15 23:30:00 UTC", "STALE_UNKNOWN", 1),

    ("malformed_line",
     ["- 2026-09-15 22:43:01 UTC: batch start",
      "this line has no timestamp"],
     "2026-09-16 04:50:00 UTC", "MALFORMED", 1),

    ("real_tonight_log_is_stalled",
     None,  # special-cased: run against the real log
     "2026-09-16 04:50:00 UTC", "STALLED", 1),
]

REAL_LOG = ("/home/hatch/workspace/goals/ping-social-brand-launch/"
            "hidden_files/x-follow-batch-2026-09-15.log")

failures = 0
for name, lines, now, want_state, want_rc in CASES:
    if lines is None:
        log_path = REAL_LOG
    else:
        fd, log_path = tempfile.mkstemp(suffix=".log")
        with os.fdopen(fd, "w") as f:
            f.write("\n".join(lines) + "\n")
    try:
        r = subprocess.run(
            [sys.executable, SCRIPT, "--log", log_path, "--now", now,
             "--grace", "120"],
            capture_output=True, text=True, timeout=30)
        out = (r.stdout + r.stderr).strip()
        ok = out.startswith(want_state) and r.returncode == want_rc
        print(("PASS" if ok else "FAIL"), name, "->", out.split("\n")[0],
              f"(rc={r.returncode})")
        if not ok:
            failures += 1
            print("     expected:", want_state, "rc", want_rc)
    finally:
        if lines is not None:
            os.unlink(log_path)

print(f"{len(CASES) - failures}/{len(CASES)} green")
sys.exit(1 if failures else 0)
