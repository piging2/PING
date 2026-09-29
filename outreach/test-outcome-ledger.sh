#!/bin/bash
# Outcome-loop fixture harness for the action-intent ledger (Interval 08,
# 2026-09-29). Proves the P0 outcome loop on fixture data only:
#   INTENT -> AUTHORIZATION -> ATTEMPT -> RESULT -> VERIFIED EFFECT ->
#   OUTCOME -> CANDIDATE LEARNING
# with the hard distinctions intact (RESULT != EFFECT != OUTCOME) and the
# learning law enforced (no promote path; CANDIDATE never auto-promotes).
#
# Uses a sandbox ledger via ENGAGEMENT_INTENT_LEDGER. Never touches the
# production ledger and never runs live engagement. Re-runnable.
set -u
L=~/workspace/outreach/action-intent-ledger.py
SB="/tmp/outcome-ledger-test-$$"
mkdir -p "$SB"
export ENGAGEMENT_INTENT_LEDGER="$SB/ledger.jsonl"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok   - $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL - $1"; }
expect_eq() { # name actual expected
  if [ "$2" = "$3" ]; then ok "$1 (= $2)"; else bad "$1 (got $2, want $3)"; fi
}

# ---- fixture: 2 actions, one EXECUTED one FAILED ----
cat > "$SB/cands.json" <<'EOF'
{"candidates": [
  {"account":"@fixture-biz-a","url":"https://example.invalid/post/A","action":"comment"},
  {"account":"@fixture-biz-b","url":"https://example.invalid/post/B","action":"comment"}
]}
EOF
$L write-intents --platform facebook --in "$SB/cands.json" --pass-id fix-pass-1 >/dev/null
$L mark-execution --platform facebook --pass-id fix-pass-1 >/dev/null
cat > "$SB/result.json" <<'EOF'
{"results": [
  {"type":"comment","url":"https://example.invalid/post/A","ok":true,"note":"comment text visible"},
  {"type":"comment","url":"https://example.invalid/post/B","ok":false,"note":"checkpoint"}
]}
EOF
$L record-outcomes --platform facebook --pass-id fix-pass-1 --result-json "$SB/result.json" >/dev/null
IID_A=$(python3 -c "
import json
for line in open('$SB/ledger.jsonl'):
    r=json.loads(line)
    if r.get('record_type')=='intent' and r.get('url')=='https://example.invalid/post/A':
        print(r['intent_id']); break")
IID_B=$(python3 -c "
import json
for line in open('$SB/ledger.jsonl'):
    r=json.loads(line)
    if r.get('record_type')=='intent' and r.get('url')=='https://example.invalid/post/B':
        print(r['intent_id']); break")

echo "== 1: verify-effect refuses on non-EXECUTED intent (fail closed) =="
$L verify-effect --intent-id "$IID_B" --observer "independent-read" \
  --verdict EFFECT_CONFIRMED --evidence-ref "https://example.invalid/post/B" \
  --effect-summary "n/a" >/dev/null 2>&1
expect_eq "verify-effect on FAILED intent exits 2" "$?" "2"

echo "== 2: verify-effect refuses self-verification =="
$L verify-effect --intent-id "$IID_A" --observer "engage.js worker result" \
  --verdict EFFECT_CONFIRMED --evidence-ref "https://example.invalid/post/A" \
  --effect-summary "n/a" >/dev/null 2>&1
expect_eq "self-verification exits 2" "$?" "2"

echo "== 3: verify-effect records EFFECT_CONFIRMED with independent observer =="
$L verify-effect --intent-id "$IID_A" --observer "fixture-independent-read@2026-09-29" \
  --verdict EFFECT_CONFIRMED --evidence-ref "https://example.invalid/post/A" \
  --effect-summary "comment visible on post via independent read; 0 replies" >/dev/null 2>&1
expect_eq "verify-effect exits 0" "$?" "0"
N=$(python3 -c "
import json
n=0
for line in open('$SB/ledger.jsonl'):
    r=json.loads(line)
    if r.get('record_type')=='effect_verification' and r.get('intent_id')=='$IID_A': n+=1
print(n)")
expect_eq "one effect_verification record" "$N" "1"

echo "== 4: record-outcome requires evidence =="
$L record-outcome --intent-id "$IID_A" --outcome-class NO_SIGNAL >/dev/null 2>&1
expect_eq "record-outcome without evidence exits 2" "$?" "2"

echo "== 5: record-outcome records NO_SIGNAL; outcomes accumulate =="
$L record-outcome --intent-id "$IID_A" --outcome-class NO_SIGNAL \
  --evidence "fixture-independent-read: 1 comment (ours), 0 replies at T+0" \
  --note "window open; re-observe later" >/dev/null 2>&1
expect_eq "record-outcome exits 0" "$?" "0"
$L record-outcome --intent-id "$IID_A" --outcome-class PENDING_WINDOW_OPEN \
  --evidence "fixture: 24h window not yet elapsed" >/dev/null 2>&1
N=$(python3 -c "
import json
n=0
for line in open('$SB/ledger.jsonl'):
    r=json.loads(line)
    if r.get('record_type')=='outcome' and r.get('intent_id')=='$IID_A': n+=1
print(n)")
expect_eq "two outcome records kept (append-only)" "$N" "2"

echo "== 6: propose-learning stays CANDIDATE; no sample support refused =="
$L propose-learning --intent-id "$IID_A" --hypothesis "fixture only" \
  --sample-support 0 >/dev/null 2>&1
expect_eq "sample-support 0 exits 2" "$?" "2"
$L propose-learning --intent-id "$IID_A" \
  --hypothesis "fixture: no hypothesis with n=1" --sample-support 1 \
  --evidence-refs "fixture" >/dev/null 2>&1
expect_eq "propose-learning exits 0" "$?" "0"
ST=$(python3 -c "
import json
for line in open('$SB/ledger.jsonl'):
    r=json.loads(line)
    if r.get('record_type')=='candidate_learning': print(r['status']); break")
expect_eq "learning status" "$ST" "CANDIDATE"

echo "== 7: no promote path exists (learning law) =="
$L promote --help >/dev/null 2>&1
[ "$?" != "0" ] && ok "no promote subcommand" || bad "promote subcommand exists"
$L --help 2>/dev/null | grep -q "promote" \
  && bad "promote mentioned in help" || ok "promote absent from help"

echo "== 8: trace shows all seven stages with distinctions =="
TR=$($L trace --intent-id "$IID_A")
for stage in INTENT AUTHORIZATION ATTEMPT RESULT VERIFIED_EFFECT OUTCOME CANDIDATE_LEARNING; do
  echo "$TR" | python3 -c "import json,sys; json.load(sys.stdin)['$stage']" >/dev/null 2>&1 \
    && ok "trace has $stage" || bad "trace missing $stage"
done
echo "$TR" | grep -q "RESULT is not EFFECT" \
  && ok "trace carries hard distinctions" || bad "trace missing distinctions"
echo "$TR" | grep -q "pipeline-attested" \
  && ok "authorization honestly labeled pipeline-attested" \
  || bad "authorization labeling missing"

echo "== 9: trace on unknown intent fails closed =="
$L trace --intent-id "nope-not-real" >/dev/null 2>&1
expect_eq "trace unknown intent exits 2" "$?" "2"

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
