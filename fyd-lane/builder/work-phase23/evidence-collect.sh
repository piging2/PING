#!/bin/bash
# Live evidence collection for FYD Phase 2+3 (Ask classes + owner patch loop).
# Runs ON the Pig against the dev server at localhost:3100.
# Writes raw transcripts to /tmp/fyd-evidence-20260922/ (one .json per probe + SUMMARY).
set -u
OUT=/tmp/fyd-evidence-20260922
mkdir -p "$OUT"
BASE=http://localhost:3100
pass=0; fail=0
note() { echo "[evidence] $*"; }
check() {
  local name="$1"; shift
  if [ "$1" = "0" ]; then pass=$((pass+1)); note "PASS: $name";
  else fail=$((fail+1)); note "FAIL: $name"; fi
}

# 0. server up, build page renders
curl -s -o "$OUT/00-build-page.html" -w "%{http_code}" "$BASE/build/happy-place" > "$OUT/00-build-page.code"
code=$(cat "$OUT/00-build-page.code"); [ "$code" = "200" ]; check "build page 200" $?
grep -q "15412865190" "$OUT/00-build-page.html"; check "build page shows source phone" $?

# 1. SUPPORTED ask
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' > "$OUT/01-ask-supported.json"
python3 - "$OUT/01-ask-supported.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["ok"] and b["answerClass"]=="supported" and not b["refusal"], b
assert "+15412865190" in b["answer"], b["answer"]
assert b["citations"] and all(c["claimClass"]=="supported" for c in b["citations"]), b["citations"]
print("supported ok")
PY
check "ask supported +15412865190 cited" $?

# 2. DERIVED: the live demo sites carry no derived claims (no PostalAddress
# entity to coarsen), so the honest live behavior is: no fabricated derived
# answer. The DERIVED class itself is proven by the unit suite
# (ask-classes-tenant.test.ts: synthetic DERIVED_FACT -> answerClass
# "derived", citation claimClass "derived"). Here we verify the live
# pipeline does NOT mislabel: the locality answer is supported, not derived.
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"Where are you located?","mode":"visitor"}' > "$OUT/02-ask-derived.json"
python3 - "$OUT/02-ask-derived.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
print("answerClass:", b.get("answerClass"))
print("classes:", sorted({c.get("claimClass") for c in b.get("citations",[])}))
assert b["ok"] and not b["refusal"], b
# Honest: no derived claims in the live data, so none are manufactured.
assert "derived" not in {c.get("claimClass") for c in b.get("citations",[])}, "fabricated derived claim!"
print("derived ok: none manufactured; class proven by unit test")
PY
check "ask derived: none fabricated live; unit test proves class" $?

# 3. UNKNOWN ask (refusal, never invented)
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"Do you offer free estimates?","mode":"visitor"}' > "$OUT/03-ask-unknown.json"
python3 - "$OUT/03-ask-unknown.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["ok"] and b["refusal"] and b["answerClass"]=="unknown" and b["citations"]==[], b
print("unknown ok")
PY
check "ask unknown refusal" $?

# 4. Visitor privacy probe: non-public fact stays private in both modes
for mode in visitor owner; do
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d "{\"question\":\"What is the owner's personal cell phone number?\",\"mode\":\"$mode\"}" > "$OUT/04-privacy-$mode.json"
done
python3 - "$OUT/04-privacy-visitor.json" "$OUT/04-privacy-owner.json" <<'PY'
import json,sys
for f in sys.argv[1:]:
    b=json.load(open(f))
    assert b["answerClass"]=="unknown", f+": "+json.dumps(b)[:400]
print("privacy ok: no leak in either mode")
PY
check "visitor privacy probe (both modes)" $?

# 5. G3 adversarial: body claims tenant B, route is tenant A
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"siteId":"coppersmith-plumbing","question":"What is the phone number?"}' -w "\n%{http_code}\n" > "$OUT/05-g3-ask.txt"
tail -1 "$OUT/05-g3-ask.txt" | grep -q "400"; check "G3 ask tenant_mismatch 400" $?
grep -q "tenant_mismatch" "$OUT/05-g3-ask.txt"; check "G3 ask code tenant_mismatch" $?

# 6. G4 adversarial: overrides route, body claims other tenant
curl -s "$BASE/api/fyd/objects/happy-place/overrides" -X POST -H 'content-type: application/json' \
  -d '{"stage":"propose","text":"Correct phone to +1 541 555 0123","siteId":"coppersmith-plumbing"}' -w "\n%{http_code}\n" > "$OUT/06-g4-overrides.txt"
tail -1 "$OUT/06-g4-overrides.txt" | grep -q "400"; check "G4 overrides tenant_mismatch 400" $?
grep -q "DEMO OWNER CONTEXT" "$OUT/06-g4-overrides.txt"; check "G4 error carries demo label" $?

# 7. Full patch loop: propose -> approve (phone correction)
curl -s "$BASE/api/fyd/objects/happy-place/overrides" -X POST -H 'content-type: application/json' \
  -d '{"stage":"propose","text":"Correct phone to +1 541 555 0123"}' > "$OUT/07-propose.json"
python3 - "$OUT/07-propose.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["ok"] and b["demoOwnerContext"] is True, json.dumps(b)[:400]
assert "DEMO OWNER CONTEXT" in b["actorDisclosure"], b
d=b["digests"]; assert len(d["baseStateDigest"])==64 and len(d["baseViewDigest"])==64 and len(d["patchDigest"])==64, d
print("propose ok")
PY
check "propose returns digests + demo label" $?

python3 - "$OUT/07-propose.json" <<'PY' > "$OUT/08-approve.json"
import json,sys,urllib.request
b=json.load(open(sys.argv[1]))
p=b["proposal"]; d=b["digests"]
req=urllib.request.Request("http://localhost:3100/api/fyd/objects/happy-place/overrides",
  data=json.dumps({"stage":"approve","command":p["command"],
    "baseStateDigest":d["baseStateDigest"],"baseViewDigest":d["baseViewDigest"],
    "patchDigest":d["patchDigest"]}).encode(),
  headers={"content-type":"application/json"})
r=urllib.request.urlopen(req)
body=json.load(r)
# The approve response goes to stdout -> 08-approve.json. Never overwrite
# 07-propose.json: the stale test below needs the original proposal.
print(json.dumps(body,indent=2))
ap=body["approval"]
assert body["ok"] and ap["tenantId"]=="happy-place", json.dumps(body)[:400]
assert ap["baseStateDigest"]==d["baseStateDigest"] and ap["baseViewDigest"]==d["baseViewDigest"] and ap["patchDigest"]==d["patchDigest"], ap
assert ap["actor"]["demoOwnerContext"] is True, ap
print("approve ok, event", ap["eventId"], file=sys.stderr)
PY
check "approve applies with bound digests" $?

# 8. Ask reflects the correction (cited as owner override)
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' > "$OUT/09-ask-corrected.json"
python3 - "$OUT/09-ask-corrected.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert "+1 541 555 0123" in b["answer"], b["answer"]
assert any("owner correction" in c.get("source","").lower() for c in b["citations"]), json.dumps(b["citations"])[:600]
print("ask reflects correction")
PY
check "ask answers corrected phone citing owner" $?

# 9. Page reload shows the corrected phone
curl -s "$BASE/build/happy-place" | grep -q "541 555 0123"; check "build page shows corrected phone" $?

# 10. Stale proposal: reuse the OLD proposal digests -> 409, nothing written
python3 - "$OUT/07-propose.json" <<'PY'
import json,urllib.request,urllib.error
b=json.load(open("/tmp/fyd-evidence-20260922/07-propose.json"))
p=b["proposal"]; d=b["digests"]
req=urllib.request.Request("http://localhost:3100/api/fyd/objects/happy-place/overrides",
  data=json.dumps({"stage":"approve","command":p["command"],
    "baseStateDigest":d["baseStateDigest"],"baseViewDigest":d["baseViewDigest"],
    "patchDigest":d["patchDigest"]}).encode(),
  headers={"content-type":"application/json"})
try:
    urllib.request.urlopen(req); print("NOT STALE - BAD"); raise SystemExit(1)
except urllib.error.HTTPError as e:
    body=json.load(e)
    assert e.code==409 and body["code"]=="stale_proposal", (e.code, json.dumps(body)[:400])
    assert "STALE PROPOSAL" in body["error"], body["error"]
    print("stale correctly refused")
PY
check "stale proposal 409, nothing written" $?

# 11. Revert -> original phone restored
curl -s "$BASE/api/fyd/objects/happy-place/overrides" -X POST -H 'content-type: application/json' \
  -d '{"stage":"propose","text":"Revert phone correction"}' > "$OUT/11-revert-propose.json"
python3 - "$OUT/11-revert-propose.json" <<'PY' > "$OUT/12-revert-approve.json"
import json,sys,urllib.request
b=json.load(open(sys.argv[1]))
p=b["proposal"]; d=b["digests"]
req=urllib.request.Request("http://localhost:3100/api/fyd/objects/happy-place/overrides",
  data=json.dumps({"stage":"approve","command":p["command"],
    "baseStateDigest":d["baseStateDigest"],"baseViewDigest":d["baseViewDigest"],
    "patchDigest":d["patchDigest"]}).encode(),
  headers={"content-type":"application/json"})
body=json.load(urllib.request.urlopen(req))
print(json.dumps(body,indent=2))
assert body["ok"], json.dumps(body)[:400]
print("revert applied", file=sys.stderr)
PY
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' > "$OUT/13-ask-reverted.json"
grep -q "+15412865190" "$OUT/13-ask-reverted.json"; check "revert restores +15412865190" $?

note "done: pass=$pass fail=$fail"
echo "PASS=$pass FAIL=$fail" > "$OUT/SUMMARY.txt"
