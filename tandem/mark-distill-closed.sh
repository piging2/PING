#!/bin/bash
# mark-distill-closed.sh: deterministically close a Meta AI answer sidecar to a
# terminal DISTILL state.
#
# The outreach engine (step 4e) makes a distill decision per ingested answer
# file (distill+emit, or recorded skip). This script is the ONLY write path
# from that decision to the sidecar fields the reconciler's R2 rule reads.
# Never hand-edit the sidecar JSON: this script is atomic, idempotent, and
# fail-closed. (Round-110 recorded DISTILL skips in ingested.log prose but
# never flipped the sidecars, so R2 kept flagging until a round-114 hand-edit
# caught up. This script closes that gap.)
#
# Usage: mark-distill-closed.sh <answer-file> --by <who> --decision <decision>
#   decision: emitted | ingested | skipped:<reason> | failed[:<reason>] |
#             capture_failed[:<reason>]
# capture_failed closes a .md.CAPTURE_FAILED run as a TERMINAL EXECUTION
# OUTCOME (2026-09-23): the run failed to capture evidence; it is not
# successful evidence and never enters extraction. The sidecar status must
# already be capture_failed (fail-closed: this tool never declares a capture
# failed, the capture machinery does). The close upgrades
# verification pending/not_attempted -> failed and normalizes ping_ingestion
# pending -> not_attempted, and appends a capture_failed_closed transition.
# Exit codes: 0 ok (or already-distill-closed, idempotent), 2 refused/invalid.
set -u
[ $# -ge 1 ] || { echo "usage: mark-distill-closed.sh <answer-file> --by <who> --decision <decision>" >&2; exit 2; }
ANS="$1"; shift
BY=""; DECISION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --by) BY="${2:-}"; shift 2 ;;
    --decision) DECISION="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1 (usage: mark-distill-closed.sh <answer-file> --by <who> --decision <decision>)" >&2; exit 2 ;;
  esac
done
[ -n "$BY" ] || { echo "usage: mark-distill-closed.sh <answer-file> --by <who> --decision <decision>" >&2; exit 2; }
[ -n "$DECISION" ] || { echo "usage: mark-distill-closed.sh <answer-file> --by <who> --decision <decision>" >&2; exit 2; }
[ -f "$ANS" ] || { echo "answer file not found: $ANS" >&2; exit 2; }
case "$DECISION" in
  capture_failed|capture_failed:*)
    STEM="${ANS%.md.CAPTURE_FAILED}"
    [ "$STEM" != "$ANS" ] || { echo "decision capture_failed needs a .md.CAPTURE_FAILED file: $ANS" >&2; exit 2; }
    ;;
  *)
    STEM="${ANS%.md}"
    [ "$STEM" != "$ANS" ] || { echo "answer file must end in .md: $ANS" >&2; exit 2; }
    ;;
esac
SIDECAR="${STEM}.provenance.json"
[ -f "$SIDECAR" ] || { echo "sidecar not found: $SIDECAR" >&2; exit 2; }
BY="$BY" DECISION="$DECISION" SIDECAR="$SIDECAR" python3 - <<'PYEOF'
import datetime, json, os, sys

p = os.environ["SIDECAR"]
by = os.environ["BY"]
decision = os.environ["DECISION"]

def refuse(msg):
    print("refusing: " + msg, file=sys.stderr)
    sys.exit(2)

try:
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
except Exception as e:
    refuse("sidecar is not valid JSON: %s" % e)

is_cf = decision == "capture_failed" or decision.startswith("capture_failed:")
if is_cf:
    if d.get("status") != "capture_failed":
        refuse("decision capture_failed needs sidecar status 'capture_failed', got %r"
               % (d.get("status"),))
    cf_reason = decision[len("capture_failed:"):].strip() if decision.startswith("capture_failed:") else ""
elif d.get("status") != "answer_captured":
    refuse("sidecar status is %r, need 'answer_captured'" % (d.get("status"),))

# Parse the decision into (field, value, transition_state, reason).
field = value = tstate = reason = None
if is_cf:
    pass  # handled by the dedicated terminal-close branch below
elif decision == "emitted":
    field, value, tstate = "ping_ingestion", "emitted", "distilled"
elif decision == "ingested":
    field, value, tstate = "ping_ingestion", "ingested", "distilled"
elif decision.startswith("skipped:"):
    reason = decision[len("skipped:"):].strip()
    if not reason:
        refuse("decision 'skipped:' needs a non-empty reason")
    field, value, tstate = "ping_ingestion", "skipped: " + reason, "distill_skipped"
elif decision == "failed" or decision.startswith("failed:"):
    reason = decision[len("failed:"):].strip() if decision.startswith("failed:") else ""
    field, value, tstate = "verification", "failed", "distill_failed"
else:
    refuse("decision must be emitted | ingested | skipped:<reason> | failed[:<reason>] | capture_failed[:<reason>], got %r" % decision)

# Guards: distill outcomes require a verified answer (the verification gate is
# mark-verified.sh; emit-observation.py also fail-closes without it). A
# verified answer can never be marked failed.
if field == "ping_ingestion" and d.get("verification") != "verified":
    refuse("cannot distill-close: sidecar verification is %r, need 'verified' (run mark-verified.sh first)" % (d.get("verification"),))
if (field == "verification" or is_cf) and d.get("verification") == "verified":
    refuse("cannot mark failed: sidecar is already verified")

# capture_failed terminal close (dedicated branch): a failed capture is a
# TERMINAL EXECUTION OUTCOME, not a distill verdict on an answer. There is no
# answer to verify, so verification upgrades to failed (never downgraded, and
# a verified sidecar was refused above), ping_ingestion pending normalizes to
# not_attempted (a failed capture never attempts PING ingestion), and the
# capture_failed_closed transition records the close. Idempotent: an existing
# capture_failed_closed transition is a no-op; repeated runs converge.
if is_cf:
    states = [t.get("state") for t in d.get("transitions", [])
              if isinstance(t, dict)]
    if "capture_failed_closed" in states:
        print("already-distill-closed")
        sys.exit(0)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tr = d.get("transitions")
    if not isinstance(tr, list):
        tr = []
        d["transitions"] = tr
    t = {"state": "capture_failed_closed", "at": now,
         "by": "mark-distill-closed.sh (" + by + ")", "decision": decision}
    if cf_reason:
        t["reason"] = cf_reason
    tr.append(t)
    if d.get("verification") != "failed":
        d["verification"] = "failed"
    if d.get("ping_ingestion") == "pending":
        d["ping_ingestion"] = "not_attempted"
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, p)
    print("distill-closed: capture_failed (terminal execution outcome)")
    sys.exit(0)

# Idempotency: already terminal with the same decision -> no-op. A bare
# "skipped" (legacy hand-flip) also satisfies a reasoned skip request.
cur = d.get(field)
if cur == value or (field == "ping_ingestion" and cur == "skipped" and value.startswith("skipped:")):
    print("already-distill-closed")
    sys.exit(0)
# Terminal with a DIFFERENT decision -> refuse, never silently overwrite a
# recorded decision.
ing_s = str(d.get("ping_ingestion") or "")
terminal_now = (ing_s in ("emitted", "ingested") or ing_s == "skipped"
                or ing_s.startswith("skipped:")) or d.get("verification") == "failed"
if terminal_now:
    refuse("sidecar already terminal with a different decision (ping_ingestion=%r, verification=%r); not overwriting"
           % (d.get("ping_ingestion"), d.get("verification")))

now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
tr = d.get("transitions")
if not isinstance(tr, list):
    tr = []
    d["transitions"] = tr
t = {"state": tstate, "at": now, "by": "mark-distill-closed.sh (" + by + ")", "decision": decision}
if reason:
    t["reason"] = reason
tr.append(t)
d[field] = value

tmp = p + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.flush()
    os.fsync(f.fileno())
os.replace(tmp, p)
print("distill-closed: %s=%s" % (field, value))
PYEOF
