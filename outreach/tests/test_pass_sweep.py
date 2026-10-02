#!/usr/bin/env python3
"""Tests for pass-sweep.py: deterministic newest-evidence-vs-watermark sweep.

Plain-script exit 0/1 style, matching the outreach test convention:
the suite prints PASS/FAIL lines and exits 0 only when all pass.
"""
import datetime
import hashlib
import json
import os
import subprocess
import sys
import tempfile

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pass-sweep.py")

WM = "2026-09-16T09:50:00+00:00"  # the 03:50 MDT cycle's log timestamp
WM_DT = datetime.datetime.fromisoformat(WM)


def _touch(path, dt):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a"):
        pass
    ts = dt.timestamp()
    os.utime(path, (ts, ts))


def _fixture(newer_platforms=()):
    """Build a temp outreach+passes tree. newer_platforms get mtimes after WM."""
    root = tempfile.mkdtemp(prefix="pass-sweep-test-")
    outreach = os.path.join(root, "outreach")
    passes = os.path.join(root, "passes")
    old = WM_DT - datetime.timedelta(hours=2)
    new = WM_DT + datetime.timedelta(minutes=5)
    histories = {
        "tiktok-engagement.md": "tiktok",
        "instagram-engagement.md": "instagram",
        "threads-engagement.md": "threads",
        "x-engagement.md": "x",
        "facebook-engagement.md": "facebook",
    }
    for fname, plat in histories.items():
        _touch(os.path.join(outreach, fname), new if plat in newer_platforms else old)
    _touch(os.path.join(outreach, "instagram-unfollow", "unfollow-log.jsonl"),
           new if "unfollow" in newer_platforms else old)
    for state in ("instagram-unfollow/state.json", "facebook-unfollow/state.json"):
        _touch(os.path.join(outreach, state), new if "unfollow" in newer_platforms else old)
    for plat, prefix in (("tiktok", "tiktok-"), ("x", "x-"), ("threads", "th-")):
        name = f"{prefix}results-20260916-000000.json"
        _touch(os.path.join(passes, name), new if plat in newer_platforms else old)
    return root, outreach, passes


def _run(outreach, passes, watermark=WM, extra=()):
    cmd = [sys.executable, SCRIPT, "--watermark", watermark,
           "--outreach-dir", outreach, "--passes-dir", passes] + list(extra)
    return subprocess.run(cmd, capture_output=True, text=True)


RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f" -- {detail}" if detail and not cond else ""))


def main():
    # 1. quiet fixture: nothing newer -> exit 0, any_new false
    root, out, ps = _fixture()
    r = _run(out, ps)
    check("quiet_fixture_exit_0", r.returncode == 0, f"rc={r.returncode} err={r.stderr[:200]}")
    doc = json.loads(r.stdout) if r.returncode == 0 else {}
    check("quiet_any_new_false", doc.get("any_new") is False)
    check("quiet_all_platforms_new_false",
          all(p["new"] is False for p in doc.get("platforms", {}).values()))
    check("all_six_platforms_present",
          sorted(doc.get("platforms", {})) == ["facebook", "instagram", "threads", "tiktok", "unfollow", "x"])

    # 2. one newer platform -> exit 1, only that platform flagged
    root, out, ps = _fixture(newer_platforms=("tiktok",))
    r = _run(out, ps)
    check("new_evidence_exit_1", r.returncode == 1, f"rc={r.returncode} err={r.stderr[:200]}")
    doc = json.loads(r.stdout)
    check("new_any_new_true", doc.get("any_new") is True)
    check("only_tiktok_flagged",
          doc["platforms"]["tiktok"]["new"] is True
          and all(doc["platforms"][p]["new"] is False
                  for p in ("instagram", "threads", "x", "facebook", "unfollow")))

    # 3. boundary: mtime exactly == watermark is NOT newer (strictly greater)
    root, out, ps = _fixture()
    hist = os.path.join(out, "x-engagement.md")
    ts = WM_DT.timestamp()
    os.utime(hist, (ts, ts))
    r = _run(out, ps)
    check("boundary_exact_not_new", r.returncode == 0, f"rc={r.returncode}")
    doc = json.loads(r.stdout)
    check("boundary_x_new_false", doc["platforms"]["x"]["new"] is False)

    # 4. unparseable watermark -> exit 2, fail closed
    root, out, ps = _fixture()
    r = _run(out, ps, watermark="not-a-time")
    check("bad_watermark_exit_2", r.returncode == 2, f"rc={r.returncode}")

    # 5. missing passes dir -> exit 2 (unreadable evidence, fail closed)
    root, out, ps = _fixture()
    r = _run(out, os.path.join(root, "no-such-dir"))
    check("missing_passes_dir_exit_2", r.returncode == 2, f"rc={r.returncode}")

    # 6. unfollow log newer -> exit 1, unfollow flagged
    root, out, ps = _fixture(newer_platforms=("unfollow",))
    r = _run(out, ps)
    check("unfollow_new_exit_1", r.returncode == 1, f"rc={r.returncode}")
    doc = json.loads(r.stdout)
    check("unfollow_flagged", doc["platforms"]["unfollow"]["new"] is True)

    # 7. read-only proof: byte-identical evidence after a run
    root, out, ps = _fixture(newer_platforms=("tiktok", "x"))
    def _hashes():
        h = {}
        for base in (out, ps):
            for dirpath, _, files in os.walk(base):
                for f in files:
                    p = os.path.join(dirpath, f)
                    with open(p, "rb") as fh:
                        h[p] = hashlib.sha256(fh.read()).hexdigest()
        return h
    before = _hashes()
    _run(out, ps)
    check("read_only_byte_identical", _hashes() == before)

    # 8. stdout is the ONLY output: valid JSON, nothing on stderr in ok path
    root, out, ps = _fixture()
    r = _run(out, ps)
    try:
        json.loads(r.stdout)
        ok = True
    except json.JSONDecodeError:
        ok = False
    check("stdout_valid_json", ok)
    check("stderr_empty_on_ok", r.stderr == "", repr(r.stderr[:120]))

    # 9. LIVE PARITY: real dirs agree with this hand check of the 04:50 cycle
    # (nothing newer than the last log entry). The watermark is derived
    # deterministically: the night-shift log file's own mtime, which is when
    # the previous cycle finished writing its entry.
    real_out = os.path.expanduser("~/workspace/outreach")
    real_ps = os.path.expanduser(
        "~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes")
    night_log = os.path.join(real_out, "night-shift-2026-09-15.md")
    wm = datetime.datetime.fromtimestamp(
        os.stat(night_log).st_mtime, tz=datetime.timezone.utc).isoformat()
    r = subprocess.run([sys.executable, SCRIPT, "--watermark", wm,
                        "--outreach-dir", real_out, "--passes-dir", real_ps],
                       capture_output=True, text=True)
    check("live_parity_quiet_exit_0", r.returncode == 0, f"rc={r.returncode} err={r.stderr[:200]}")
    doc = json.loads(r.stdout) if r.returncode == 0 else {}
    check("live_parity_any_new_false", doc.get("any_new") is False)

    failed = [n for n, ok, _ in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} green")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
