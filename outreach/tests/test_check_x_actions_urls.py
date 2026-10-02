#!/usr/bin/env python3
"""test_check_x_actions_urls.py — deterministic tests for check-x-actions-urls.py.

Plain-script style: exit 0 all green, exit 1 any failure. Runs the REAL script
as a subprocess against synthetic fixtures, and against the real x-like.js
driver contract + tonight's real actions file (2026-09-16 01:14 MDT pass).
"""
import json
import os
import subprocess
import sys
import tempfile

SCRIPT = "/home/hatch/workspace/outreach/check-x-actions-urls.py"
DRIVER = "/home/hatch/workspace/pig-fb/x-like.js"
REAL_ACTIONS = ("/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/"
                "engagement-passes/x-actions-20260916-071412.json")

passed = []
failed = []


def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(("PASS " if cond else "FAIL ") + name + (f" ({detail})" if detail and not cond else ""))


def run(actions_obj, extra_args=()):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(actions_obj, f)
        path = f.name
    try:
        p = subprocess.run([sys.executable, SCRIPT, path, *extra_args],
                           capture_output=True, text=True, timeout=30)
        return p.returncode, p.stdout, p.stderr, path
    finally:
        os.unlink(path)


def run_path(path, extra_args=()):
    p = subprocess.run([sys.executable, SCRIPT, path, *extra_args],
                       capture_output=True, text=True, timeout=30)
    return p.returncode, p.stdout, p.stderr


CANON = [{"account": "@dharmesh", "url": "https://x.com/dharmesh/status/2100028499092234606",
          "action": "like"}]

# 1. canonical no-@ URL passes
rc, out, _, _ = run(CANON)
check("canonical-url-passes", rc == 0 and "OK 1/1" in out, f"rc={rc} out={out!r}")

# 2. the exact tonight bug form (@ in handle path) is rejected
bug = [{"account": "@dharmesh", "url": "https://x.com/@dharmesh/status/2100028499092234606",
        "action": "like"}]
rc, out, _, _ = run(bug)
check("at-form-rejected", rc == 1 and "INVALID" in out, f"rc={rc} out={out!r}")

# 3. twitter.com + www variants accepted (driver contract allows them)
variants = [{"url": "https://twitter.com/naval/status/123"},
            {"url": "https://www.x.com/paulg/status/456"}]
rc, out, _, _ = run(variants)
check("twitter-www-variants-pass", rc == 0 and "OK 2/2" in out, f"rc={rc} out={out!r}")

# 4. non-x URL rejected
rc, out, _, _ = run([{"url": "https://facebook.com/x/status/123"}])
check("non-x-rejected", rc == 1 and "INVALID" in out, f"rc={rc} out={out!r}")

# 5. mixed batch: 1 bad of 3 -> exit 1, bad one named
mixed = CANON + [{"url": "https://x.com/@tferriss/status/999"}] + \
        [{"url": "https://x.com/mcuban/status/777"}]
rc, out, err, _ = run(mixed)
check("mixed-batch-flags-bad", rc == 1 and "1/3" in err and "@tferriss" in out,
      f"rc={rc} out={out!r} err={err!r}")

# 6. plain string list form accepted
rc, out, _, _ = run(["https://x.com/bhorowitz/status/111"])
check("string-list-form", rc == 0 and "OK 1/1" in out, f"rc={rc} out={out!r}")

# 7. malformed actions file -> exit 2 (fail closed), usage -> exit 2
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
    f.write("{not json")
    badpath = f.name
rc, _, _ = run_path(badpath)
os.unlink(badpath)
p = subprocess.run([sys.executable, SCRIPT], capture_output=True, text=True, timeout=30)
check("malformed-file-exit-2", rc == 2, f"rc={rc}")
check("no-args-usage-exit-2", p.returncode == 2, f"rc={p.returncode}")

# 8. REAL driver contract + REAL tonight actions file: 7/7 pass
rc, out, err = run_path(REAL_ACTIONS)
check("real-driver-real-actions", rc == 0 and "OK 7/7" in out,
      f"rc={rc} out={out!r} err={err!r}")

# 9. missing driver -> exit 2 fail closed
rc, out, err, _ = run(CANON, extra_args=("--driver=/nonexistent/x-like.js",))
check("missing-driver-exit-2", rc == 2 and "CONTRACT-UNREADABLE" in err, f"rc={rc}")

print(f"\n{len(passed)} passed, {len(failed)} failed")
sys.exit(1 if failed else 0)
