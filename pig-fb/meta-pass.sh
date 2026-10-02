#!/bin/bash
# Meta AI intelligence pass v3: retrieve context from files, build a versioned
# context pack, delegate the research brief to Meta AI on the Pig, capture the
# raw answer plus a provenance sidecar. Usage: meta-pass.sh <brief-slug> [job.json]
# The optional job envelope (new-job.sh) carries the delegator's structured
# request: job_id/run_id, mission, initiator, auth ref, objective.
#
# RESULT-STATE MACHINE (2026-09-13): a prompt-only capture must NEVER look like
# a completed research result. Terminal sidecar states: answer_captured |
# capture_failed (prompt-only/empty/malformed; evidence kept as
# .md.CAPTURE_FAILED, never enters extraction) | infra (dead before/without a
# usable capture). Non-terminal states left behind by a dead run mean the slug
# is safe to retry: requested | started. A terminal capture_failed run never
# leaves verification/ping_ingestion as "pending": failed / not_attempted.
# RUN LEDGER (continuity seam, 2026-09-13): every invocation appends exactly
# one terminal record to $OUTDIR/runs.jsonl via the EXIT trap, on every exit
# path (ok / capture_failed / infra / unexpected). The ledger is the
# execution-level record; sidecars stay artifact-level provenance.
# Exit codes: 0 ok, 3 capture_failed (fail closed), 2 infra.
set -u
SLUG="$1"
JOBFILE="${2:-}"  # optional structured job envelope from new-job.sh
TS=$(date +%Y%m%d-%H%M%S)
OUTDIR=/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel
source "$(dirname "$0")/pig-ssh.sh"  # shared SSH helper (Step 3); PIG_TIMEOUT default 25
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)
REMOTE_DIR="C:/Users/nolan/.local/share/pigi/fb-engage"

# Job envelope: the delegator's structured request. When present, run_id,
# initiated_by, auth_ref, and mission_id come from the job; the ledger joins
# to it on job_id == run_id. Without it, run identity is generated as before
# (backward compatible with `meta-pass.sh <slug>`).
JOB_REF=""
MISSION_ID=""
RUN_ID="$TS-$SLUG"
if [ -n "$JOBFILE" ]; then
  [ -f "$JOBFILE" ] || { echo "job file not found: $JOBFILE" >&2; exit 2; }
  JOB_RUN_ID=""; JOB_INITIATOR=""; JOB_AUTH=""; JOB_MISSION=""
  eval "$(python3 - "$JOBFILE" <<'PYEOF'
import json, sys, shlex
j = json.load(open(sys.argv[1]))
print("JOB_RUN_ID=" + shlex.quote(j.get("job_id") or ""))
print("JOB_INITIATOR=" + shlex.quote(j.get("initiated_by") or "unknown"))
print("JOB_AUTH=" + shlex.quote(j.get("auth_ref") or ""))
print("JOB_MISSION=" + shlex.quote(j.get("mission_id") or ""))
PYEOF
)"
  [ -n "$JOB_RUN_ID" ] || { echo "job file missing job_id: $JOBFILE" >&2; exit 2; }
  RUN_ID="$JOB_RUN_ID"
  export META_RUN_INITIATOR="$JOB_INITIATOR"
  [ -n "$JOB_AUTH" ] && export META_RUN_AUTH_REF="$JOB_AUTH"
  MISSION_ID="$JOB_MISSION"
  JOB_REF=$(basename "$JOBFILE")
fi
LOCAL="$OUTDIR/$RUN_ID.md"

mkdir -p "$OUTDIR"

# --- Run ledger ---
# Exactly one JSON object per invocation, appended from finalize() on the EXIT
# trap. Append-only: never rewritten. A ledger-write failure can never conceal
# the primary outcome (|| true; the original exit code is preserved).
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LEDGER="$OUTDIR/runs.jsonl"
RUN_OUTCOME="unknown"                   # ok | capture_failed | infra
RUN_CLASS="terminated_before_classification"
VALIDATOR_CHARS=""
VALIDATOR_ITEMS=""

ledger_append() {  # $1 = exit code; always succeeds from the caller's view
  local rc="$1" completed_at
  completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  # Artifact refs: only what this run actually produced (files must exist).
  local raw_ref="" sidecar_ref="" pack_ref=""
  [ -f "$LOCAL.CAPTURE_FAILED" ] && raw_ref="$RUN_ID.md.CAPTURE_FAILED"
  [ -f "$LOCAL" ] && [ -z "$raw_ref" ] && raw_ref="$RUN_ID.md"
  [ -f "$OUTDIR/$RUN_ID.provenance.json" ] && sidecar_ref="$RUN_ID.provenance.json"
  [ -n "${PACKFILE:-}" ] && [ -f "$PACKFILE" ] && pack_ref="${PACKFILE#$HOME/}"
  META_RUN_ID="$RUN_ID" META_STARTED_AT="$STARTED_AT" META_COMPLETED_AT="$completed_at" \
  META_RC="$rc" META_OUTCOME="$RUN_OUTCOME" META_CLASS="$RUN_CLASS" META_SLUG="$SLUG" \
  META_PACKVER="${PACKVER:-unknown}" META_VCHARS="$VALIDATOR_CHARS" META_VITEMS="$VALIDATOR_ITEMS" \
  META_RAW_REF="$raw_ref" META_SIDECAR_REF="$sidecar_ref" META_PACK_REF="$pack_ref" \
  META_REMOTE_ANS="${REMOTE_ANS:-}" META_MISSION_ID="$MISSION_ID" META_JOB_REF="$JOB_REF" \
  META_LOCATOR="${LOCATOR_ID:-}" \
  python3 - >>"$LEDGER" <<'PYEOF' 2>/dev/null || true
import json, os
def opt(k):
    v = os.environ.get(k, "")
    return v if v != "" else None
artifacts = {}
if opt("META_RAW_REF"): artifacts["raw_capture"] = opt("META_RAW_REF")
if opt("META_SIDECAR_REF"): artifacts["sidecar"] = opt("META_SIDECAR_REF")
if opt("META_PACK_REF"): artifacts["context_pack"] = opt("META_PACK_REF")
if opt("META_REMOTE_ANS"): artifacts["pig_answer"] = opt("META_REMOTE_ANS")
validation = {"status": "not_run"}
if opt("META_VCHARS") is not None:
    passed = os.environ.get("META_OUTCOME") == "ok"
    validation = {"status": "passed" if passed else "rejected",
                  "answer_chars": int(opt("META_VCHARS") or 0),
                  "numbered_items": int(opt("META_VITEMS") or 0)}
vstate = {"ok": "answer_captured_unverified",
          "capture_failed": "capture_failed_terminal",
          "infra": "infra_terminal"}.get(os.environ.get("META_OUTCOME"), "unknown_terminal")
rec = {
  "run_id": os.environ["META_RUN_ID"],
  "job_ref": opt("META_JOB_REF"),
  "mission_id": opt("META_MISSION_ID"),
  "initiated_by": os.environ.get("META_RUN_INITIATOR", "unknown"),
  "auth_ref": os.environ.get("META_RUN_AUTH_REF") or None,
  "brief_id": os.environ.get("META_SLUG"),
  "research_agent": "meta-ai",
  "locator": opt("META_LOCATOR"),
  "pack_version": os.environ.get("META_PACKVER"),
  "started_at": os.environ.get("META_STARTED_AT"),
  "completed_at": os.environ.get("META_COMPLETED_AT"),
  "exit_code": int(os.environ.get("META_RC", -1)),
  "outcome": os.environ.get("META_OUTCOME"),
  "classification": os.environ.get("META_CLASS"),
  "artifact_refs": artifacts,
  "validation": validation,
  "ping_refs": [],
  "ping_outcome": "none",
  "last_verified_state": vstate,
  "resumable": True,
  "resume_note": "idempotent: Pig per-slug files are overwritten, local files are timestamped; safe to rerun this brief",
}
print(json.dumps(rec, ensure_ascii=False))
PYEOF
}

finalize() {
  local rc=$?
  # A dead run must not leave a stale non-terminal sidecar behind: refresh it
  # to the terminal infra truth (only if a sidecar was actually written).
  if [ "$RUN_OUTCOME" = "infra" ] && [ -f "$OUTDIR/$RUN_ID.provenance.json" ]; then
    write_sidecar infra "terminated: $RUN_CLASS (no usable capture)"
  fi
  ledger_append "$rc" || true
  # Knowledge-state transitions: ok runs advance researched/validated on the
  # sidecar. Non-ok runs never advance anything; the ledger is untouched.
  if [ "$RUN_OUTCOME" = "ok" ]; then
    record_transition researched "meta-pass.sh finalize"
    [ "${VALIDATOR_PASSED:-}" = "yes" ] && record_transition validated "meta-pass.sh finalize"
  fi
  exit "$rc"
}
# Signals: bash runs the EXIT trap with $? = 0 after SIGTERM/SIGINT, which
# would misrecord a kill as a clean exit. Catch them explicitly so the ledger
# records the termination truthfully (the EXIT trap still fires afterwards).
on_signal() {  # $1 = signal name
  trap - TERM INT
  RUN_OUTCOME="unknown"
  RUN_CLASS="terminated_by_signal_$1"
  # Kill attribution: snapshot the sender while the evidence is warm. The
  # 2026-09-13 21:04Z death had an unidentifiable SIGTERM sender; this line
  # distinguishes a harness-reaped process group from a worker-shell kill.
  # Best-effort: must never fail the trap or the ledger write.
  { echo "$(date -u +%FT%TZ) sig=$1 self=$$ ppid=$PPID ppcmd=$(tr '\0' ' ' < /proc/$PPID/cmdline 2>/dev/null)"
    ps -o pid,ppid,pgid,etime,cmd -g "$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')" 2>/dev/null
  } >> "$OUTDIR/$RUN_ID.signal.log" 2>/dev/null || true
  exit 143
}
trap 'on_signal TERM' TERM
trap 'on_signal INT' INT
trap finalize EXIT

# Provenance sidecar: the single machine-readable result-state record.
# Terminal states never leave verification/ping_ingestion as "pending":
# capture_failed -> verification failed, PING not_attempted; infra ->
# verification/ping_ingestion not_attempted. answer_captured stays pending
# (the outreach engine verifies later and updates the sidecar itself).
write_sidecar() {  # $1 = status, $2 = note
  local raw_name="$RUN_ID.md"
  [ -f "$LOCAL.CAPTURE_FAILED" ] && raw_name="$RUN_ID.md.CAPTURE_FAILED"
  local verification="pending" ping_ingestion="pending"
  case "$1" in
    capture_failed) verification="failed"; ping_ingestion="not_attempted" ;;
    infra) verification="not_attempted"; ping_ingestion="not_attempted" ;;
  esac
  # Atomic + durable write (2026-09-14): a mid-write SIGKILL must not leave a
  # torn sidecar. Write to temp then mv for atomicity. Durability: fsync the
  # temp file before the move (contents reach stable storage), then fsync the
  # directory after the move (the rename itself is durable) where supported.
  # Uses python3 (already a hard dependency of this script). A corrupted
  # sidecar is silently skipped by reconciliation; this prevents the
  # corruption and makes the boundary durable across host/power loss.
  # Invariant: once this function returns, the new sidecar has been handed to
  # the OS for durable persistence as far as filesystem semantics allow.
  local tmp_sidecar="$OUTDIR/$RUN_ID.provenance.json.tmp"
  cat > "$tmp_sidecar" <<EOF
{
  "brief_id": "$SLUG",
  "timestamp": "$TS",
  "research_agent": "meta-ai",
  "context_pack_version": "${PACKVER:-unknown}",
  "status": "$1",
  "raw_file": "$raw_name",
  "verification": "$verification",
  "ping_ingestion": "$ping_ingestion",
  "note": "$2"
}
EOF
  _SIDECAR_TMP="$tmp_sidecar" python3 -c \
    "import os; p=os.environ['_SIDECAR_TMP']; fd=os.open(p, os.O_RDWR); os.fsync(fd); os.close(fd)"
  mv -f "$tmp_sidecar" "$OUTDIR/$RUN_ID.provenance.json"
  _SIDECAR_DIR="$OUTDIR" python3 -c \
    "import os; d=os.open(os.environ['_SIDECAR_DIR'], os.O_DIRECTORY); os.fsync(d); os.close(d)" \
    2>/dev/null || true
}

# Knowledge-state transitions (2026-09-13): append-only "transitions" array on
# the sidecar. The four knowledge states are researched (answer captured) ->
# validated (validator passed) -> verified (human outreach-engine check via
# mark-verified.sh) -> accepted_by_ping (PING gateway emitted an event_id via
# emit-observation.py). researched/validated are recorded here in finalize();
# verified is human-gated; accepted_by_ping is emission-gated. The run ledger
# is never touched for transitions. Wrapped so it can never fail the run.
record_transition() {  # $1 = state, $2 = by
  local state="$1" by="$2" sidecar="$OUTDIR/$RUN_ID.provenance.json"
  [ -f "$sidecar" ] || return 0
  STATE="$state" BY="$by" SIDECAR="$sidecar" \
  python3 - <<'PYEOF' 2>/dev/null || true
import json, os, datetime
p = os.environ["SIDECAR"]
try:
    d = json.load(open(p, encoding="utf-8"))
except Exception:
    raise SystemExit(0)
tr = d.get("transitions")
if not isinstance(tr, list):
    tr = []
    d["transitions"] = tr
if all(not isinstance(t, dict) or t.get("state") != os.environ["STATE"] for t in tr):
    tr.append({"state": os.environ["STATE"],
               "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "by": os.environ["BY"]})
tmp = p + ".tmp"
json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
os.replace(tmp, p)
PYEOF
}

# Byte-exact pull of the remote answer file (no PowerShell re-encoding).
pull_raw() {
  pig_scp "$PIG:$REMOTE_ANS" /tmp/meta-raw-"$SLUG".bin >/dev/null 2>&1
}

# Fail closed: preserve the raw evidence, keep it OUT of the extraction
# pipeline via the .CAPTURE_FAILED suffix (same convention as .QUARANTINED),
# stamp the sidecar, exit 3. Never silently discard the run.
stamp_failed() {  # $1 = reason; $2 = classification (default capture_failed); $LOCAL must exist (evidence)
  RUN_OUTCOME=capture_failed
  RUN_CLASS="${2:-capture_failed}"
  mv -f "$LOCAL" "$LOCAL.CAPTURE_FAILED"
  write_sidecar capture_failed "$1"
  echo "CAPTURE_FAILED: $1"
  echo "evidence preserved: $RUN_ID.md.CAPTURE_FAILED (never enters extraction)"
  exit 3
}

# Infra exit: classify, then exit 2. The EXIT trap appends the ledger record.
infra_exit() {  # $1 = classification
  RUN_OUTCOME=infra
  RUN_CLASS="$1"
  echo "INFRA $1"
  exit 2
}

# 0. Objective/contract compatibility gate (2026-09-20 self-audit). A
# non-prospect-list objective must fail validation before dispatch when
# paired with the business-list OUTPUT CONTRACT. Refuses to dispatch (no
# Pig call, no rotation advance; ledger records infra) until the prompt
# owner resolves one side explicitly.
python3 ~/workspace/tandem/check-objective-contract.py "$SLUG" \
  || infra_exit objective_contract_incompatible

# 0b. Geography-contract gate (2026-09-21 self-audit). A brief whose
# objective names out-of-zone towns in an inclusion context (stale
# priority-town list contradicting AGENTS.md) must fail validation before
# dispatch. next-brief.py skips such briefs; this is the backstop for
# direct invocations.
python3 ~/workspace/tandem/check-geography-contract.py "$SLUG" \
  || infra_exit geography_contract_incompatible

# 1. Retrieve authoritative context, build the versioned pack (never from memory).
# NOTE: capture stdout and stderr separately. Merging with 2>&1 is broken:
# stderr is unbuffered, stdout is block-buffered when piped, so the version
# line arrives first and corrupts PACKFILE. Never rewrite this script while
# a bash process is executing it (bash parses incrementally; a mid-flight
# replace corrupts the running copy).
PACKFILE=$(python3 ~/workspace/tandem/build-context-pack.py "$SLUG" 2>/tmp/meta-packver-"$SLUG".txt)
PACKVER=$(grep PACK_VERSION /tmp/meta-packver-"$SLUG".txt | cut -d= -f2)
[ ! -f "$PACKFILE" ] && infra_exit pack_build_failed
[ -z "$PACKVER" ] && infra_exit pack_build_failed

# 2. research.ask prompt contract (deterministic assembly, not prompt prose).
# Three sections, fixed order, named delimiters:
#   OBJECTIVE — the brief verbatim, first. Plus a structural dependency
#     declaration: briefs say "the geography above"; under task-first ordering
#     that reference dangles, so the pack sections it binds to are named here.
#   CONTEXT — the versioned pack verbatim, second, inside a labeled boundary.
#     The pack smuggles contract directives (## Verification rules,
#     ## Output schema); those are a second output authority and are NOT
#     authoritative in this contract.
#   OUTPUT CONTRACT — third and authoritative. The validator's own constants
#     (extracted below so the numbers cannot drift) in Meta-actionable terms.
#     On conflict with any CONTEXT directive, this section wins. The validator
#     floor is the only enforceable number; the briefs' "Find 12/10" counts
#     are aspiration.
# Trace basis: run 20260913-125900 (pack-first) -> Meta answered the pack,
# 0 numbered items, exit 3. Run 20260913-191216 (task-first) -> Meta answered
# the task, 32 numbered items, exit 0.
SEC_OBJECTIVE="================ OBJECTIVE ================"
SEC_CONTEXT="================ CONTEXT ================"
SEC_CONTRACT="================ OUTPUT CONTRACT ================"
VMIN_ITEMS=$(sed -n 's/^MIN_NUMBERED_ITEMS *= *\([0-9][0-9]*\).*/\1/p' ~/workspace/tandem/validate-meta-answer.py)
VMIN_CHARS=$(sed -n 's/^MIN_ANSWER_CHARS *= *\([0-9][0-9]*\).*/\1/p' ~/workspace/tandem/validate-meta-answer.py)
[ -n "$VMIN_ITEMS" ] && [ -n "$VMIN_CHARS" ] || infra_exit validator_constants_unreadable
FULLPROMPT=/tmp/meta-fullprompt-"$SLUG".txt
{
  echo "$SEC_OBJECTIVE"
  echo "Answer ONLY this objective. Do not summarize or confirm anything else."
  echo ""
  cat ~/workspace/tandem/prompts/"$SLUG".md
  echo ""
  echo "Dependency: where this objective says \"the geography above\" or names"
  echo "a target segment, it binds to the GEOGRAPHY (strict priority) and"
  echo "TARGET sections of the CONTEXT below."
  echo ""
  echo "$SEC_CONTEXT"
  echo "Reference material for the objective. Use it; do not respond to it."
  echo ""
  cat "$PACKFILE"
  echo ""
  echo "$SEC_CONTRACT"
  echo "Authoritative. Overrides any conflicting output instructions in CONTEXT."
  echo "1. Reply with a numbered list of at least $VMIN_ITEMS real businesses."
  echo "   Entries look like: 1. Business Name - Town - Trade"
  echo "   (Aim for the count the objective requests; $VMIN_ITEMS valid entries"
  echo "   is the hard minimum.)"
  echo "2. Your own findings must exceed $VMIN_CHARS characters."
  echo "3. Never invent a business. List only businesses you verified exist"
  echo "   right now, and say how you verified each one."
  echo "4. End with 2-3 sentences on what you could NOT verify."
  # Per-brief machine contract (2026-09-15): rendered from the same JSON file
  # that drives the artifact validator, so the prompt and the checks cannot
  # drift. Authoritative for this brief's output shape.
  if [ -f ~/workspace/tandem/contracts/"$SLUG".json ]; then
    echo ""
    python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['prompt_block'])" \
      ~/workspace/tandem/contracts/"$SLUG".json
    echo ""
  fi
  echo "This research is UNVERIFIED external research, not established fact."
} > "$FULLPROMPT"
write_sidecar requested "prompt built (pack $PACKVER), awaiting CDP preflight"

# Browser mutual-exclusion (2026-09-21, FL-20260921-016): meta-ask.js drives
# the fb-profile Chrome (:9223), shared with the FB engagement and unfollow
# workers. Acquire the profile lock just before the browser pre-flight (the
# context-pack build above is local work and stays unlocked); on contention
# fail closed via the standard infra path.
source ~/workspace/pig-fb/browser-lock.sh
browser_lock_acquire fb "meta-pass.sh" || infra_exit browser_locked

# Pre-flight: headed Chrome/CDP substrate must be up before delegating.
# Uses the existing PigiFBLogin recovery task; no duplicate launcher.
~/workspace/pig-fb/ensure-cdp.sh >/dev/null 2>&1 || infra_exit cdp_down_after_relaunch
write_sidecar started "delegating to Meta AI on the Pig"

# 3. Delegate to Meta AI via the Pig's logged-in Chrome.
pig_scp ~/workspace/pig-fb/meta-ask.js "$FULLPROMPT" "$PIG:$REMOTE_DIR/" >/dev/null 2>&1 \
  || infra_exit scp_failed
REMOTE_ANS="$REMOTE_DIR/meta-answer-$SLUG.txt"
# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the meta-ask.js run. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "meta-pass.sh"
# Sanitize the run id for the PowerShell single-quoted lease record.
WAKE_RUN_ID=$(printf '%s' "meta-$RUN_ID" | tr -cd 'A-Za-z0-9_-')
META_REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "$WAKE_RUN_ID" "Meta AI research pass ($SLUG)")
\$c = 0
& 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' '$REMOTE_DIR/meta-ask.js' '$REMOTE_DIR/meta-fullprompt-$SLUG.txt' '$REMOTE_ANS'
\$c = \$LASTEXITCODE
$(wake_ps_release "$WAKE_RUN_ID")
exit \$c
EOF
)
META_B64=$(printf '%s' "$META_REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
# Tee the worker's stdout: the LOCATOR line (fallback-ladder rung telemetry)
# is parsed into the ledger; everything else still reaches the cron log.
# (Wake telemetry goes to the remote stderr, so the LOCATOR parse is unaffected.)
pig_ssh_wake "$META_B64" 2>&1 | tee /tmp/meta-ask-out-"$SLUG".txt
RC=${PIPESTATUS[0]}
LOCATOR_ID=$(sed -n 's/^LOCATOR //p' /tmp/meta-ask-out-"$SLUG".txt | head -1)
if [ $RC -eq 3 ]; then
  # Worker saved a raw capture but reported ANSWER_INCOMPLETE. Preserve it,
  # fail closed; do not let a prompt-only file enter the pipeline.
  if pull_raw; then
    python3 ~/workspace/tandem/validate-meta-answer.py \
      /tmp/meta-raw-"$SLUG".bin "$LOCAL" "$SLUG" "$TS" >/dev/null 2>&1 \
      && echo "note: validator passed on re-pull despite worker exit 3; still failing closed"
  fi
  [ -f "$LOCAL" ] || echo "# worker reported ANSWER_INCOMPLETE; evidence pull also failed; remote original at $REMOTE_ANS (overwritten by next run of this slug)" > "$LOCAL"
  stamp_failed "meta-ask.js reported ANSWER_INCOMPLETE (no streamed answer beyond the prompt echo)" answer_incomplete
fi
[ $RC -ne 0 ] && { RUN_OUTCOME=infra; RUN_CLASS="worker_failed rc=$RC"; echo "INFRA worker_failed rc=$RC"; exit 2; }

# 4. Pull the raw answer bytes directly with scp (byte-preserving), then run
# the presence validation: decode by BOM only, strict UTF-8 that fails loudly
# instead of guessing (the old Get-Content path plus the "try utf-16 first"
# heuristic silently corrupted every even-length UTF-8 answer into CJK
# mojibake for slugs A and C on 2026-09-13).
pull_raw || infra_exit pull_failed
# 4a. Throttle-phrase scan on the raw answer bytes (added 2026-09-13):
# Meta-side throttling or flagging almost always announces itself in text
# ("try again later", CAPTCHA, "verify you are human"...). Scan the pulled
# bytes case-insensitively; on any match, fail CLOSED for human review
# instead of treating the output as normal research.
THROTTLE_HIT=$(grep -a -i -m1 -o -E "try again later|slow down|rate limit|captcha|verify you are human|unusual activity|temporarily unavailable" /tmp/meta-raw-"$SLUG".bin 2>/dev/null || true)
[ -n "$THROTTLE_HIT" ] && stamp_failed "throttle signal detected in Meta AI answer text: '$THROTTLE_HIT' (possible rate limit, CAPTCHA, or account challenge; held for human review, not ingested)" throttle_signal
VOUT=$(python3 ~/workspace/tandem/validate-meta-answer.py \
  /tmp/meta-raw-"$SLUG".bin "$LOCAL" "$SLUG" "$TS" 2>&1)
VRC=$?
echo "$VOUT"
VALIDATOR_CHARS=$(printf '%s' "$VOUT" | grep -o 'answer chars: [0-9]*' | grep -o '[0-9]*' | head -1)
VALIDATOR_ITEMS=$(printf '%s' "$VOUT" | grep -o 'numbered items: [0-9]*' | grep -o '[0-9]*' | head -1)
[ $VRC -eq 3 ] && stamp_failed "answer presence validation failed: prompt-only/empty/malformed capture (no numbered business list)" validation_rejected
[ $VRC -ne 0 ] && { RUN_OUTCOME=infra; RUN_CLASS="validation_error rc=$VRC"; echo "INFRA validation_error rc=$VRC"; exit 2; }
VALIDATOR_PASSED=yes  # validator exit-0 path; finalize() records the validated transition

# 4b. Research-contract validation (2026-09-15): briefs with a machine-checkable
# contract get their artifact mechanically validated: required fields, geography
# and trade from the run's own declared pack sections, problem-category
# vocabulary, cited 1-3 star reviews, 90-day recency, per-candidate
# classification from the fixed taxonomy, deterministic dedup against the
# canonical JSONL plus the brief-aware negative list, uncertainty statement,
# UNVERIFIED marking. Rejection fails closed exactly like any other validation
# failure: evidence preserved, the artifact never enters extraction, and the
# brief rotation does not advance.
if [ -f ~/workspace/tandem/contracts/"$SLUG".json ]; then
  CREPORT="$OUTDIR/$RUN_ID.contract-report.json"
  COUT=$(python3 ~/workspace/tandem/validate-research-contract.py \
    "$LOCAL" --contract ~/workspace/tandem/contracts/"$SLUG".json \
    --pack "$PACKFILE" --run-date "$TS" \
    --jsonl ~/workspace/your_files/western-co-prospects.jsonl \
    --report "$CREPORT" 2>&1)
  CRC=$?
  echo "$COUT"
  [ $CRC -eq 3 ] && stamp_failed "research contract validation failed: $(printf '%s' "$COUT" | grep -E '^(contract|hard violations)' | tr '\n' '; ')" contract_rejected
  [ $CRC -ne 0 ] && { RUN_OUTCOME=infra; RUN_CLASS="contract_validator_error rc=$CRC"; echo "INFRA contract_validator_error rc=$CRC"; exit 2; }
fi

# 5. Provenance sidecar: UNVERIFIED external research, answer presence validated.
write_sidecar answer_captured "raw answer captured and presence-validated; awaiting outreach-engine verification"
echo "SAVED $LOCAL pack=$PACKVER"
RUN_OUTCOME=ok
RUN_CLASS=answer_captured

# 6. Retention hygiene (Step 2): sweep Pig-side transfer buffers older than 7d.
# Runs in the same session that created them; never fails the pass.
"$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
