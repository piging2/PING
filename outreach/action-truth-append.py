#!/usr/bin/env python3
"""Append one per-run record to action-truth.jsonl.

Independent discovery/action truth for the automation-resilience program
(2026-09-17, Nolan directive item 11). Schema is documented in
~/workspace/outreach/action-truth-README.md.

Usage:
  action-truth-append.py --run-id R --platform instagram --operation engage \\
      --source instagram-engagement-pass \\
      --discovered 12 --eligible 8 --selected 8 --attempted 8 \\
      --succeeded 7 --verified 7 --failed 1 \\
      --classification SUCCESS_ACTION --notes "what happened"

All counts default to 0. --file overrides the store path (tests).
--ts overrides the timestamp (ISO-8601; defaults to now, local time).

Validation: platform and classification must be in the known vocabularies;
counts must be non-negative integers. The file tail is checked before
appending: a malformed tail line means the store is unreadable, so the
append is refused with exit 3 (fail closed), exactly like the intent
ledger. A successful append is a single write followed by fsync.

Funnel warnings (stderr only, never a rejection): discovered >= eligible >=
selected >= attempted >= succeeded, verified <= succeeded, failed <= attempted.
"""
import argparse
import datetime
import json
import os
import sys

DEFAULT_FILE = os.path.expanduser("~/workspace/outreach/action-truth.jsonl")

PLATFORMS = {"instagram", "facebook", "threads", "x", "tiktok"}
CLASSIFICATIONS = {
    "SUCCESS_ACTION", "SUCCESS_EMPTY", "ENUMERATION_FAILURE", "ELIGIBILITY_EMPTY",
    "DEPENDENCY_FAILURE", "AUTH_FAILURE", "SURFACE_DRIFT", "RATE_LIMIT",
    "TEMPORARY_FAILURE", "TERMINAL_FAILURE",
}
COUNT_FIELDS = ["discovered", "eligible", "selected", "attempted", "succeeded", "verified", "failed"]


def parse_args(argv):
    p = argparse.ArgumentParser(description="Append a per-run record to action-truth.jsonl.")
    p.add_argument("--run-id", required=True)
    p.add_argument("--platform", required=True, choices=sorted(PLATFORMS))
    p.add_argument("--operation", required=True)
    p.add_argument("--source", default="manual")
    p.add_argument("--ts", default=None)
    p.add_argument("--file", default=DEFAULT_FILE)
    p.add_argument("--classification", required=True, choices=sorted(CLASSIFICATIONS))
    p.add_argument("--notes", default="")
    for f in COUNT_FIELDS:
        p.add_argument("--" + f, type=int, default=0)
    return p.parse_args(argv)


def check_tail(path):
    """Fail closed (exit 3) if the existing tail line is malformed."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)
        size = f.tell()
        # read the last ~4KB; the tail line is within it for any sane record
        f.seek(max(0, size - 4096))
        tail = f.read().decode("utf-8", errors="strict")
    lines = [ln for ln in tail.split("\n") if ln.strip()]
    if not lines:
        return
    try:
        json.loads(lines[-1])
    except Exception:
        print("action-truth-append: REFUSED, tail line malformed (fail closed, exit 3); "
              "inspect the tail bytes before appending.", file=sys.stderr)
        sys.exit(3)


def main(argv):
    args = parse_args(argv)
    for f in COUNT_FIELDS:
        v = getattr(args, f)
        if v < 0:
            print(f"action-truth-append: count {f} must be >= 0", file=sys.stderr)
            sys.exit(2)
    ts = args.ts or datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    record = {
        "ts": ts,
        "run_id": args.run_id,
        "platform": args.platform,
        "operation": args.operation,
        "source": args.source,
        "discovered": args.discovered,
        "eligible": args.eligible,
        "selected": args.selected,
        "attempted": args.attempted,
        "succeeded": args.succeeded,
        "verified": args.verified,
        "failed": args.failed,
        "classification": args.classification,
        "notes": args.notes,
    }
    # Funnel warnings: evidence, not a block.
    d = record
    if not (d["discovered"] >= d["eligible"] >= d["selected"] >= d["attempted"] >= d["succeeded"]):
        print("action-truth-append: WARNING funnel not monotone "
              "(discovered>=eligible>=selected>=attempted>=succeeded violated)", file=sys.stderr)
    if d["verified"] > d["succeeded"]:
        print("action-truth-append: WARNING verified > succeeded", file=sys.stderr)
    if d["failed"] > d["attempted"]:
        print("action-truth-append: WARNING failed > attempted", file=sys.stderr)

    check_tail(args.file)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with open(args.file, "a", encoding="utf-8") as f:
        f.write(line)
        f.flush()
        os.fsync(f.fileno())
    print(f"action-truth-append: ok run_id={args.run_id} classification={args.classification}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
