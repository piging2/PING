#!/usr/bin/env python3
"""x-follow-stall-watch.py: deterministic stall detector for x-follow-batch.sh logs.

The follow batch logs pacing sleeps BEFORE sleeping (e.g. "pacing: sleeping 665s
before @sama"), then logs the follow result after. A batch whose last line is a
pacing sleep with no result after the sleep window expired has silently died:
that is exactly what happened 2026-09-15 ~17:03 MDT (665s sleep before @sama,
no @sama line, batch never completed).

Read-only: parses the log, prints a typed state, exits 0/1/2. It never touches
the browser, the queue, or any cron.

Usage:
    x-follow-stall-watch.py [--log PATH] [--now "YYYY-MM-DD HH:MM:SS UTC"]
                            [--grace SECONDS]

Exit codes:
    0  COMPLETE or RUNNING  (batch finished, or is plausibly mid-run)
    1  attention needed      (STALLED, STALE_UNKNOWN, HALTED_RESTRICTION, MALFORMED)
    2  cannot evaluate       (log file missing, bad arguments)

Line grammar (x-follow-batch.sh `log()` writes "- <ts UTC>: <msg>"):
    <ts>: batch start
    <ts>: batch complete
    <ts>: pacing: sleeping <N>s before @<handle>
    <ts>: @<handle> -> rc=<N> :: <line>
    <ts>: HALT: restriction signal on @<handle>; stopping batch per red-line rule
"""
import argparse
import re
import sys
from datetime import datetime, timedelta, timezone

LINE_RE = re.compile(
    r"^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC: (.*)$"
)
PACING_RE = re.compile(r"^pacing: sleeping (\d+)s before @(\S+)$")
FOLLOW_RE = re.compile(r"^@(\S+) -> rc=(\d+) :: (.*)$")
HALT_RE = re.compile(r"^HALT: restriction signal on @(\S+)")


def parse_ts(s):
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def classify(log_path, now, grace):
    try:
        with open(log_path) as f:
            lines = [ln.rstrip("\n") for ln in f if ln.strip()]
    except FileNotFoundError:
        return ("NO_LOG", f"log file not found: {log_path}", 2)

    events = []
    for ln in lines:
        m = LINE_RE.match(ln)
        if not m:
            return ("MALFORMED", f"unparseable log line: {ln[:80]}", 1)
        events.append((parse_ts(m.group(1)), m.group(2)))

    if not events:
        return ("MALFORMED", "log file is empty", 1)

    # Scope to the most recent batch run.
    starts = [i for i, (_, msg) in enumerate(events) if msg == "batch start"]
    if not starts:
        return ("MALFORMED", "no 'batch start' line found", 1)
    run = events[starts[-1]:]

    # A restriction halt (rc=3) ends the batch by design.
    for ts, msg in reversed(run):
        if msg == "batch complete":
            return ("COMPLETE", f"batch completed at {ts:%H:%M} UTC", 0)
        if HALT_RE.match(msg):
            return ("HALTED_RESTRICTION",
                    f"batch halted on restriction signal: {msg}", 1)
        pm = PACING_RE.match(msg)
        fm = FOLLOW_RE.match(msg)
        if pm or fm or msg == "batch start":
            last_ts, last_msg = ts, msg
            break
    else:
        return ("MALFORMED", "no recognizable events in latest batch run", 1)

    if last_msg == "batch start":
        if now > last_ts + timedelta(seconds=grace):
            return ("STALLED_AT_START",
                    f"batch started at {last_ts:%H:%M} UTC and never attempted "
                    f"a handle ({grace}s grace exceeded)", 1)
        return ("RUNNING", f"batch started {last_ts:%H:%M} UTC, first handle pending", 0)

    m = PACING_RE.match(last_msg)
    if m:
        wait, handle = int(m.group(1)), m.group(2)
        deadline = last_ts + timedelta(seconds=wait + grace)
        if now > deadline:
            return ("STALLED",
                    f"batch died during pacing sleep: logged 'sleeping {wait}s "
                    f"before @{handle}' at {last_ts:%H:%M} UTC, no result after "
                    f"{wait + grace}s deadline (now {now:%H:%M} UTC); "
                    f"@{handle} never attempted", 1)
        return ("RUNNING",
                f"batch pacing: sleeping before @{handle}, "
                f"deadline {deadline:%H:%M} UTC", 0)

    # Last line is a follow result but no "batch complete": the runner is
    # between iterations (the next pacing line is logged immediately on the
    # next loop pass). Only flag as stale after a generous window.
    if FOLLOW_RE.match(last_msg):
        if now > last_ts + timedelta(seconds=1800):
            return ("STALE_UNKNOWN",
                    f"last event is a follow result at {last_ts:%H:%M} UTC with "
                    f"no completion 30m later; batch state unknown", 1)
        return ("RUNNING", f"batch mid-run, last follow at {last_ts:%H:%M} UTC", 0)

    return ("MALFORMED", f"unrecognized latest event: {last_msg[:60]}", 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default=None)
    ap.add_argument("--now", default=None,
                    help='UTC now override, "YYYY-MM-DD HH:MM:SS UTC", for tests')
    ap.add_argument("--grace", type=int, default=120,
                    help="grace seconds beyond a pacing sleep before STALLED")
    args = ap.parse_args()
    log = args.log or (
        "/home/hatch/workspace/goals/ping-social-brand-launch/"
        "hidden_files/x-follow-batch-2026-09-15.log"
    )
    if args.now:
        now = parse_ts(args.now.replace(" UTC", ""))
    else:
        now = datetime.now(timezone.utc)
    state, detail, rc = classify(log, now, args.grace)
    print(f"{state}: {detail}")
    sys.exit(rc)


if __name__ == "__main__":
    main()
