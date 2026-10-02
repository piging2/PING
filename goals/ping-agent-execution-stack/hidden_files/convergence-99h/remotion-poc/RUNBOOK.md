# Remotion POC — Resume Runbook (Pig was unreachable at last attempt)

All scripts exist as sandbox originals in /tmp/remotion-poc/ (copy of tree also
dry-run-proven at /tmp/remotion-poc-dryrun/). Push pattern for every transfer:
`B64=$(base64 -w0 <localfile>)` then
`~/workspace/bin/pigwsl-exec "echo $B64 | base64 -d > /tmp/remotion-poc/<name>"`
(no literal quotes in the outer command; verify with byte count after decode).

## Step 1 — verify Pig route
`~/workspace/bin/pigwsl-exec 'echo PIG_ALIVE'` → expect PIG_ALIVE, rc=0.
(Blackout on 2026-09-30 ~16:15-16:30+ MDT was the weekday commute window;
~17:05 MDT is the sane retry time.)

## Step 2 — push files to Pig /tmp/remotion-poc/
Push: claim-query.js, build-ledger.cjs, script-gate.cjs, build-timestamps.cjs,
gen-scenes.cjs, validate-final.cjs, and the video/ tree
(package.json, tsconfig.json, src/ClaimVideo.tsx, src/index.ts).

## Step 3 — query the live claim ledger (on Pig, one pigwsl-exec call)
```
docker cp /tmp/remotion-poc/claim-query.js ping-gateway:/tmp/remotion-poc-q.js
docker exec ping-gateway node /tmp/remotion-poc-q.js > /tmp/remotion-poc/query-raw.json
```
Query: SELECT id, event_type, created_at, payload FROM ping_events
WHERE event_type='CLAIM_CREATED' ORDER BY created_at DESC LIMIT 5
(via gateway env PG* → brain-postgres/ping_runtime; prints NO secrets).

## Step 4 — ledger + script gate (on Pig)
```
cd /tmp/remotion-poc && node build-ledger.cjs && node script-gate.cjs
```
Gate must print GATE_PASS. Copy script.json sentences back to sandbox for TTS.

## Step 5 — verbatim TTS (sandbox)
For each segment i: `/opt/hatch/bin/tts speak --output seg<i>.mp3 --text-stdin`
with the EXACT sentence (default voice avocado_v2:MAI_03). Push MP3s to
Pig /tmp/remotion-poc/video/public/audio/seg<i>.mp3.

## Step 6 — timestamps + scenes (on Pig)
```
cd /tmp/remotion-poc && node build-timestamps.cjs && node gen-scenes.cjs
```
Needs ffprobe in PATH (see step 7; run npm install first).

## Step 7 — install + render (on Pig)
```
cd /tmp/remotion-poc/video && npm install --no-audit --no-fund
npm install --no-audit --no-fund ffmpeg-static ffprobe-static
FFBIN=$(node -e "console.log(require('ffmpeg-static'))")
FPBIN=$(node -e "console.log(require('ffprobe-static').path)")
mkdir -p /tmp/remotion-poc/bin && ln -sf "$FFBIN" /tmp/remotion-poc/bin/ffmpeg && ln -sf "$FPBIN" /tmp/remotion-poc/bin/ffprobe
export PATH=/tmp/remotion-poc/bin:$PATH
npx remotion --version   # RECORD this string into DEPLOYMENT-GATE.md
/usr/bin/time -v npx remotion render src/index.ts ClaimVideo out/claim-evidence.mp4 --codec=h264
```
Record: wall clock, Maximum resident set size, User/System CPU time,
output bytes, resolution (1280x720), duration.

## Step 8 — final validator (on Pig)
`cd /tmp/remotion-poc && node validate-final.cjs` → expect VALIDATOR_PASS.
Also run `node validate-final.cjs --tamper-test` → expect VALIDATOR_FAIL
(negative control).

## Step 9 — close the gate
Fill REMOTION VERSION + measured render numbers into DEPLOYMENT-GATE.md.
MP4 artifact: /tmp/remotion-poc/video/out/claim-evidence.mp4 on the Pig.
