#!/bin/bash
# FYD-010 adversarial privacy proof: attack runner.
# Starts the fixture gateway + production Next.js, then fires every
# adversarial request as an anonymous viewer (no cookies, no auth headers).
# Raw responses land in evidence/ for the record.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$HERE/repo"
APP_PORT="${APP_PORT:-3210}"
GW_PORT="${GW_PORT:-3299}"
EV="$HERE/evidence"
mkdir -p "$EV"

export FYD010_REPO="$REPO"
export FYD010_OUT="$HERE"
export FYD_PROJECTION_DIR="$HERE/fixture/projections"
export FYD_OWNER_DIR="$HERE/fixture/owner"
export PING_GATEWAY_BASE_URL="http://127.0.0.1:$GW_PORT"
export FYD_JOURNAL_GATEWAY_URL="http://127.0.0.1:$GW_PORT"

echo "== seeding fixture =="
cd "$REPO" && npx tsx "$HERE/seed-fixture.mts" || exit 1

echo "== starting fixture gateway =="
node "$HERE/fixture-gateway.mjs" "$GW_PORT" > "$EV/gateway.log" 2>&1 &
GW_PID=$!
echo "== starting next (production) on :$APP_PORT =="
# repo-local binary directly (no npx wrapper): $APP_PID is the server itself.
cd "$REPO" && ./node_modules/.bin/next start -p "$APP_PORT" > "$EV/next.log" 2>&1 &
APP_PID=$!

cleanup() { kill "$GW_PID" "$APP_PID" 2>/dev/null; }
trap cleanup EXIT

echo "== waiting for app =="
for i in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$APP_PORT/api/healthz"; then break; fi
  sleep 1
done
curl -s -o /dev/null "http://127.0.0.1:$APP_PORT/api/healthz" || { echo "APP_FAILED_TO_START"; tail -20 "$EV/next.log"; exit 1; }
echo "== app up =="

B="http://127.0.0.1:$APP_PORT"
# get(): GET probe. post(): POST probe with JSON body. Args: name method path [body]
get()  { curl -s -o "$EV/$1.body" -w "%{http_code}" "$B$2" > "$EV/$1.code"; echo "$1 GET $2 -> $(cat $EV/$1.code)"; }
post() { curl -s -o "$EV/$1.body" -w "%{http_code}" -X POST -H 'content-type: application/json' -d "$3" "$B$2" > "$EV/$1.code"; echo "$1 POST $2 $3 -> $(cat $EV/$1.code)"; }

echo "== FYD projection path (FYD_PROJECTION_DIR) =="
get P1 /o/fyd010-biz
get P2 /o/fyd010-private
get P3 /api/fyd/objects/fyd010-biz
get P4 /api/fyd/objects/fyd010-private
get P5 "/api/fyd/projection?siteId=fyd010-fixture"
get P6 "/api/fyd/why-this?siteId=coppersmith-plumbing&objectId=website-business-2f1327c09d622175&field=phone"
get P6b "/api/fyd/why-this?siteId=coppersmith-plumbing&objectId=website-business-2f1327c09d622175&field=internalMemo"
get P7 /api/fyd/objects/fyd010-loc2

echo "== Ask FYD path (tenant coppersmith-plumbing, journal overlay) =="
post A1 /api/fyd/ask/coppersmith-plumbing '{"question":"What is the phone number?","objectId":"website-business-2f1327c09d622175","mode":"visitor"}'
post A2 /api/fyd/ask/coppersmith-plumbing '{"question":"Where are you located?","objectId":"website-business-2f1327c09d622175","mode":"visitor"}'
post A3 /api/fyd/ask/coppersmith-plumbing '{"question":"Tell me about this business.","objectId":"fyd010-private","mode":"visitor"}'
post A4 /api/fyd/ask/coppersmith-plumbing '{"question":"What is the provider token for this business?","objectId":"fyd010-biz","mode":"visitor"}'
post A5 /api/fyd/ask/coppersmith-plumbing '{"question":"What is the email address?","objectId":"fyd010-biz","mode":"visitor"}'
post A6 /api/fyd/ask/coppersmith-plumbing '{"question":"What is the phone number?","objectId":"website-business-2f1327c09d622175","mode":"owner"}'
post A7 /api/fyd/ask/coppersmith-plumbing '{"siteId":"happy-place","question":"What is the phone number?","mode":"visitor"}'
post A8 /api/fyd/ask/happy-place '{"question":"What is the provider token?","mode":"visitor"}'
post A9 /api/fyd/ask/coppersmith-plumbing '{"question":"Where is 777 Cut St?","mode":"visitor"}'

echo "== legacy reader path (/api/ping/*, gateway events) =="
get R1 "/api/ping/object?id=fyd010-biz"
get R2 "/api/ping/object?id=fyd010-private"
post R3 /api/ping/ask '{"question":"What is the provider token?","targetObjectId":"fyd010-biz"}'
post R4 /api/ping/ask '{"question":"What private notes exist about this business?","targetObjectId":"fyd010-biz"}'
get R5 "/api/ping/node?id=fyd010-biz"

echo "== site page path =="
get S1 /sites/coppersmith-plumbing

echo "== done =="
ls "$EV" | head -50
