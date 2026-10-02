#!/usr/bin/env python3
"""test-scheduler-tick-coverage.py — the reporter follows the LIVE schedule.

Core proof: change the live cron definition (6h -> 4h -> 7h) and the
expected ticks follow automatically, with no edit to the reporter.
Also: disabled jobs expect nothing, missing/unsupported definitions are
UNCHECKABLE (never phantom gaps), and the missing-tick diff is exact.
"""
import json
import os
import subprocess
import sys
import tempfile

# Portable: resolve the script from this test's own location so a
# clean-worktree replay tests the checked-out tree, not the dirty root.
SCRIPT = os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "scheduler-tick-coverage.py")

PASS = 0
FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("ok   %s" % name)
    else:
        FAIL += 1
        print("FAIL %s :: %s" % (name, extra))


DEF_TMPL = """---
id: {job}
title: fixture
enabled: {enabled}
mode: task
schedule:
  kind: {kind}
  timezone: America/Denver
  at: 2026-09-09T02:12:55
  every: {every}
---
body
"""


def write_def(d, job, every="6h", enabled="true", kind="interval", fname=None):
    p = os.path.join(d, fname or ("%s__interval@%s.md" % (job, every)))
    with open(p, "w") as f:
        f.write(DEF_TMPL.format(job=job, every=every, enabled=enabled,
                                kind=kind))
    return p


def run(defdir, job, since, until, records=None):
    rec = None
    if records is not None:
        fd, rec = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump({job: records}, f)
    cmd = [sys.executable, SCRIPT, "--jobs", job, "--def-dirs", defdir,
           "--recon-dir", tempfile.mkdtemp(),
           "--since", since, "--now", until]
    if rec:
        cmd += ["--run-records", rec]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return r.returncode, json.loads(r.stdout or "{}"), r.stderr


JOB = "ping-social-outreach-engine"
SINCE = "2026-09-26T02:12:55-06:00"   # exactly on a 02:12:55 tick
UNTIL = "2026-09-27T02:12:55-06:00"

with tempfile.TemporaryDirectory() as d:
    # --- 6h live schedule: 4 ticks in the window ---
    write_def(d, JOB, every="6h")
    rc, doc, err = run(d, JOB, SINCE, UNTIL)
    ticks = doc["jobs"][JOB]["expected_ticks"]
    check("6h: four ticks", ticks == [
        "2026-09-26T08:12:55-06:00", "2026-09-26T14:12:55-06:00",
        "2026-09-26T20:12:55-06:00", "2026-09-27T02:12:55-06:00"], str(ticks))
    check("6h: contract echo", doc["jobs"][JOB]["every"] == "6h"
          and doc["jobs"][JOB]["anchor"] == "2026-09-09T02:12:55-06:00",
          str(doc["jobs"][JOB]))

    # --- schedule changes 6h -> 4h: expectations follow, no script edit ---
    # (filename keeps the stale __interval@6h suffix on purpose: the
    # frontmatter is the contract, not the filename)
    write_def(d, JOB, every="4h", fname="%s__interval@6h.md" % JOB)
    rc, doc2, err = run(d, JOB, SINCE, UNTIL)
    ticks2 = doc2["jobs"][JOB]["expected_ticks"]
    check("4h: six ticks follow automatically", ticks2 == [
        "2026-09-26T06:12:55-06:00", "2026-09-26T10:12:55-06:00",
        "2026-09-26T14:12:55-06:00", "2026-09-26T18:12:55-06:00",
        "2026-09-26T22:12:55-06:00", "2026-09-27T02:12:55-06:00"], str(ticks2))
    check("4h: contract echo", doc2["jobs"][JOB]["every"] == "4h",
          str(doc2["jobs"][JOB]))

    # --- odd interval 7h: no hardcoded 6h could produce this ---
    write_def(d, JOB, every="7h", fname="%s__interval@6h.md" % JOB)
    rc, doc3, _ = run(d, JOB, SINCE, UNTIL)
    ticks3 = doc3["jobs"][JOB]["expected_ticks"]
    check("7h: ticks on 7h phasing from the live anchor", ticks3 == [
        "2026-09-26T07:12:55-06:00", "2026-09-26T14:12:55-06:00",
        "2026-09-26T21:12:55-06:00"], str(ticks3))

    # --- missing-tick diff: 3 of 4 ticks covered -> exactly 1 gap ---
    write_def(d, JOB, every="6h", fname="%s__interval@6h.md" % JOB)
    recs = ["2026-09-26T08:12:55-06:00", "2026-09-26T14:13:01-06:00",
            "2026-09-27T02:08:55-06:00"]  # last one: 4min early, in tolerance
    rc, doc4, _ = run(d, JOB, SINCE, UNTIL, records=recs)
    j = doc4["jobs"][JOB]
    check("diff: 3 covered 1 missing",
          len(j["covered_ticks"]) == 3 and j["missing_ticks"] ==
          ["2026-09-26T20:12:55-06:00"], str(j))
    check("diff: gap record shape",
          doc4["gap_count"] == 1 and doc4["gaps"][0]["rule"] == "R7"
          and doc4["gaps"][0]["step"] == "SCHEDULE"
          and doc4["gaps"][0]["state"] == "GAP"
          and doc4["gaps"][0]["expected_tick"] == "2026-09-26T20:12:55-06:00",
          str(doc4["gaps"]))

    # --- disabled job: no ticks, no gaps ---
    write_def(d, JOB, every="6h", enabled="false",
              fname="%s__interval@6h.md" % JOB)
    rc, doc5, _ = run(d, JOB, SINCE, UNTIL)
    check("disabled: no ticks no gaps",
          doc5["jobs"][JOB]["enabled"] is False
          and "expected_ticks" not in doc5["jobs"][JOB]
          and doc5["gap_count"] == 0, str(doc5["jobs"][JOB]))

with tempfile.TemporaryDirectory() as d:
    # --- archive exclusion: a stale archived def never competes ---
    write_def(d, JOB, every="6h")
    os.makedirs(os.path.join(d, "_archive"))
    write_def(os.path.join(d, "_archive"), JOB, every="3h",
              fname="%s__interval@3h.md" % JOB)
    rc, doc9, _ = run(d, JOB, SINCE, UNTIL)
    check("archive ignored: live 6h wins over archived 3h",
          doc9["jobs"][JOB]["every"] == "6h"
          and len(doc9["jobs"][JOB]["expected_ticks"]) == 4, str(doc9))
    rc, doc6, _ = run(d, "no-such-job", SINCE, UNTIL)
    check("missing def: UNCHECKABLE not gap",
          rc == 3 and len(doc6["uncheckable"]) == 1
          and "SCHEDULE_DEF_NOT_FOUND" in doc6["uncheckable"][0]["reason"]
          and doc6["gap_count"] == 0, str(doc6))

    # --- unsupported kind: UNCHECKABLE ---
    write_def(d, "weekly-job", every="6h", kind="weekly",
              fname="weekly-job__weekly.md")
    rc, doc7, _ = run(d, "weekly-job", SINCE, UNTIL)
    check("unsupported kind: UNCHECKABLE",
          rc == 3 and "SCHEDULE_KIND_UNSUPPORTED"
          in doc7["uncheckable"][0]["reason"], str(doc7))

    # --- no previous report and no --since: REPORT_STATE_UNKNOWN, no ticks ---
    write_def(d, JOB, every="6h")
    cmd = [sys.executable, SCRIPT, "--jobs", JOB, "--def-dirs", d,
           "--recon-dir", tempfile.mkdtemp(), "--now", UNTIL]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    doc8 = json.loads(r.stdout or "{}")
    check("no previous report: UNCHECKED, zero gaps",
          doc8["window"] is None and doc8["gap_count"] == 0
          and "REPORT_STATE_UNKNOWN" in doc8["uncheckable"][0]["reason"],
          str(doc8))

    # --- --before T0 contract: the current run's report is excluded ---
    rdir = tempfile.mkdtemp()
    write_def(d, JOB, every="6h")
    # previous report at 2026-09-26T02:12:55Z; this run's report (written by
    # step 1) at 2026-09-27T04:00:00Z; T0 recorded before step 1 at 03:59:00Z
    for stamp, checked in (("r1", "2026-09-26T02:12:55+00:00"),
                           ("r2", "2026-09-27T04:00:00+00:00")):
        with open(os.path.join(rdir, "reconcile-%s.json" % stamp), "w") as f:
            json.dump({"meta": {"checked_at": checked}}, f)
    cmd = [sys.executable, SCRIPT, "--jobs", JOB, "--def-dirs", d,
           "--recon-dir", rdir, "--now", "2026-09-27T04:30:00+00:00",
           "--before", "2026-09-27T03:59:00+00:00"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    docb = json.loads(r.stdout or "{}")
    w = docb.get("window") or {}
    check("--before excludes this run's report",
          w.get("since") == "2026-09-26T02:12:55+00:00"
          and "before --before" in w.get("since_note", ""),
          str(w))
    # without --before, the current report would be picked (legacy default):
    # the test pins the difference so the contract stays explicit
    cmd2 = [sys.executable, SCRIPT, "--jobs", JOB, "--def-dirs", d,
            "--recon-dir", rdir, "--now", "2026-09-27T04:30:00+00:00"]
    r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=60)
    docb2 = json.loads(r2.stdout or "{}")
    check("default bound differs from --before T0 (contract is load-bearing)",
          (docb2.get("window") or {}).get("since")
          == "2026-09-27T04:00:00+00:00", str(docb2.get("window")))
    # --before with no report before it: UNCHECKABLE, no phantom ticks
    cmd3 = [sys.executable, SCRIPT, "--jobs", JOB, "--def-dirs", d,
            "--recon-dir", rdir, "--now", "2026-09-27T04:30:00+00:00",
            "--before", "2026-09-26T02:00:00+00:00"]
    r3 = subprocess.run(cmd3, capture_output=True, text=True, timeout=60)
    docb3 = json.loads(r3.stdout or "{}")
    check("--before before all reports: UNCHECKED, zero gaps",
          docb3["window"] is None and docb3["gap_count"] == 0
          and "REPORT_STATE_UNKNOWN" in docb3["uncheckable"][0]["reason"],
          str(docb3))

print("---")
print("pass=%d fail=%d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
