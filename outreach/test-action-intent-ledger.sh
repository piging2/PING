#!/bin/bash
# Crash-proof fixture harness for the action-intent ledger (2026-09-14,
# updated for Nolan's lifecycle states:
# ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION,
# terminals EXECUTED / FAILED / UNKNOWN_EXECUTION / NOT_ATTEMPTED).
#
# Proves the real crash boundary: a REAL worker subprocess is SIGKILLed
# mid-flight, then next-pass selection runs as a GENUINELY NEW process
# (new PID, new process group, no shared memory; the ledger file is the
# only state) and UNKNOWN_EXECUTION blocks re-execution of every external
# commitment type (like, comment, post, dm, email).
#
# Uses fixture data only, sandbox engagement-log copies, and a sandbox
# ledger. Never touches the production ledger and never runs live
# engagement. Re-runnable.
set -u
L=~/workspace/outreach/action-intent-ledger.py
G=~/workspace/outreach/engagement-guard.py
SB="/tmp/intent-crash-v2-$$"
mkdir -p "$SB"
export ENGAGEMENT_INTENT_LEDGER="$SB/ledger.jsonl"
export ENGAGEMENT_GUARD_DIR="$SB"
: > "$SB/facebook-engagement.md"
: > "$SB/instagram-engagement.md"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok   - $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL - $1"; }
expect_eq() { # name actual expected
  if [ "$2" = "$3" ]; then ok "$1 (= $2)"; else bad "$1 (got $2, want $3)"; fi
}

# ---- fixture candidates: 5 external commitments of different types ----
cat > "$SB/cands.json" <<'EOF'
{"candidates": [
  {"account":"@fixtureplumbingco","url":"https://www.instagram.com/p/FIXTURE0001/","action":"like"},
  {"account":"@fixturehvacpros","url":"https://www.instagram.com/p/FIXTURE0002/","action":"comment"},
  {"account":"@fixtureelectrical","url":"https://www.instagram.com/p/FIXTURE0003/","action":"post"},
  {"account":"@fixtureroofingllc","url":"https://www.instagram.com/fixtureroofingllc/","action":"dm"},
  {"account":"@fixturegarage","url":"https://example.invalid/quote","action":"email"}
]}
EOF
A=ig-crash-A

echo "== A: write-intents -> ACTION_INTENT_DURABLE =="
W=$($L write-intents --platform instagram --in "$SB/cands.json" --pass-id "$A")
[ "$(echo "$W" | python3 -c "import json,sys;print(json.load(sys.stdin)['written'])")" = "5" ] && [ -n "$W" ] \
  && ok "write-intents wrote 5 intents" || bad "write-intents: $W"

echo "== B: mark-execution -> EXECUTION (before delivery) =="
M=$($L mark-execution --platform instagram --pass-id "$A")
[ "$(echo "$M" | python3 -c "import json,sys;print(json.load(sys.stdin)['marked_execution'])")" = "5" ] \
  && ok "mark-execution marked 5" || bad "mark-execution: $M"

echo "== C: REAL worker subprocess, SIGKILL mid-flight =="
python3 - "$SB" > /dev/null <<'PYEOF'
import json, sys
sb = sys.argv[1]
cands = json.load(open(sb + "/cands.json"))["candidates"]
json.dump({"actions": cands}, open(sb + "/worker-job.json", "w"))
PYEOF
setsid python3 ~/workspace/outreach/fake_worker.py --job "$SB/worker-job.json" \
  --heartbeat "$SB/heartbeat.jsonl" --result "$SB/worker-result.json" --delay 6 \
  < /dev/null > /dev/null 2>&1 &
WPID=$!
# wait until the worker has STARTED action 2 (mid-flight), then SIGKILL
STARTED2=""
for i in $(seq 1 40); do
  sleep 1
  STARTED2=$(grep -c '"event": "started"' "$SB/heartbeat.jsonl" 2>/dev/null || true)
  [ "${STARTED2:-0}" -ge 2 ] && break
done
kill -9 "$WPID" 2>/dev/null
wait "$WPID" 2>/dev/null
sleep 1
if kill -0 "$WPID" 2>/dev/null; then bad "worker still alive after SIGKILL"; else ok "worker SIGKILLed (pid $WPID dead)"; fi
HB2=$(grep -c '"event": "started"' "$SB/heartbeat.jsonl" 2>/dev/null || true)
expect_eq "heartbeat shows 2 actions started when killed" "${HB2:-0}" "2"
# worker's partial result: action 1 outcome written, action 2 outcome missing
R1=$(python3 -c "import json;r=json.load(open('$SB/worker-result.json'));print(len(r['results']), r['complete'])" 2>/dev/null || echo MISSING)
[ "$R1" = "1 False" ] && ok "partial result: 1 outcome, complete=false" || bad "partial result: $R1"
# The observer died with the worker: record-outcomes is NEVER run here.

echo "== D: REAL RESTART - next-pass selection as a genuinely new process =="
# New PID, new process group (setsid), fresh env carrying only the sandbox
# overrides. No shared memory with the dead worker or this harness: the
# ledger file is the only state the new process can see.
setsid bash -c '
  export ENGAGEMENT_INTENT_LEDGER="'"$SB"'/ledger.jsonl"
  export ENGAGEMENT_GUARD_DIR="'"$SB"'"
  echo "next-pass selector pid: $BASHPID"
  '"$L"' refuse --platform instagram --in "'"$SB"'/cands.json" --out "'"$SB"'/elig-B.json" --pass-id ig-crash-B > "'"$SB"'/refuse-B.json"
' > "$SB/selector-pid.txt" 2>&1
cat "$SB/selector-pid.txt"
ELB=$(python3 -c "import json;r=json.load(open('$SB/refuse-B.json'));print(r['eligible'], len(r['refused']))")
expect_eq "next pass (new process): eligible=0 refused=5" "$ELB" "0 5"
STATES=$(python3 -c "
import json
r=json.load(open('$SB/refuse-B.json'))
print(' '.join(sorted(set(x['state'] for x in r['refused']))))")
expect_eq "every refusal is UNKNOWN_EXECUTION" "$STATES" "UNKNOWN_EXECUTION"
ACTS=$(python3 -c "
import json
r=json.load(open('$SB/refuse-B.json'))
print(' '.join(sorted(set(x['action'] for x in r['refused']))))")
expect_eq "no commitment type silently retried" "$ACTS" "comment dm email like post"
REASONS_OK=$(python3 -c "
import json
r=json.load(open('$SB/refuse-B.json'))
print(all('UNKNOWN_EXECUTION' in x['reason'] and x['intent_id'] and x['intent_ts'] and 'will not auto-retry' in x['reason'].lower() or 'Will not auto-retry' in x['reason'] for x in r['refused']))")
expect_eq "refusals truthful (state, intent id, ts, no-auto-retry)" "$REASONS_OK" "True"

echo "== E: same-pass restart (new process, same pass_id) is NOT blocked =="
setsid bash -c '
  export ENGAGEMENT_INTENT_LEDGER="'"$SB"'/ledger.jsonl"
  export ENGAGEMENT_GUARD_DIR="'"$SB"'"
  '"$L"' refuse --platform instagram --in "'"$SB"'/cands.json" --out "'"$SB"'/elig-A.json" --pass-id "'"$A"'" > "'"$SB"'/refuse-A.json"
' >/dev/null 2>&1
ELA=$(python3 -c "import json;r=json.load(open('$SB/refuse-A.json'));print(r['eligible'])")
expect_eq "same-pass restart: in-flight intents not blocked" "$ELA" "5"

echo "== F: list-unknown shows the reconciliation inbox =="
LU=$(setsid bash -c '
  export ENGAGEMENT_INTENT_LEDGER="'"$SB"'/ledger.jsonl"
  '"$L"' list-unknown --platform instagram' 2>/dev/null)
LUS=$(echo "$LU" | python3 -c "
import json,sys
r=json.load(sys.stdin)
print(r['open'], ' '.join(sorted(set(x['state'] for x in r['intents']))))")
expect_eq "list-unknown: 5 open, all UNKNOWN_EXECUTION" "$LUS" "5 UNKNOWN_EXECUTION"

echo "== G: deliberate recovery from the worker's partial result =="
# The reconciler deliberately inspects the recovered partial result file and
# records action 1's observed outcome. This is a human/agent act, never
# automatic.
RO=$($L record-outcomes --platform instagram --pass-id "$A" --result-json "$SB/worker-result.json")
[ "$(echo "$RO" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['observed'], r['left_open'])")" = "1 4" ] \
  && ok "record-outcomes closed action 1 as observed, left 4 open" || bad "record-outcomes: $RO"
CK1=$($L check --platform instagram --account "@fixtureplumbingco")
T1=$(echo "$CK1" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'])")
expect_eq "action 1 terminal after recovery" "$T1" "EXECUTED"
# guard-record it in the sandbox log, then finalize -> FINALIZATION/EXECUTED
$G record --platform instagram --account "@fixtureplumbingco" \
  --url "https://www.instagram.com/p/FIXTURE0001/" --action like >/dev/null
FN=$($L finalize --pass-id "$A" --record-ref "sandbox guard log")
[ "$(echo "$FN" | python3 -c "import json,sys;print(json.load(sys.stdin)['finalized'])")" = "1" ] \
  && ok "finalize closed action 1" || bad "finalize: $FN"
CKF=$($L check --platform instagram --account "@fixtureplumbingco")
SF=$(echo "$CKF" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['stage'], r['intents'][0]['terminal'])")
expect_eq "action 1 stage/terminal after finalize" "$SF" "FINALIZATION EXECUTED"
GB=$($G check --platform instagram --account "@fixtureplumbingco" \
  --url "https://www.instagram.com/p/FIXTURE0001/" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
expect_eq "guard now reports ALREADY_ENGAGED" "$GB" "ALREADY_ENGAGED"

echo "== H: reconcile actions never started as NOT_ATTEMPTED =="
# Snapshot for the append-only proof: every byte present before
# reconciliation must survive it byte-identical.
cp "$SB/ledger.jsonl" "$SB/ledger-pre-reconcile.jsonl"
# Heartbeat evidence: actions 3 (post) and 4 (dm) never started.
I3=$(python3 -c "
import json
recs=[json.loads(l) for l in open('$SB/ledger.jsonl')]
i=[r['intent_id'] for r in recs if r.get('record_type')=='intent' and r.get('account')=='@fixtureelectrical'][0]
print(i)")
I4=$(python3 -c "
import json
recs=[json.loads(l) for l in open('$SB/ledger.jsonl')]
i=[r['intent_id'] for r in recs if r.get('record_type')=='intent' and r.get('account')=='@fixtureroofingllc'][0]
print(i)")
$L reconcile --intent-id "$I3" --outcome NOT_ATTEMPTED \
  --reason "worker heartbeat shows the post action never started; killed during action 2" \
  --evidence "heartbeat.jsonl has started events only for actions 1 and 2" \
  --resolved-by fixture-harness >/dev/null
$L reconcile --intent-id "$I4" --outcome NOT_ATTEMPTED \
  --reason "worker heartbeat shows the dm action never started; killed during action 2" \
  --evidence "heartbeat.jsonl has started events only for actions 1 and 2" \
  --resolved-by fixture-harness >/dev/null
CK34=$($L check --platform instagram --account "@fixtureelectrical")
T34=$(echo "$CK34" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'], r['intents'][0]['provenance'])")
expect_eq "action 3 terminal/provenance" "$T34" "NOT_ATTEMPTED reconciliation"
echo "== H2: mid-flight action 2 and unverified action 5 stay blocked =="
setsid bash -c '
  export ENGAGEMENT_INTENT_LEDGER="'"$SB"'/ledger.jsonl"
  export ENGAGEMENT_GUARD_DIR="'"$SB"'"
  '"$L"' refuse --platform instagram --in "'"$SB"'/cands.json" --out "'"$SB"'/elig-C.json" --pass-id ig-crash-C > "'"$SB"'/refuse-C.json"
' >/dev/null 2>&1
ELC=$(python3 -c "
import json
r=json.load(open('$SB/refuse-C.json'))
elig=json.load(open('$SB/elig-C.json'))['candidates']
acts=sorted(c['action'] for c in elig)
refacts=sorted(set(x['action'] for x in r['refused']))
print(r['eligible'], '|'.join(acts), '|'.join(refacts))")
# eligible: action 1 (EXECUTED/finalized; ledger-eligible but guard-blocked)
# plus the reconciled post + dm. refused: the two UNKNOWN_EXECUTIONs.
expect_eq "post-reconcile: eligible={dm,like,post} refused={comment,email} unknown" "$ELC" "3 dm|like|post comment|email"
# eligible is 3 because action 1 (EXECUTED/finalized) is ledger-eligible but
# guard-blocked; verify that separately.
[ "$(echo "$ELC" | cut -d' ' -f1)" = "3" ] && ok "ledger-eligible count is 3 (action 1 needs the guard, checked next)" || bad "eligible count"
GB1=$($G check --platform instagram --account "@fixtureplumbingco" --url "https://www.instagram.com/p/FIXTURE0001/" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
expect_eq "action 1 still guard-blocked after recovery" "$GB1" "ALREADY_ENGAGED"

echo "== I: FB-shaped worker results -> EXECUTED / FAILED / NOT_ATTEMPTED =="
cat > "$SB/fbjob.json" <<'EOF'
{"actions": [
  {"page":"Fixture Plumbing FB","url":"https://www.facebook.com/fixtureplumbing/posts/111/","type":"like"},
  {"page":"Fixture HVAC FB","url":"https://www.facebook.com/fixturehvac/posts/222/","type":"comment"}
]}
EOF
$L write-intents --platform facebook --fb-job --in "$SB/fbjob.json" --pass-id fb-x >/dev/null
$L mark-execution --platform facebook --pass-id fb-x >/dev/null
cat > "$SB/fbresult.json" <<'EOF'
{"ok":true,"results":[
  {"type":"like","url":"https://www.facebook.com/fixtureplumbing/posts/111/","ok":true,"note":"verified: Unlike now visible"},
  {"type":"comment","url":"https://www.facebook.com/fixturehvac/posts/222/","ok":false,"note":"comment box not found"}
]}
EOF
$L record-outcomes --platform facebook --pass-id fb-x --result-json "$SB/fbresult.json" >/dev/null
TFB=$($L check --platform facebook --account "Fixture Plumbing FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'])")
expect_eq "fb like ok=true -> EXECUTED" "$TFB" "EXECUTED"
TFB2=$($L check --platform facebook --account "Fixture HVAC FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'])")
expect_eq "fb comment ok=false -> FAILED" "$TFB2" "FAILED"
# logged-out worker result -> NOT_ATTEMPTED
cat > "$SB/fbjob2.json" <<'EOF'
{"actions": [{"page":"Fixture Roof FB","url":"https://www.facebook.com/fixtureroof/posts/333/","type":"like"}]}
EOF
$L write-intents --platform facebook --fb-job --in "$SB/fbjob2.json" --pass-id fb-y >/dev/null
$L mark-execution --platform facebook --pass-id fb-y >/dev/null
echo '{"ok":false,"logged_in":false,"results":[]}' > "$SB/fbresult-loggedout.json"
$L record-outcomes --platform facebook --pass-id fb-y --result-json "$SB/fbresult-loggedout.json" >/dev/null
TFB3=$($L check --platform facebook --account "Fixture Roof FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'])")
expect_eq "logged-out worker -> NOT_ATTEMPTED" "$TFB3" "NOT_ATTEMPTED"
# explicit --not-attempted path (pre-flight failure shape)
cat > "$SB/fbjob3.json" <<'EOF'
{"actions": [{"page":"Fixture Door FB","url":"https://www.facebook.com/fixturedoor/posts/444/","type":"like"}]}
EOF
$L write-intents --platform facebook --fb-job --in "$SB/fbjob3.json" --pass-id fb-z >/dev/null
$L mark-execution --platform facebook --pass-id fb-z >/dev/null
$L record-outcomes --platform facebook --pass-id fb-z --not-attempted \
  --reason "fixture: CDP down after relaunch" --evidence "fixture pre-flight" >/dev/null
TFB4=$($L check --platform facebook --account "Fixture Door FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['terminal'])")
expect_eq "--not-attempted -> NOT_ATTEMPTED" "$TFB4" "NOT_ATTEMPTED"
# worker timeout with no report -> stays open (UNKNOWN_EXECUTION)
cat > "$SB/fbjob4.json" <<'EOF'
{"actions": [{"page":"Fixture Fence FB","url":"https://www.facebook.com/fixturefence/posts/555/","type":"like"}]}
EOF
$L write-intents --platform facebook --fb-job --in "$SB/fbjob4.json" --pass-id fb-w >/dev/null
$L mark-execution --platform facebook --pass-id fb-w >/dev/null
echo '{"ok":false,"infra":"worker_timeout","results":[],"note":"worker_timeout"}' > "$SB/fbresult-timeout.json"
$L record-outcomes --platform facebook --pass-id fb-w --result-json "$SB/fbresult-timeout.json" >/dev/null
TFB5=$($L check --platform facebook --account "Fixture Fence FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['state'])")
expect_eq "timeout with no report -> UNKNOWN_EXECUTION" "$TFB5" "UNKNOWN_EXECUTION"

echo "== J: reconciliation is deliberate: guards hold =="
if $L reconcile --intent-id deadbeef --outcome NOT_ATTEMPTED --reason r --evidence e --resolved-by t >/dev/null 2>&1; then bad "reconcile unknown id accepted"; else ok "reconcile unknown id refused"; fi
if $L reconcile --intent-id "$I3" --outcome NOT_ATTEMPTED --reason r --evidence e --resolved-by t >/dev/null 2>&1; then bad "double reconcile accepted"; else ok "double reconcile refused"; fi
I2=$(python3 -c "
import json
recs=[json.loads(l) for l in open('$SB/ledger.jsonl')]
i=[r['intent_id'] for r in recs if r.get('record_type')=='intent' and r.get('account')=='@fixturegarage'][0]
print(i)")
if $L reconcile --intent-id "$I2" --outcome EXECUTED --reason r --evidence e --resolved-by t >/dev/null 2>&1; then bad "EXECUTED without --history-recorded accepted"; else ok "EXECUTED without --history-recorded refused"; fi
if $L reconcile --intent-id "$I2" --outcome NOT_ATTEMPTED --reason "" --evidence e --resolved-by t >/dev/null 2>&1; then bad "empty reason accepted"; else ok "empty reason refused"; fi
if $L record-outcomes --platform instagram --pass-id "$A" --not-attempted >/dev/null 2>&1; then bad "--not-attempted without --reason accepted"; else ok "--not-attempted requires --reason"; fi
if $L write-intents --platform instagram --in <(echo '{"candidates":[{"account":"@x","url":"u","action":"teleport"}]}') --pass-id ig-bad >/dev/null 2>&1; then bad "unknown action accepted"; else ok "unknown action refused at write-intents"; fi

echo "== M: run_pass.sh wiring rehearsal (fake CDP-down) =="
# Verifies the wrapper's new mark-execution + record_not_attempted flow with
# a stubbed-out Pig (no SSH, no browser). Production files untouched.
# Runs BEFORE the ledger-corruption test so the ledger is still readable.
mkdir -p "$SB/pigfb"
cp ~/workspace/pig-fb/run_pass.sh "$SB/pigfb/run_pass.sh"
cat > "$SB/pigfb/pig-ssh.sh" <<'EOF'
PIG="fake-pig"
pig_ssh() { return 1; }
pig_scp() { return 1; }
EOF
cat > "$SB/pigfb/ensure-cdp.sh" <<'EOF'
#!/bin/bash
exit 1
EOF
chmod +x "$SB/pigfb/ensure-cdp.sh"
cat > "$SB/pigfb/pig-retention.sh" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$SB/pigfb/pig-retention.sh"
cat > "$SB/pigfb/job.json" <<'EOF'
{"actions": [{"page":"Fixture Rehearsal FB","url":"https://www.facebook.com/fixturerehearsal/posts/999/","type":"like"}]}
EOF
OUT_M=$("$SB/pigfb/run_pass.sh" "$SB/pigfb/job.json" 2>"$SB/pigfb/stderr.txt")
[ "$OUT_M" = '{"ok":false,"infra":"cdp_down_after_relaunch"}' ] \
  && ok "CDP-down rehearsal: wrapper emits the result JSON contract" || bad "rehearsal stdout: $OUT_M"
TM=$($L check --platform facebook --account "Fixture Rehearsal FB" | python3 -c "import json,sys;r=json.load(sys.stdin);print(r['intents'][0]['stage'], r['intents'][0]['terminal'])")
expect_eq "CDP-down rehearsal: intent OBSERVATION/NOT_ATTEMPTED" "$TM" "OBSERVATION NOT_ATTEMPTED"
[ -s "$SB/ledger.jsonl" ] && ok "rehearsal used the sandbox ledger" || bad "rehearsal ledger"

echo "== K: corrupt ledger fails closed =="
cp "$SB/ledger.jsonl" "$SB/ledger-pre-corrupt.jsonl"
echo '{"record_type": "intent", BROKEN' >> "$SB/ledger.jsonl"
if $L refuse --platform instagram --in "$SB/cands.json" --out "$SB/elig-bad.json" --pass-id ig-bad >/tmp/refuse-bad.out 2>&1; then bad "corrupt ledger: refuse succeeded"; else
  [ "$?" = "3" ] && ok "corrupt ledger: refuse exits 3" || bad "corrupt ledger: wrong exit $?"
fi
[ -s "$SB/elig-bad.json" ] && bad "corrupt ledger: eligible output written" || ok "corrupt ledger: no eligible output"
python3 -c "
import json
recs=[json.loads(l) for l in open('$SB/ledger-pre-corrupt.jsonl')]
print(len(recs))" >/dev/null && ok "pre-corruption ledger parses"

echo "== L: append-only: reconciliation never mutates prior lines =="
# Byte-prefix proof: the pre-reconciliation snapshot must be an exact
# byte-prefix of the pre-corruption ledger. Reconciliation only appended.
python3 - "$SB" <<'PYEOF'
import json, sys
sb = sys.argv[1]
pre = open(sb + "/ledger-pre-reconcile.jsonl", "rb").read()
full = open(sb + "/ledger-pre-corrupt.jsonl", "rb").read()
assert full.startswith(pre), "pre-reconciliation bytes were mutated"
added = [l for l in full[len(pre):].decode("utf-8").splitlines() if l.strip()]
kinds = [json.loads(l).get("record_type") for l in added]
assert kinds, "expected appended records"
assert set(kinds) <= {"reconciliation", "intent", "execution", "observation", "finalize"}, kinds
n_rec = sum(1 for k in kinds if k == "reconciliation")
assert n_rec == 2, "expected 2 reconciliations, got %d" % n_rec
print("append-only holds: %d pre-reconciliation bytes intact, %d reconciliation records appended" % (len(pre), n_rec))
PYEOF
[ "$?" = "0" ] && ok "reconciliation appended, never mutated" || bad "append-only check"

echo ""
echo "PASS=$PASS FAIL=$FAIL"
echo "sandbox: $SB"
[ "$FAIL" -eq 0 ]
