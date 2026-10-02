#!/usr/bin/env python3
"""retry-safety-check.py: decide whether an infra-killed Meta AI run is safe to retry.

Promoted from production evidence (meta-ai-intel-pass, 2026-09-27/28):
the runtime "service restarted" mid-second-prompt, delivering SIGTERM.
Ledger recorded outcome=unknown/exit=143, signal.log confirmed SIGTERM,
sidecar stayed status="started" (non-terminal), no answer file existed.
Retrying with the SAME job envelope was safe: the ledger is append-only
and latest-line-wins (brief-lifecycle.latest_run) resolves the
unknown/143 + ok/0 pair to the ok line; infra lines do not consume the
contract-failure budget (consecutive_contract_failures breaks on them).

SAFE_TO_RETRY requires ALL of:
  1. The ledger's latest line for run_id has outcome in {unknown, infra}
     (never ok, never capture_failed).
  2. The sidecar status is non-terminal: {requested, started}.
     answer_captured / capture_failed are terminal.
  3. No answer artifact exists: neither <run_id>.md nor <run_id>.md.CAPTURE_FAILED.
  4. The job envelope <run_id>.job.json exists, so the retry reuses the
     original job_id == run_id identity instead of minting a new one.

Usage: retry-safety-check.py <run_id> [--intel-dir DIR]
Exit 0 = SAFE_TO_RETRY, exit 1 = NOT_SAFE, exit 2 = usage/state error.
Prints one verdict line plus reasons.
"""
import json
import os
import sys

INTEL_DIR_DEFAULT = os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel"
)
NON_TERMINAL = {"requested", "started"}
RETRIABLE_OUTCOMES = {"unknown", "infra"}


def latest_ledger_line(runs_path, run_id):
    latest = None
    with open(runs_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("run_id") == run_id:
                latest = rec
    return latest


def main():
    intel_dir = INTEL_DIR_DEFAULT
    positionals = []
    argv = sys.argv[1:]
    i = 0
    while i < len(argv):
        if argv[i] == "--intel-dir" and i + 1 < len(argv):
            intel_dir = argv[i + 1]
            i += 2
        else:
            positionals.append(argv[i])
            i += 1
    if len(positionals) != 1:
        print("usage: retry-safety-check.py <run_id> [--intel-dir DIR]", file=sys.stderr)
        return 2
    run_id = positionals[0]

    runs_path = os.path.join(intel_dir, "runs.jsonl")
    if not os.path.isfile(runs_path):
        print(f"NOT_SAFE run_id={run_id} reason=ledger-missing")
        return 1

    rec = latest_ledger_line(runs_path, run_id)
    if rec is None:
        print(f"NOT_SAFE run_id={run_id} reason=no-ledger-line")
        return 1
    outcome = rec.get("outcome")
    if outcome not in RETRIABLE_OUTCOMES:
        print(f"NOT_SAFE run_id={run_id} reason=outcome-not-retriable:{outcome}")
        return 1

    sidecar_path = os.path.join(intel_dir, f"{run_id}.provenance.json")
    if not os.path.isfile(sidecar_path):
        print(f"NOT_SAFE run_id={run_id} reason=sidecar-missing")
        return 1
    try:
        sidecar = json.load(open(sidecar_path, encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        print(f"NOT_SAFE run_id={run_id} reason=sidecar-unreadable")
        return 1
    status = sidecar.get("status")
    if status not in NON_TERMINAL:
        print(f"NOT_SAFE run_id={run_id} reason=sidecar-terminal:{status}")
        return 1

    for suffix in (".md", ".md.CAPTURE_FAILED"):
        p = os.path.join(intel_dir, run_id + suffix)
        if os.path.isfile(p):
            print(f"NOT_SAFE run_id={run_id} reason=answer-artifact-exists:{run_id+suffix}")
            return 1

    job_path = os.path.join(intel_dir, f"{run_id}.job.json")
    if not os.path.isfile(job_path):
        print(f"NOT_SAFE run_id={run_id} reason=job-envelope-missing")
        return 1

    print(
        f"SAFE_TO_RETRY run_id={run_id} "
        f"ledger_outcome={outcome} sidecar_status={status} job={run_id}.job.json"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
