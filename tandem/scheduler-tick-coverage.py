#!/usr/bin/env python3
"""scheduler-tick-coverage.py — R7 scheduler tick coverage from the LIVE schedule contract.

Problem (2026-09-27): the reconciliation reporter derived expected scheduler
ticks from a hardcoded interval/anchor in the cron body (ping-social-outreach-
engine still said "interval 3h" after the live schedule moved to 6h),
producing phantom OPEN gaps for ticks that were never scheduled.

Fix: the interval and anchor come from the LIVE cron definition files
(workspace/cron.d, workspace/goals/*/crons, workspace/system-cron.d) as the
single source of truth. The watched SET (which loop crons to cover) is
policy and stays configurable; the SCHEDULE (interval/anchor/kind/enabled)
is never hardcoded and never copied into this file.

Usage:
  python3 scheduler-tick-coverage.py [--jobs a,b] [--since ISO] [--before ISO]
      [--now ISO] [--run-records FILE] [--def-dirs D1,D2]

  --jobs        comma-separated cron job ids (default: WATCHED_JOBS)
  --since       window start (ISO); explicit override
  --before      window-start anchor (ISO): when --since is absent, the window
                starts at the checked_at of the newest reconcile-<stamp>.json
                with checked_at strictly BEFORE this instant. The reconciler
                passes T0 (recorded before it writes its own report), which
                deterministically excludes this run's report from the
                selection. Without --before and without --since, the bound
                defaults to --now, which may select this run's own report:
                pass --before T0 to be deterministic.
  --now         window end (ISO); default: now (UTC)
  --run-records JSON file: {"<job-id>": ["<run start ISO>", ...]} built by the
                worker from the scheduler's run history
  --def-dirs    comma-separated cron definition roots (default: the three
                workspace roots; tests point at fixtures)

Output: one JSON document on stdout with per-job expected/covered/missing
ticks and R7 gap records ready to append to the reconciliation report.
Exit 0 always on a computed result (even with gaps: gaps are data, not a
crash); exit 3 when a job is UNCHECKABLE in a way that prevents computation
for every watched job.

Typed states: a job whose definition is missing/unreadable/ambiguous, whose
kind is unsupported, or whose window cannot be bounded is UNCHECKABLE with a
typed reason. UNCHECKABLE is reported, never converted into phantom gaps and
never into silent coverage.
"""
import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HOME = os.path.expanduser("~")
WS = os.path.join(HOME, "workspace")
RECONCILIATION_DIR = os.path.join(WS, "tandem", "reconciliation")

# The watched SET is policy (which loops the reconciler covers). The SCHEDULE
# of each job is contract (read live, never hardcoded).
WATCHED_JOBS = ("meta-ai-intel-pass", "ping-social-outreach-engine")

DEFAULT_DEF_DIRS = (
    os.path.join(WS, "cron.d"),
    os.path.join(WS, "system-cron.d"),
)


def _default_def_dirs():
    dirs = list(DEFAULT_DEF_DIRS)
    goals = os.path.join(WS, "goals")
    if os.path.isdir(goals):
        for g in sorted(os.listdir(goals)):
            c = os.path.join(goals, g, "crons")
            if os.path.isdir(c):
                dirs.append(c)
    return dirs


def parse_interval(s):
    """'6h' -> 21600. Typed ValueError on anything unparseable."""
    m = re.fullmatch(r"\s*(\d+)\s*([smh])\s*", str(s or ""))
    if not m:
        raise ValueError("unparseable interval: %r" % s)
    n, unit = int(m.group(1)), m.group(2)
    return n * {"s": 1, "m": 60, "h": 3600}[unit]


def parse_frontmatter(path):
    """Minimal frontmatter parser for cron definition files.

    Returns the schedule-relevant fields. Only the keys this tool needs are
    understood; unknown keys are ignored. Raises ValueError on malformed
    frontmatter (typed, not silent).
    """
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        raise ValueError("SCHEDULE_DEF_UNREADABLE: %s: %s" % (path, e))
    m = re.match(r"\s*---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        raise ValueError("SCHEDULE_DEF_UNREADABLE: %s: no frontmatter block" % path)
    fm = m.group(1)
    out = {}
    # flat keys
    for key in ("id", "enabled"):
        mm = re.search(r"(?m)^%s:\s*(.+?)\s*$" % key, fm)
        if mm:
            out[key] = mm.group(1).strip().strip("'\"")
    # schedule block: indented keys under "schedule:"
    sm = re.search(r"(?m)^schedule:\s*\n((?:[ \t]+[^ \t\n][^\n]*\n?)+)", fm)
    sched = {}
    if sm:
        for line in sm.group(1).splitlines():
            mm = re.match(r"\s*([A-Za-z_]+):\s*(.+?)\s*$", line)
            if mm:
                sched[mm.group(1)] = mm.group(2).strip().strip("'\"")
    out["schedule"] = sched
    return out


def load_live_schedule(job_id, def_dirs):
    """Read the LIVE schedule contract for one cron job id.

    Returns dict(enabled, kind, every_seconds|None, daily_time|None, anchor,
    timezone, def_path). The `every`/`at`/`time` values come from the
    definition file on disk, which mirrors the saved schedule. Raises
    ValueError with a typed reason when the contract cannot be established.
    """
    cands = []
    for d in def_dirs:
        cands.extend(glob.glob(os.path.join(d, "**", job_id + "__*.md"),
                               recursive=True))
    # The _archive tree is schedule history, not contract: retired
    # definitions (2h/3h/4h/8h/...) must never compete with the live one.
    cands = [c for c in cands if "/_archive/" not in c.replace(os.sep, "/")]
    cands = sorted(set(cands))
    if not cands:
        raise ValueError("SCHEDULE_DEF_NOT_FOUND: no cron definition file for "
                         "job %r in %d def dirs" % (job_id, len(def_dirs)))
    if len(cands) > 1:
        raise ValueError("SCHEDULE_DEF_AMBIGUOUS: %d definition files for job "
                         "%r: %s" % (len(cands), job_id, cands))
    path = cands[0]
    fm = parse_frontmatter(path)
    if fm.get("id") and fm["id"] != job_id:
        raise ValueError("SCHEDULE_DEF_UNREADABLE: %s declares id %r, expected "
                         "%r" % (path, fm["id"], job_id))
    sched = fm.get("schedule", {})
    kind = sched.get("kind", "")
    tzname = sched.get("timezone") or "UTC"
    try:
        tz = ZoneInfo(tzname)
    except Exception:
        raise ValueError("SCHEDULE_DEF_UNREADABLE: unknown timezone %r in %s"
                         % (tzname, path))
    enabled = str(fm.get("enabled", "true")).lower() not in ("false", "no", "0")
    rec = {"job_id": job_id, "enabled": enabled, "kind": kind,
           "timezone": tzname, "def_path": path}
    if kind == "interval":
        every_raw = sched.get("every")
        at_raw = sched.get("at")
        if not every_raw or not at_raw:
            raise ValueError("SCHEDULE_DEF_UNREADABLE: interval job %r lacks "
                             "every/at in %s" % (job_id, path))
        rec["every_raw"] = every_raw
        rec["every_seconds"] = parse_interval(every_raw)
        try:
            rec["anchor"] = datetime.fromisoformat(at_raw).replace(tzinfo=tz)
        except Exception:
            raise ValueError("SCHEDULE_DEF_UNREADABLE: bad at=%r in %s"
                             % (at_raw, path))
    elif kind == "daily":
        t_raw = sched.get("time")
        if not t_raw:
            raise ValueError("SCHEDULE_DEF_UNREADABLE: daily job %r lacks time "
                             "in %s" % (job_id, path))
        m = re.fullmatch(r"(\d{2}):(\d{2})(?::(\d{2}))?", t_raw.strip())
        if not m:
            raise ValueError("SCHEDULE_DEF_UNREADABLE: bad time=%r in %s"
                             % (t_raw, path))
        rec["daily_time"] = (int(m.group(1)), int(m.group(2)),
                             int(m.group(3) or 0))
        # anchor: the definition file's mtime is not a contract; daily ticks
        # are phase-free (every local day at time), so no anchor is needed.
        rec["anchor"] = None
    else:
        raise ValueError("SCHEDULE_KIND_UNSUPPORTED: job %r kind=%r "
                         "(only interval/daily covered)" % (job_id, kind))
    return rec


def expected_ticks(sched, since, until):
    """Pure: expected tick datetimes in (since, until] for a live schedule."""
    ticks = []
    if sched["kind"] == "interval":
        every = timedelta(seconds=sched["every_seconds"])
        anchor = sched["anchor"]
        if until <= anchor:
            return []
        # first k with anchor + k*every > since
        k = 0
        if since >= anchor:
            k = int((since - anchor).total_seconds()
                    // sched["every_seconds"]) + 1
        t = anchor + k * every
        while t <= until:
            ticks.append(t)
            t += every
    elif sched["kind"] == "daily":
        hh, mm, ss = sched["daily_time"]
        tz = ZoneInfo(sched["timezone"])
        day = since.astimezone(tz).date()
        # cover the day containing `since` through the day containing `until`
        end_day = until.astimezone(tz).date()
        d = day
        while d <= end_day:
            t = datetime(d.year, d.month, d.day, hh, mm, ss, tzinfo=tz)
            if since < t <= until:
                ticks.append(t)
            d += timedelta(days=1)
    return ticks


def parse_ts(s):
    try:
        t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def find_missing(ticks, run_starts, window_s):
    """Pure: which expected ticks lack a scheduler run record.

    Nearest-tick assignment: each run belongs to the expected tick it is
    closest to, provided it is within half an interval (strictly). A tick
    with at least one assigned run is covered. This keeps a very-late run
    for tick T from also covering T+interval: the run is evidence for its
    own tick, not for its neighbor. Runs farther than half an interval from
    every expected tick are reported as unassigned (e.g. manual off-schedule
    runs), never as coverage.
    Returns (covered:[datetime], missing:[datetime], unassigned:int).
    """
    assigned = [0] * len(ticks)
    unassigned = 0
    half = window_s / 2
    for r in run_starts:
        best, best_d = None, None
        for i, t in enumerate(ticks):
            d = abs((r - t).total_seconds())
            if d < half and (best_d is None or d < best_d):
                best, best_d = i, d
        if best is None:
            unassigned += 1
        else:
            assigned[best] += 1
    covered = [t for t, n in zip(ticks, assigned) if n]
    missing = [t for t, n in zip(ticks, assigned) if not n]
    return covered, missing, unassigned


def previous_report_checked_at(recon_dir, bound):
    """checked_at of the newest reconcile-<stamp>.json strictly before bound.

    The bound is normally T0 (this run's start, recorded before step 1 writes
    its report), so the report this run just wrote is never selected as the
    window start. Returns None when no previous report exists (UNCHECKABLE:
    the window cannot be bounded, so no ticks are expected rather than
    guessed).
    """
    cands = []
    for f in glob.glob(os.path.join(recon_dir, "reconcile-*.json")):
        try:
            d = json.load(open(f, encoding="utf-8"))
            ts = parse_ts((d.get("meta") or {}).get("checked_at"))
        except Exception:
            continue
        if ts and ts < bound:
            cands.append((ts, f))
    if not cands:
        return None
    cands.sort()
    return cands[-1][0]


def main(argv):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", default=",".join(WATCHED_JOBS))
    ap.add_argument("--since", default=None)
    ap.add_argument("--before", default=None)
    ap.add_argument("--now", default=None)
    ap.add_argument("--run-records", default=None)
    ap.add_argument("--def-dirs", default=None)
    ap.add_argument("--recon-dir", default=RECONCILIATION_DIR)
    a = ap.parse_args(argv)

    now = parse_ts(a.now) if a.now else datetime.now(timezone.utc)
    def_dirs = a.def_dirs.split(",") if a.def_dirs else _default_def_dirs()

    if a.since:
        since = parse_ts(a.since)
        since_note = "explicit --since"
        if not since:
            raise SystemExit("bad --since value: %r" % a.since)
    else:
        bound = parse_ts(a.before) if a.before else now
        if a.before and not bound:
            raise SystemExit("bad --before value: %r" % a.before)
        since = previous_report_checked_at(a.recon_dir, bound)
        since_note = ("newest reconciliation report checked_at before --before"
                      if a.before
                      else "newest reconciliation report checked_at before now")
    if not since:
        # UNCHECKABLE, not a gap: without a bounded window we expect nothing.
        doc = {"checked_at": now.isoformat(), "window": None,
               "uncheckable": [{
                   "rule": "R7", "step": "SCHEDULE", "state": "UNCHECKED",
                   "reason": "REPORT_STATE_UNKNOWN: no previous reconciliation "
                             "report to bound the tick window; no ticks "
                             "expected rather than guessed"}],
               "jobs": {}, "gaps": [], "gap_count": 0}
        print(json.dumps(doc, indent=1))
        return 0

    run_records = {}
    if a.run_records:
        run_records = json.load(open(a.run_records, encoding="utf-8"))

    jobs_out, gaps, uncheckable = {}, [], []
    for job_id in [j.strip() for j in a.jobs.split(",") if j.strip()]:
        try:
            sched = load_live_schedule(job_id, def_dirs)
        except ValueError as e:
            uncheckable.append({"rule": "R7", "step": "SCHEDULE",
                                "state": "UNCHECKED", "run_id": job_id,
                                "reason": str(e)})
            continue
        if not sched["enabled"]:
            jobs_out[job_id] = {
                "enabled": False, "kind": sched["kind"],
                "every": sched.get("every_raw"),
                "def_path": sched["def_path"],
                "note": "job disabled in the live schedule: no ticks expected, "
                        "no dispatch gap possible"}
            continue
        ticks = expected_ticks(sched, since, now)
        raw = run_records.get(job_id, [])
        starts, skipped = [], 0
        for r in raw:
            t = parse_ts(r)
            if t is None:
                skipped += 1
            else:
                starts.append(t)
        window_s = (sched["every_seconds"] if sched["kind"] == "interval"
                    else 86400)
        covered, missing, unassigned = find_missing(ticks, starts, window_s)
        fmt = lambda d: d.isoformat()
        jobs_out[job_id] = {
            "enabled": True, "kind": sched["kind"],
            "every": sched.get("every_raw"), "every_seconds": window_s,
            "anchor": sched["anchor"].isoformat() if sched["anchor"] else None,
            "timezone": sched["timezone"], "def_path": sched["def_path"],
            "expected_ticks": [fmt(t) for t in ticks],
            "covered_ticks": [fmt(t) for t in covered],
            "missing_ticks": [fmt(t) for t in missing],
            "run_records_used": len(starts),
            "run_records_unassigned": unassigned,
            "run_records_skipped_unparseable": skipped,
        }
        for t in missing:
            gaps.append({
                "rule": "R7", "step": "SCHEDULE", "state": "GAP",
                "run_id": job_id,
                "expected_tick": fmt(t),
                "reason": ("expected tick %s has no scheduler run record "
                           "(live schedule: every %s, anchor %s %s)"
                           % (fmt(t), sched.get("every_raw"),
                              sched["anchor"].isoformat() if sched["anchor"]
                              else sched.get("daily_time"),
                              sched["timezone"])),
                "next_eligible_step":
                    "dispatch gap: tick never queued (or job was disabled at "
                    "tick time); no worker failure. Rotation retry and "
                    "watermark ingest cover the work; this record is the "
                    "visibility.",
                "resumable": True,
            })

    doc = {"checked_at": now.isoformat(),
           "window": {"since": since.isoformat(), "until": now.isoformat(),
                      "since_note": since_note},
           "jobs": jobs_out, "gaps": gaps, "gap_count": len(gaps),
           "uncheckable": uncheckable}
    print(json.dumps(doc, indent=1))
    # Exit 3 only when NOTHING could be computed (every job uncheckable and
    # no gaps): the caller must surface that, not treat it as clean.
    if uncheckable and not jobs_out and not gaps:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
