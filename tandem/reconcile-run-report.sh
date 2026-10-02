#!/bin/bash
# reconcile-run-report.sh: false-success boundary for the Meta -> Pig -> Marketing pipeline.
#
# Incident 2026-09-13: a cron worker reported a successful 32-business capture
# (~18.7 KB, file 20260913-210421-b-new-business-radar.md) for run
# 20260913-210419-b-new-business-radar, which had been SIGTERMed (exit 143)
# with no artifact captured. The filename never existed; the byte size and
# count were the earlier a-slug run's (18680 bytes on disk, validator
# numbered_items 32). The exit code, runs.jsonl ledger, and sidecar were all
# truthful; only the worker's prose report lied, and nothing checked it.
#
# This script re-checks a worker's three report claims (answer filename, byte
# count, business count) against durable evidence: the run's own runs.jsonl
# ledger line, its provenance sidecar, and the filesystem. It stamps the
# sidecar with report_claims {claimed, actual, verdict} and exits 0 on match,
# 1 on mismatch. It never touches the ledger (append-only) and never changes
# knowledge states. A mismatch means the run report must say FAILED.
#
# Usage:
#   reconcile-run-report.sh <run_id> --file <name|MISSING> --bytes <n|MISSING> --items <n|n/a>
# The worker derives the claimed values from THIS run's own artifacts only,
# using the machine-truth rule below (never reuse another run's values).
# Derivation rule (2026-09-23, corrected: the header text was wrong for
# capture_failed runs):
#   expected_file = basename(ledger runs.jsonl -> artifact_refs.raw_capture)
#                 for an ok run this is <run_id>.md; for a capture_failed run
#                 it is the <run_id>.md.CAPTURE_FAILED evidence file
#   --file  = expected_file, or MISSING when that file is absent from disk
#   --bytes = stat -c %s of expected_file, or MISSING when it is absent
#   --items = validation.numbered_items from the run's own runs.jsonl line,
#             or n/a when validation.status is not "passed"
# Or run ~/workspace/tandem/reconcile-args.py <run_id>, which derives the
# three flags from the ledger + filesystem and removes this reasoning.
set -u
OUTDIR=/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel

[ $# -ge 7 ] || { echo "usage: reconcile-run-report.sh <run_id> --file <name|MISSING> --bytes <n|MISSING> --items <n|n/a>" >&2; exit 2; }
RUN_ID="$1"; shift
case "$RUN_ID" in
  *[!A-Za-z0-9._-]*|"") echo "refusing: bad run_id" >&2; exit 2 ;;
esac
CF=""; CB=""; CI=""
while [ $# -gt 0 ]; do
  case "$1" in
    --file) CF="$(basename "${2:-}")"; shift 2 ;;
    --bytes) CB="${2:-}"; shift 2 ;;
    --items) CI="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$CF" ] && [ -n "$CB" ] && [ -n "$CI" ] || { echo "usage: reconcile-run-report.sh <run_id> --file <name|MISSING> --bytes <n|MISSING> --items <n|n/a>" >&2; exit 2; }

RUN_ID="$RUN_ID" CF="$CF" CB="$CB" CI="$CI" OUTDIR="$OUTDIR" python3 - <<'PYEOF'
import datetime, json, os, sys

rid = os.environ["RUN_ID"]
outdir = os.environ["OUTDIR"]
claimed = {"file": os.environ["CF"], "bytes": os.environ["CB"], "items": os.environ["CI"]}
reason = ""
rec = None
ledger = os.path.join(outdir, "runs.jsonl")
try:
    with open(ledger, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get("run_id") == rid:
                rec = r  # last match wins; meta-pass.sh appends exactly one per invocation
except OSError as e:
    reason = f"ledger unreadable: {e}"

if rec is None:
    actual = {"file": "MISSING", "bytes": "MISSING", "items": "n/a"}
    if not reason:
        reason = "no ledger record for run_id"
else:
    expected = (rec.get("artifact_refs") or {}).get("raw_capture") or ""
    apath = os.path.join(outdir, os.path.basename(expected)) if expected else None
    exists = bool(apath and os.path.isfile(apath))
    actual = {
        "file": os.path.basename(expected) if exists else "MISSING",
        "bytes": str(os.path.getsize(apath)) if exists else "MISSING",
        "items": (str((rec.get("validation") or {}).get("numbered_items"))
                  if (rec.get("validation") or {}).get("status") == "passed" else "n/a"),
    }

verdict = "match" if claimed == actual else "mismatch"
if verdict == "mismatch" and not reason:
    diffs = [k for k in ("file", "bytes", "items") if claimed[k] != actual[k]]
    reason = "claimed " + ", ".join(f"{k}={claimed[k]!r}" for k in diffs) + \
             " but artifacts show " + ", ".join(f"{k}={actual[k]!r}" for k in diffs)

# Stamp the verdict on the sidecar (annotation only; never a knowledge state).
sidecar = os.path.join(outdir, rid + ".provenance.json")
if os.path.isfile(sidecar):
    try:
        d = json.load(open(sidecar, encoding="utf-8"))
        d["report_claims"] = {
            "checked_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "claimed": claimed,
            "actual": actual,
            "verdict": verdict,
            "reason": reason or None,
            "ledger_exit_code": (rec or {}).get("exit_code"),
            "ledger_outcome": (rec or {}).get("outcome"),
        }
        tmp = sidecar + ".tmp"
        json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        os.replace(tmp, sidecar)
    except Exception as e:
        print(f"warning: could not stamp sidecar: {e}", file=sys.stderr)

print(f"RECONCILE {rid}: {verdict}"
      f" (claimed file={claimed['file']} bytes={claimed['bytes']} items={claimed['items']}"
      f" | actual file={actual['file']} bytes={actual['bytes']} items={actual['items']})"
      + (f" :: {reason}" if reason else ""))
sys.exit(0 if verdict == "match" else 1)
PYEOF
