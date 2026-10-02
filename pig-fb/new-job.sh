#!/bin/bash
# new-job.sh: write a structured job envelope for a Meta AI research pass.
# The delegator (cron worker or Muse) runs this BEFORE meta-pass.sh, then
# passes the printed job file as meta-pass.sh's second argument.
# Usage: new-job.sh <brief-slug>
# Env: META_RUN_INITIATOR (default "unknown"), META_RUN_AUTH_REF (default null).
# The job envelope is the REQUEST; runs.jsonl (written by meta-pass.sh) is the
# EXECUTION record. They join on job_id == run_id.
set -u
SLUG="$1"
TS=$(date +%Y%m%d-%H%M%S)
RUN_ID="$TS-$SLUG"
OUTDIR=/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel
BRIEF=~/workspace/tandem/prompts/"$SLUG".md
[ -f "$BRIEF" ] || { echo "unknown brief: $SLUG (expected $BRIEF)" >&2; exit 2; }
mkdir -p "$OUTDIR"
JOBFILE="$OUTDIR/$RUN_ID.job.json"

META_SLUG="$SLUG" META_RUN_ID="$RUN_ID" META_TS="$TS" META_BRIEF="$BRIEF" \
python3 - >"$JOBFILE" <<'PYEOF'
import json, os, datetime
slug = os.environ["META_SLUG"]
brief = open(os.environ["META_BRIEF"], encoding="utf-8").read()
# Objective = the brief's TASK text (first two paragraphs), not the whole brief.
paras = [p.strip() for p in brief.split("\n\n") if p.strip()]
objective = "\n\n".join(paras[:2])[:1200]
initiator = os.environ.get("META_RUN_INITIATOR", "unknown") or "unknown"
auth = os.environ.get("META_RUN_AUTH_REF") or None
job = {
    "job_id": os.environ["META_RUN_ID"],
    "mission_id": "ping-social-outreach-campaign",
    "parent_run_id": None,
    "initiated_by": initiator,
    "auth_ref": auth,
    "delegated_to": "meta-ai",
    "capability": "research.ask",
    "brief_ref": slug,
    "objective": objective,
    "expected_output": ("numbered list of real, verifiable businesses (>=3 numbered items, "
                        ">1200 chars). Raw capture is preserved regardless of validation outcome."),
    "created_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "status": "requested",
}
print(json.dumps(job, ensure_ascii=False, indent=2))
PYEOF
echo "$JOBFILE"
