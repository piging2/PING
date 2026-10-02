#!/bin/bash
# test_automation_health_report.sh
# Regression suite for the automation-health-reporter repair lane (Directive B 7/15).
# The 6 VERIFIED PHANTOMS must not be emitted after the fix; genuine signals and
# the restriction tripwire must keep flowing. Runs entirely against synthetic
# fixtures under /tmp; never touches live state.
set -u

R=~/workspace/outreach/automation-health-report.sh
FX=/tmp/health-fixtures
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "ok   $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL $1"; }

mkroot() { # $1 = root name -> fresh fixture root with env vars
  local r="$FX/$1"; rm -rf "$r"
  mkdir -p "$r/out" "$r/pigfb" "$r/goals/crons/hourly" \
           "$r/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel" \
           "$r/tandem/reconciliation"
  echo "---" > "$r/goals/crons/hourly/placeholder-note.txt" 2>/dev/null
  printf '%s' "$r"
}

crondef() { # $1=root $2=platform $3=caps line
  printf -- '---\nid: %s-engagement-pass\nenabled: true\n---\n\n%s\n' "$2" "$3" \
    > "$1/goals/crons/hourly/$2-engagement-pass__interval@2h.md"
}

# ================= FIXTURE SET A: the 6 phantoms must be silent =================
A="$(mkroot setA)"
crondef "$A" facebook "75 likes + 20 comments per pass, 2h cadence (sprint directive)."
crondef "$A" instagram "up to 50 likes + 12 comments per pass, every 2h"
crondef "$A" threads "up to 45 likes + 12 comments per pass, every 2h"
crondef "$A" tiktok "up to 60 likes + 20 comments per pass (double-down)"
crondef "$A" x "up to 30 likes per pass, likes-only, browser-only"

# Phantom 2a: pass 110 SUCCESS_ACTION 59/59 reconciled (must not say "unclear")
# Phantom 1: caps line above (must parse "75 likes + 20 comments")
cat > "$A/out/facebook-engagement.md" <<'EOF'
## Pass 110 COMPLETED — fb-20260924-113702 (dispatched 2026-09-24 ~05:37 MDT; reconciled ~07:10 MDT)
- Result file reconciled deliberately: 59 targets, 59 observed, 0 left open.
- Result: ok=true, logged_in=true. 59/59 likes reported ok=true ("like registered (button state changed)").
- No checkpoint, action block, warning, or login failure. Classification: SUCCESS_ACTION (59 likes, 0 comments).
- GUARD 2026-09-24T13:32:52.393332+00:00 filter facebook: checked=76 eligible=28 blocked=48

## Pass 111 NOT ATTEMPTED — fb-20260924-133234 (dispatched 2026-09-24 ~07:32 MDT; infra failure, zero actions executed)
- Pig worker never launched: CDP down after relaunch (exit 2).
- Intent ledger: 28 intents recorded, all 28 reconciled as NOT_ATTEMPTED with proof; 0 open, 0 unknown.
- Classification: DEPENDENCY_FAILURE (not genuine-empty; does not count toward the empty streak; cadence unchanged).
- No checkpoint, action block, warning, or login failure. Quiet to Nolan.

## Pass 112 IN FLIGHT — fb-20260924-153431 (dispatched 2026-09-24 ~09:34 MDT; SPRINT pass, caps 75+20)
EOF

# Phantom 5/6: live capability state AVAILABLE (log text is historical noise)
cat > "$A/pigfb/ig-capability-state.json" <<'EOF'
{"capability":"instagram-browser-automation","status":"AVAILABLE","reason":"BROWSER_WEDGE",
 "blocked_since":"2026-09-16T23:05:00-06:00","unblocked_at":"2026-09-19T13:13:01+00:00",
 "updated_at":"2026-09-21T13:45:29+00:00"}
EOF
cat > "$A/pigfb/th-capability-state.json" <<'EOF'
{"capability":"threads-browser-automation","status":"READY_AWAITING_LOGIN",
 "reason":"COOKIE_IDENTITY_RATE_LIMITED_BY_META_EDGE","updated_at":"2026-09-20T15:52:00Z"}
EOF

# Phantom 3: threads "no fail-closed" text with ELIGIBILITY_EMPTY classification
cat > "$A/out/threads-engagement.md" <<'EOF'
### Pass 106, 2026-09-24 11:01 MDT (scheduled) — ELIGIBILITY_EMPTY: zero eligible candidates after pre-guard skips
- Candidates: th-candidates-20260924-170453.json = 0. Guard filter: 0 checked -> 0 eligible, 0 blocked, exit 0 (no fail-closed). Manifest: threads-pass-20260924-170719.json. Unknown-execution filter: 0 checked -> 0 refused, exit 0.
- Classification: ELIGIBILITY_EMPTY (genuine empty).
EOF

# IG heading format fix: "## YYYY-MM-DD — Pass N" must match generically.
# Pass 120's block is longer than 40 lines, so a tail-40 fallback (the old bug)
# would NOT see its CLASSIFICATION line; only the heading fix resolves it.
{
echo '## 2026-09-23 — Pass 119 (completed ~09:17 MDT)'
echo 'CLASSIFICATION: DEPENDENCY_FAILURE. 0 likes, 0 comments. Infra failure.'
for i in $(seq 1 60); do echo "- padding line $i of pass 119 diagnostics"; done
echo '## 2026-09-24 — Pass 120 (completed ~11:17 MDT)'
echo 'CLASSIFICATION: ELIGIBILITY_EMPTY. 0 likes, 0 comments. Genuine empty: all 3 discovery strategies ran healthy (exit 0).'
for i in $(seq 1 45); do echo "- padding line $i of pass 120 diagnostics"; done
echo 'genuine-empty streak = 18.'
echo 'Guard filter: 0 checked -> 0 eligible, exit 0. No restriction signal of any kind.'
} > "$A/out/instagram-engagement.md"

cat > "$A/out/tiktok-engagement.md" <<'EOF'
## Pass 58 — 2026-09-24 09:45-09:47 MDT (scheduled)
- 0/1 EXECUTED, no warnings. Classification: SUCCESS_ACTION (1 like).
- GUARD 2026-09-24T15:50:00Z filter tiktok: checked=3 eligible=3 blocked=0
EOF

# Phantom 4: 3 .CAPTURE_FAILED artifacts, all with terminal disposition sidecars
# (real naming convention: <stem>.md.CAPTURE_FAILED + <stem>.provenance.json)
MI="$A/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel"
for s in a b c; do
  : > "$MI/20260913-091129-$s-brief.md.CAPTURE_FAILED"
  cat > "$MI/20260913-091129-$s-brief.provenance.json" <<EOF
{"brief_id":"$s-brief","status":"capture_failed",
 "transitions":[{"state":"capture_failed_closed","at":"2026-09-23T19:06:21Z","by":"mark-distill-closed.sh"}]}
EOF
done
# Phantom 4b: one artifact WITHOUT a terminal disposition -> real backlog of 1
: > "$MI/20260924-080000-d-brief.md.CAPTURE_FAILED"
cat > "$MI/20260924-080000-d-brief.provenance.json" <<'EOF'
{"brief_id":"d-brief","status":"capture_failed","transitions":[{"state":"capture_failed","at":"2026-09-24T08:00:00Z"}]}
EOF
echo '{"gap_count":0,"meta":{"checked_at":"2026-09-24T16:03:33Z"}}' > "$A/tandem/reconciliation/LATEST.json"
: > "$A/out/action-intent-ledger.jsonl"
echo '{"ok":true}' > "$A/out/action-truth.jsonl"

out="$(HEALTH_OUT="$A/out" HEALTH_TANDEM="$A/tandem/reconciliation" HEALTH_GOALS="$A/goals" HEALTH_PIGFB="$A/pigfb" bash "$R")"

echo "$out" | grep -q 'strategy: caps not parseable' && bad "phantom1: caps not parseable emitted" || ok "phantom1: no caps warning"
echo "$out" | grep -q 'strategy: 75 likes + 20 comments per pass' && ok "phantom1: caps parsed" || bad "phantom1: caps not parsed"
echo "$out" | grep -q 'unclear outcome' && bad "phantom2: unclear outcome emitted" || ok "phantom2: no unclear outcome"
echo "$out" | grep -q 'DEPENDENCY_FAILURE' && ok "phantom2b: pass111 DEPENDENCY_FAILURE in context" || bad "phantom2b: pass111 classification missing"
echo "$out" | grep -qi 'guard fail-closed' && bad "phantom3: guard fail-closed emitted" || ok "phantom3: no guard fail-closed"
echo "$out" | grep -q 'quarantine backlog' && bad "phantom4: quarantine backlog emitted" || ok "phantom4: no quarantine backlog"
echo "$out" | grep -q "closed: 3" && ok "phantom4: closed artifacts not counted" || bad "phantom4: closed artifacts misread"
echo "$out" | grep -q '1 open artifact(s) without terminal disposition' && ok "phantom4: real open artifact counted (not zeroed)" || bad "phantom4: open artifact missed"
echo "$out" | grep -qi 'CAPABILITY=BLOCKED' && bad "phantom5: CAPABILITY=BLOCKED emitted" || ok "phantom5: no CAPABILITY=BLOCKED"
echo "$out" | grep -qi "needs Nolan's manual Chrome restart" && bad "phantom6: stale Chrome restart emitted" || ok "phantom6: no stale Chrome restart"
echo "$out" | grep -q 'capability instagram-browser-automation: AVAILABLE' && ok "phantom5/6: live state read" || bad "phantom5/6: live capability state not read"
echo "$out" | grep -q 'in flight since 2026-09-24 ~09:34 MDT' && ok "inflight: pass 112 in-flight pending" || bad "inflight: in-flight line missing"
echo "$out" | grep -q 'last terminal: DEPENDENCY_FAILURE' && ok "inflight: prior terminal classification shown" || bad "inflight: prior terminal missing"
echo "$out" | grep -q 'ELIGIBILITY_EMPTY (genuine-empty streak = 18)' && ok "headingfix: IG genuine-empty kept" || bad "headingfix: IG genuine-empty lost"

# Phantom 2a fixture: pass 110 SUCCESS_ACTION 59/59 is the LAST pass.
# It must be reported as success, never as "unclear outcome".
C="$(mkroot setC)"
crondef "$C" facebook "75 likes + 20 comments per pass, 2h cadence"
for p in instagram threads tiktok x; do crondef "$C" "$p" "up to 5 likes per pass"; done
cat > "$C/out/facebook-engagement.md" <<'EOF'
## Pass 109 COMPLETED — fb-20260924-093702
- 40/40 likes landed. Classification: SUCCESS_ACTION (40 likes, 0 comments).

## Pass 110 COMPLETED — fb-20260924-113702 (dispatched 2026-09-24 ~05:37 MDT; reconciled ~07:10 MDT)
- Result file reconciled deliberately: 59 targets, 59 observed, 0 left open.
- Result: ok=true, logged_in=true. 59/59 likes reported ok=true ("like registered (button state changed)").
- No checkpoint, action block, warning, or login failure. Classification: SUCCESS_ACTION (59 likes, 0 comments).
- GUARD 2026-09-24T13:32:52.393332+00:00 filter facebook: checked=76 eligible=28 blocked=48
EOF
for p in instagram threads tiktok x; do printf '## Pass 1\n- 5/5 landed. Classification: SUCCESS_ACTION.\n' > "$C/out/$p-engagement.md"; done
cp "$A/pigfb/ig-capability-state.json" "$C/pigfb/"; cp "$A/pigfb/th-capability-state.json" "$C/pigfb/"
echo '{"gap_count":0,"meta":{"checked_at":"2026-09-24T16:03:33Z"}}' > "$C/tandem/reconciliation/LATEST.json"
: > "$C/out/action-intent-ledger.jsonl"; echo '{"ok":true}' > "$C/out/action-truth.jsonl"

out3="$(HEALTH_OUT="$C/out" HEALTH_TANDEM="$C/tandem/reconciliation" HEALTH_GOALS="$C/goals" HEALTH_PIGFB="$C/pigfb" bash "$R")"
echo "$out3" | grep -q "59/59 actions reconciled, no warnings" && ok "phantom2a: pass110 59/59 SUCCESS_ACTION" || bad "phantom2a: pass110 not reported as success"
echo "$out3" | grep -q 'unclear outcome' && bad "phantom2a: unclear outcome emitted" || ok "phantom2a: no unclear outcome"

# ================= FIXTURE SET B: genuine signals must keep flowing ==============
B="$(mkroot setB)"
crondef "$B" facebook "75 likes + 20 comments per pass, 2h cadence"
crondef "$B" instagram "up to 50 likes + 12 comments per pass, every 2h"
crondef "$B" threads "up to 45 likes + 12 comments per pass, every 2h"
crondef "$B" tiktok "up to 60 likes + 20 comments per pass"
crondef "$B" x "up to 30 likes per pass, likes-only, browser-only"
cp "$A/pigfb/ig-capability-state.json" "$B/pigfb/"
# Genuine blocked capability -> must still warn from LIVE state
cat > "$B/pigfb/th-capability-state.json" <<'EOF'
{"capability":"threads-browser-automation","status":"BLOCKED",
 "reason":"BROWSER_WEDGE","blocked_since":"2026-09-24T10:00:00Z"}
EOF

# Genuine: X TEMPORARY_FAILURE infra no-action + new 401 credential signal
cat > "$B/out/x-engagement.md" <<'EOF'
### Pass 2026-09-24 ~07:14 MDT (scheduled; classification TEMPORARY_FAILURE, zero engagement)
- Phase A via Pig probe. Launcher TIMEOUT: exit 6 after the full 3120s bound; X page loads extremely sluggish today.
- Fail-closed: no candidate file produced, so guard filter, intent ledger, and Phase B never ran. Zero intents written, zero likes executed.
- xapi tweets verified still unusable this pass (401 Unauthorized on both `tweets` and `me`; was 402 credits-depleted at 05:14).
- New observation: xapi auth failure mode changed from 402 (credits-depleted) to 401 (Unauthorized); not just credits — check credential health on a future pass.
- No restriction/checkpoint/action-block signal observed at any point.
EOF

# Genuine: real restriction signal must trip the gate
cat > "$B/out/facebook-engagement.md" <<'EOF'
## Pass 113 COMPLETED — fb-20260924-173702 (dispatched 2026-09-24 ~11:37 MDT)
- Result: ok=true. 70/75 likes landed. Classification: SUCCESS_ACTION (70 likes, 0 comments).
- Action block hit mid-run: 5 targets skipped after an action block on the group surface. Volume drops to minimum per tripwire.
EOF

for p in instagram threads tiktok; do
  cat > "$B/out/$p-engagement.md" <<EOF
## Pass 1 — 2026-09-24 09:00 MDT
- 5/5 landed. Classification: SUCCESS_ACTION.
EOF
done
echo '{"gap_count":0,"meta":{"checked_at":"2026-09-24T16:03:33Z"}}' > "$B/tandem/reconciliation/LATEST.json"
# Stale intent: outcome-less, belongs to a pass that is no longer in flight.
printf '{"record_type":"intent","intent_id":"stale-intent-1","pass_id":"fb-20260920-000001","platform":"facebook"}\n' > "$B/out/action-intent-ledger.jsonl"
echo '{"ok":true}' > "$B/out/action-truth.jsonl"

out2="$(HEALTH_OUT="$B/out" HEALTH_TANDEM="$B/tandem/reconciliation" HEALTH_GOALS="$B/goals" HEALTH_PIGFB="$B/pigfb" bash "$R")"

echo "$out2" | grep -q 'TEMPORARY_FAILURE' && ok "genuine: X infra no-action emitted" || bad "genuine: X TEMPORARY_FAILURE lost"
echo "$out2" | grep -q 'credential-health: 401 Unauthorized' && ok "genuine: X 401 credential signal" || bad "genuine: X 401 credential signal lost"
echo "$out2" | grep -qi 'actions: guard fail-closed' && bad "genuine: X mislabeled as guard fail-closed" || ok "genuine: X not mislabeled"
echo "$out2" | grep -qi 'restriction signal: action block' && ok "genuine: real action block trips gate" || bad "genuine: real action block missed"
echo "$out2" | grep -q 'volume drops to minimum per tripwire' && ok "genuine: tripwire contract preserved" || bad "genuine: tripwire contract lost"
echo "$out2" | grep -q 'capability threads-browser-automation: BLOCKED' && ok "genuine: live BLOCKED state warns" || bad "genuine: live BLOCKED state silent"
echo "$out2" | grep -q 'open intents: 1 stale' && ok "genuine: stale intent attributed, not blamed on in-flight" || bad "genuine: stale intent misattributed"

echo ""
echo "pass=$PASS fail=$FAIL"
[ "$FAIL" -eq 0 ]
