#!/bin/bash
# Test suite for ~/workspace/outreach/engagement-guard.py
# Runs entirely in a sandbox copy of the logs; production files are never touched.
set -u
GUARD=~/workspace/outreach/engagement-guard.py
SANDBOX=/tmp/guard-test-$$
mkdir -p "$SANDBOX/logs" "$SANDBOX/passes"
cp ~/workspace/outreach/instagram-engagement.md "$SANDBOX/logs/"
cp ~/workspace/outreach/facebook-engagement.md "$SANDBOX/logs/"
cp ~/workspace/outreach/threads-engagement.md "$SANDBOX/logs/"
cp ~/workspace/outreach/x-engagement.md "$SANDBOX/logs/"
cp ~/workspace/outreach/tiktok-engagement.md "$SANDBOX/logs/"
export ENGAGEMENT_GUARD_DIR="$SANDBOX/logs"
export ENGAGEMENT_GUARD_PASSES_DIR="$SANDBOX/passes"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# T1: the five pass-12 accounts re-engaged in pass 18 must be refused
for h in fillinghamplumbingandheating montrosegaragedoors pinosroofing crosstechelectric koolergaragedoors; do
  D=$(python3 "$GUARD" check --platform instagram --account "@$h" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
  [ "$D" = "ALREADY_ENGAGED" ] && ok "T1 @$h refused ($D)" || bad "T1 @$h got $D"
done

# T2: same account, different post (per-account rule, not per-post)
D=$(python3 "$GUARD" check --platform instagram --account "@montrosegaragedoors" --url "https://www.instagram.com/p/ZZZbrandnewpost99/" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ALREADY_ENGAGED" ] && ok "T2 same account different post refused" || bad "T2 got $D"

# T3: repeated candidate within the same pass
cat > "$SANDBOX/cand.json" <<'EOF'
[{"account":"@brandnewbizalpha","url":"https://www.instagram.com/p/AAA111/"},{"account":"@brandnewbizbeta","url":"https://www.instagram.com/p/BBB222/"},{"account":"@brandnewbizalpha","url":"https://www.instagram.com/p/AAA111/"}]
EOF
python3 "$GUARD" filter --platform instagram --in "$SANDBOX/cand.json" --out "$SANDBOX/elig1.json" --audit >/dev/null
E=$(python3 -c "import json;print(len(json.load(open('$SANDBOX/elig1.json'))['candidates']))")
[ "$E" = "2" ] && ok "T3 first filter eligible=2" || bad "T3 first filter eligible=$E"
python3 "$GUARD" filter --platform instagram --in "$SANDBOX/cand.json" --out "$SANDBOX/elig2.json" --audit > "$SANDBOX/sum2.json"
E2=$(python3 -c "import json;print(len(json.load(open('$SANDBOX/elig2.json'))['candidates']))")
B2=$(python3 -c "import json;print(len(json.load(open('$SANDBOX/sum2.json'))['blocked']))")
[ "$E2" = "2" ] && [ "$B2" = "1" ] && ok "T3 repeat filter: unacted re-presentation idempotent (eligible=2), in-list dup refused (blocked=1)" || bad "T3 repeat: eligible=$E2 blocked=$B2"

# T4: restart between selection and action
cat > "$SANDBOX/cand2.json" <<'EOF'
[{"account":"@restartbizone","url":"https://www.instagram.com/p/RRR111/"},{"account":"@restartbiztwo","url":"https://www.instagram.com/p/RRR222/"}]
EOF
python3 "$GUARD" filter --platform instagram --in "$SANDBOX/cand2.json" --out "$SANDBOX/elig3.json" --audit > "$SANDBOX/sum3.json"
MAN3=$(python3 -c "import json;print(json.load(open('$SANDBOX/sum3.json'))['manifest'])")
# simulate crash after one action landed, recorded durably before the restart
python3 "$GUARD" record --platform instagram --account "@restartbizone" --url "https://www.instagram.com/p/RRR111/" --action like --manifest "$MAN3" >/dev/null
# restart: re-filter the remaining candidates
python3 "$GUARD" filter --platform instagram --in "$SANDBOX/cand2.json" --out "$SANDBOX/elig4.json" --audit > "$SANDBOX/sum4.json"
E4=$(python3 -c "import json;print(len(json.load(open('$SANDBOX/elig4.json'))['candidates']))")
WHO=$(python3 -c "import json;print(json.load(open('$SANDBOX/elig4.json'))['candidates'][0]['account'])")
B4=$(python3 -c "import json;s=json.load(open('$SANDBOX/sum4.json'));print([(b['account'],b['decision']) for b in s['blocked']])")
[ "$E4" = "1" ] && [ "$WHO" = "@restartbiztwo" ] && ok "T4 restart: recorded account blocked, survivor eligible ($B4)" || bad "T4 eligible=$E4 who=$WHO blocked=$B4"

# T5: stale history data (index older than log) must auto-rebuild
python3 "$GUARD" record --platform instagram --account "@stalehistorybiz" --action comment >/dev/null
D=$(python3 "$GUARD" check --platform instagram --account "@stalehistorybiz" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ALREADY_ENGAGED" ] && ok "T5 stale index auto-rebuilt, new record found" || bad "T5 got $D"

# T6: history unreadable -> fail closed, exit 3, no output
mkdir -p "$SANDBOX/empty"
ENGAGEMENT_GUARD_DIR="$SANDBOX/empty" ENGAGEMENT_GUARD_PASSES_DIR="$SANDBOX/passes" \
  python3 "$GUARD" check --platform instagram --account "@anyone" >"$SANDBOX/u.json" 2>/dev/null
RC=$?
DU=$(python3 -c "import json;print(json.load(open('$SANDBOX/u.json'))['decision'])")
[ "$RC" = "3" ] && [ "$DU" = "UNKNOWN-UNCHECKABLE" ] && ok "T6 check fail-closed rc=3 UNKNOWN-UNCHECKABLE" || bad "T6 rc=$RC decision=$DU"
ENGAGEMENT_GUARD_DIR="$SANDBOX/empty" ENGAGEMENT_GUARD_PASSES_DIR="$SANDBOX/passes" \
  python3 "$GUARD" filter --platform instagram --in "$SANDBOX/cand.json" --out "$SANDBOX/shouldnotexist.json" 2>/dev/null
RC=$?
[ "$RC" = "3" ] && [ ! -f "$SANDBOX/shouldnotexist.json" ] && ok "T6 filter fail-closed rc=3, no output file" || bad "T6 filter rc=$RC"

# T7: ambiguous identity fails closed; genuinely new stays eligible
D=$(python3 "$GUARD" check --platform instagram --account "@kooler_garagedoors" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "BLOCKED" ] && ok "T7 ambiguous IG handle BLOCKED" || bad "T7 IG got $D"
D=$(python3 "$GUARD" check --platform facebook --account "Peterson Plumbing" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ALREADY_ENGAGED" ] && ok "T7 exact FB page name ALREADY_ENGAGED" || bad "T7 FB exact got $D"
D=$(python3 "$GUARD" check --platform facebook --account "Rocky Mountain Landscape" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "BLOCKED" ] && ok "T7 ambiguous FB name BLOCKED (subset of engaged name, fail closed)" || bad "T7 FB ambiguous got $D"
D=$(python3 "$GUARD" check --platform instagram --account "@definitelynewtradebizqzx" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ELIGIBLE" ] && ok "T7 genuinely new IG handle ELIGIBLE" || bad "T7 new IG got $D"
D=$(python3 "$GUARD" check --platform facebook --url "https://www.facebook.com/groups/9999999999999999/permalink/1234567890123456/" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ELIGIBLE" ] && ok "T7 genuinely new FB permalink ELIGIBLE" || bad "T7 new FB got $D"

# T8: FB job filter strips blocked actions, audits durably
cat > "$SANDBOX/fbjob.json" <<'EOF'
{"actions":[
  {"type":"like","url":"https://www.facebook.com/groups/2803047646497352/permalink/4069706246498146/","page":"Big Bear Junk Removal"},
  {"type":"like","url":"https://www.facebook.com/groups/9999999999999999/permalink/1234567890123456/","page":"Somewhere New Trade Co"},
  {"type":"comment","url":"https://www.facebook.com/groups/270984801003919/permalink/2345678901234567/","page":"Buffalo Construction Landscaping LLC","text":"Nice work."}
],"minDelaySec":60,"maxDelaySec":120}
EOF
python3 "$GUARD" filter --platform facebook --fb-job --in "$SANDBOX/fbjob.json" --out "$SANDBOX/fbjob-out.json" --audit > "$SANDBOX/fbsum.json"
EA=$(python3 -c "import json;print(len(json.load(open('$SANDBOX/fbjob-out.json'))['actions']))")
KP=$(python3 -c "import json;print(json.load(open('$SANDBOX/fbjob-out.json'))['actions'][0]['page'])")
BA=$(python3 -c "import json;s=json.load(open('$SANDBOX/fbsum.json'));print(sorted(set(b['decision'] for b in s['blocked'])))")
AUDIT=$(grep -c "GUARD .* filter facebook" "$SANDBOX/logs/facebook-engagement.md")
[ "$EA" = "1" ] && [ "$KP" = "Somewhere New Trade Co" ] && [ "$BA" = "['ALREADY_ENGAGED', 'BLOCKED']" ] && [ "$AUDIT" -ge 1 ] && ok "T8 FB job: 1 eligible kept, blocked={ALREADY_ENGAGED,BLOCKED}, audit line written" || bad "T8 eligible=$EA kept=$KP blocked=$BA audit=$AUDIT"

# T9: verify catches a re-engagement against the pre-pass snapshot
MAN=$(python3 -c "import json;print(json.load(open('$SANDBOX/sum3.json'))['manifest'])")
cat > "$SANDBOX/report.json" <<EOF
{"manifest":"$MAN","actions":[
  {"account":"@pinosroofing","url":"https://www.instagram.com/p/DOo-vAHEcI0/"},
  {"account":"@somewherenewtradecoqzx"}
]}
EOF
V=$(python3 "$GUARD" verify --platform instagram --report "$SANDBOX/report.json" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d['violations']), d['violations'][0]['verdict'] if d['violations'] else 'none')")
[ "$V" = "1 VIOLATION" ] && ok "T9 verify flags re-engagement as VIOLATION" || bad "T9 got $V"

# T10: pfbid post URLs (2026-09-29 pass-143 blind spot) join the
# never-re-engage index like numeric post IDs. Synthetic author IDs keep the
# slug path out of it; assertions require the pfbid POST id in the reason,
# proving post-level (not author-slug) matching. Sandbox ledger gets one
# terminal (FAILED) pfbid intent; sandbox md log gets one GUARD-RECORD with
# a different pfbid URL. A novel pfbid must stay ELIGIBLE.
PFBID_ENGAGED="https://facebook.com/999888777666555/posts/pfbid0T10LEDGER0000000000000000000001/"
PFBID_MDLOG="https://facebook.com/888777666555444/posts/pfbid0T10MDLOG000000000000000000000002/"
PFBID_NOVEL="https://facebook.com/777666555444333/posts/pfbid0T10NOVEL0000000000000000000000003/"
cat > "$SANDBOX/logs/action-intent-ledger.jsonl" <<EOF
{"record_type":"intent","intent_id":"t10aaa","platform":"facebook","account":"T10 Test Biz","url":"$PFBID_ENGAGED","stage":"ACTION_INTENT_DURABLE","ts":"2026-09-29T00:00:01+00:00"}
{"record_type":"observation","intent_id":"t10aaa","terminal":"FAILED","outcome":"FAILED","ts":"2026-09-29T00:05:01+00:00"}
EOF
echo "2026-09-29T00:10:00+00:00 GUARD-RECORD platform=facebook action=like account=T10MdBiz url=$PFBID_MDLOG" >> "$SANDBOX/logs/facebook-engagement.md"
R=$(python3 "$GUARD" check --platform facebook --url "$PFBID_ENGAGED" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['decision'],'|',d['reason'])")
case "$R" in *"ALREADY_ENGAGED"*pfbid0T10LEDGER*) ok "T10 pfbid terminal ledger intent refused by post id ($R)";; *) bad "T10 ledger pfbid got $R";; esac
R=$(python3 "$GUARD" check --platform facebook --url "$PFBID_MDLOG" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['decision'],'|',d['reason'])")
case "$R" in *"ALREADY_ENGAGED"*pfbid0T10MDLOG*) ok "T10 pfbid md-log GUARD-RECORD refused by post id ($R)";; *) bad "T10 mdlog pfbid got $R";; esac
D=$(python3 "$GUARD" check --platform facebook --account "T10 Novel Biz QZX" --url "$PFBID_NOVEL" | python3 -c "import json,sys;print(json.load(sys.stdin)['decision'])")
[ "$D" = "ELIGIBLE" ] && ok "T10 novel pfbid URL stays ELIGIBLE" || bad "T10 novel pfbid got $D"

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
rm -rf "$SANDBOX"
[ "$FAIL" -eq 0 ]
