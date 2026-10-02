#!/bin/bash
# mark-verified.sh: the verification gate that marks a Meta AI answer as VERIFIED.
#
# The outreach engine runs web-search verification on each business in the
# answer, then the engine (acting under Nolan's standing outreach directive)
# invokes this script with --by "outreach-engine round-N". It only upgrades
# the knowledge state; it never emits to PING (that is emit-observation.py's
# job, gated separately on a real event_id).
#
# Usage: mark-verified.sh <answer-file> --by <who>
# Exit codes: 0 ok (or already-verified, idempotent), 2 refused/invalid.
set -u
[ $# -ge 1 ] || { echo "usage: mark-verified.sh <answer-file> --by <who>" >&2; exit 2; }
ANS="$1"; shift
BY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --by) BY="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1 (usage: mark-verified.sh <answer-file> --by <who>)" >&2; exit 2 ;;
  esac
done
[ -n "$BY" ] || { echo "usage: mark-verified.sh <answer-file> --by <who>" >&2; exit 2; }
[ -f "$ANS" ] || { echo "answer file not found: $ANS" >&2; exit 2; }
STEM="${ANS%.md}"
[ "$STEM" != "$ANS" ] || { echo "answer file must end in .md: $ANS" >&2; exit 2; }
SIDECAR="${STEM}.provenance.json"
[ -f "$SIDECAR" ] || { echo "sidecar not found: $SIDECAR" >&2; exit 2; }
BY="$BY" SIDECAR="$SIDECAR" python3 - <<'PYEOF'
import datetime, json, os, sys
p = os.environ["SIDECAR"]
try:
    d = json.load(open(p, encoding="utf-8"))
except Exception as e:
    print(f"refusing: sidecar is not valid JSON: {e}", file=sys.stderr)
    sys.exit(2)
if d.get("status") != "answer_captured":
    print(f"refusing: sidecar status is {d.get('status')!r}, need 'answer_captured'", file=sys.stderr)
    sys.exit(2)
tr = d.get("transitions")
if not isinstance(tr, list):
    tr = []
    d["transitions"] = tr
if any(isinstance(t, dict) and t.get("state") == "verified" for t in tr):
    print("already-verified")
    sys.exit(0)
tr.append({"state": "verified",
           "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "by": "mark-verified.sh (" + os.environ["BY"] + ")"})
d["verification"] = "verified"  # legacy field follows the knowledge state
tmp = p + ".tmp"
json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
os.replace(tmp, p)
print("verified")
PYEOF
