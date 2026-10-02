#!/bin/bash
# Bounded dev-server restart persistence test for the owner patch loop.
# 1. Apply the phone correction via the live API.
# 2. Restart the next dev server on :3100 (bounded).
# 3. Prove the correction survived the restart (Ask answers the corrected phone).
# 4. Revert and prove the original is restored.
set -u
OUT=/tmp/fyd-evidence-20260922
BASE=http://localhost:3100
note() { echo "[restart] $*"; }

# 1. apply correction
curl -s "$BASE/api/fyd/objects/happy-place/overrides" -X POST -H 'content-type: application/json' \
  -d '{"stage":"propose","text":"Correct phone to +1 541 555 0123"}' > "$OUT/r-propose.json"
python3 - "$OUT/r-propose.json" <<'PY' > "$OUT/r-approve.json"
import json,sys,urllib.request
b=json.load(open(sys.argv[1])); p=b["proposal"]; d=b["digests"]
req=urllib.request.Request("http://localhost:3100/api/fyd/objects/happy-place/overrides",
  data=json.dumps({"stage":"approve","command":p["command"],"baseStateDigest":d["baseStateDigest"],
    "baseViewDigest":d["baseViewDigest"],"patchDigest":d["patchDigest"]}).encode(),
  headers={"content-type":"application/json"})
body=json.load(urllib.request.urlopen(req))
print(json.dumps(body,indent=2))
assert body["ok"], json.dumps(body)[:300]
print("applied event", body["approval"]["eventId"], file=sys.stderr)
PY
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' | grep -q "+1 541 555 0123" \
  && note "pre-restart: ask shows corrected phone" || { note "FAIL pre-restart ask"; exit 1; }

# 2. bounded restart
OLD_PID=$(pgrep -f "next dev -p 3100" | head -1)
note "stopping dev server (pid $OLD_PID)"
kill "$OLD_PID" 2>/dev/null
for i in $(seq 1 15); do pgrep -f "next dev -p 3100" >/dev/null || break; sleep 1; done
pgrep -f "next dev -p 3100" >/dev/null && { note "FAIL: server did not stop"; exit 1; }
note "server stopped"
cd /home/nolan/projects/ping
nohup npm exec next dev -p 3100 > /tmp/fyd-evidence-20260922/next-restart.log 2>&1 &
NEW_PID=$!
note "started new server (pid $NEW_PID)"
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE/build/happy-place" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] && note "server back (200) after ${i}s" || { note "FAIL: server did not come back"; exit 1; }

# 3. correction survived the restart
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' > "$OUT/r-ask-post-restart.json"
grep -q "+1 541 555 0123" "$OUT/r-ask-post-restart.json" \
  && note "PASS: correction persisted across restart" \
  || { note "FAIL: correction lost across restart"; cat "$OUT/r-ask-post-restart.json"; exit 1; }
grep -q "owner correction" "$OUT/r-ask-post-restart.json" \
  && note "PASS: post-restart citation names owner correction" \
  || note "WARN: post-restart citation text differs"

# 4. revert
curl -s "$BASE/api/fyd/objects/happy-place/overrides" -X POST -H 'content-type: application/json' \
  -d '{"stage":"propose","text":"Revert phone correction"}' > "$OUT/r-revert-propose.json"
python3 - "$OUT/r-revert-propose.json" <<'PY' > "$OUT/r-revert-approve.json"
import json,sys,urllib.request
b=json.load(open(sys.argv[1])); p=b["proposal"]; d=b["digests"]
req=urllib.request.Request("http://localhost:3100/api/fyd/objects/happy-place/overrides",
  data=json.dumps({"stage":"approve","command":p["command"],"baseStateDigest":d["baseStateDigest"],
    "baseViewDigest":d["baseViewDigest"],"patchDigest":d["patchDigest"]}).encode(),
  headers={"content-type":"application/json"})
body=json.load(urllib.request.urlopen(req))
print(json.dumps(body,indent=2))
assert body["ok"], json.dumps(body)[:300]
print("reverted", file=sys.stderr)
PY
curl -s "$BASE/api/fyd/ask/happy-place" -X POST -H 'content-type: application/json' \
  -d '{"question":"What is the phone number?","mode":"visitor"}' | grep -q "+15412865190" \
  && note "PASS: revert restored +15412865190" || { note "FAIL: revert did not restore"; exit 1; }
note "restart test complete"
