#!/usr/bin/env python3
"""Derive the exact --file/--bytes/--items flags that reconcile-run-report.sh
expects for a run_id, from the same durable evidence the reconciler reads.

Machine truth (verified against reconcile-run-report.sh 2026-09-23):
  file  = basename(ledger.artifact_refs.raw_capture) if it exists on disk, else MISSING
  bytes = getsize of that file if it exists, else MISSING
  items = str(validation.numbered_items) if validation.status == "passed", else n/a

The reconciler's header comment says --file is <run_id>.md and --bytes comes
from stat of <run_id>.md; that is wrong for capture_failed runs, whose
raw_capture is the .md.CAPTURE_FAILED evidence file. Passing the canonical
.md name (or MISSING) for such runs produces a false mismatch. This script
removes that reasoning from the worker: derive, don't hand-pick.

Usage: reconcile-args.py <run_id>
Prints three lines: file=<v> bytes=<v> items=<v> (shell-evaluable).
Exit 2 when the run_id has no ledger record.
"""
import json
import os
import sys

OUTDIR = os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel"
)


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1]:
        print("usage: reconcile-args.py <run_id>", file=sys.stderr)
        return 2
    rid = sys.argv[1]
    rec = None
    try:
        with open(os.path.join(OUTDIR, "runs.jsonl"), encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if r.get("run_id") == rid:
                    rec = r  # last match wins, same as the reconciler
    except OSError as e:
        print(f"ledger unreadable: {e}", file=sys.stderr)
        return 2
    if rec is None:
        print(f"no ledger record for run_id {rid!r}", file=sys.stderr)
        return 2
    raw = ((rec.get("artifact_refs") or {}).get("raw_capture") or "")
    apath = os.path.join(OUTDIR, os.path.basename(raw)) if raw else None
    exists = bool(apath and os.path.isfile(apath))
    file_v = os.path.basename(raw) if exists else "MISSING"
    bytes_v = str(os.path.getsize(apath)) if exists else "MISSING"
    validation = rec.get("validation") or {}
    items_v = (
        str(validation.get("numbered_items"))
        if validation.get("status") == "passed"
        else "n/a"
    )
    print(f"file={file_v}")
    print(f"bytes={bytes_v}")
    print(f"items={items_v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
