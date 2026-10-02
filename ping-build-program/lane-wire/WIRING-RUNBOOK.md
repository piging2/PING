# WIRING RUNBOOK — first major milestone live write
## PING MULTI-SOURCE ACQUISITION: 2,503 envelopes -> canonical journal

**Authorization gate (do not proceed without this):**
INGEST-001 must be a GO from Nolan. One line: *"Nolan authorizes POSTing the
2,503 wiring-wave envelopes to the live Pig gateway /ingest."*
Without that exact authorization, stop here. Nothing below may run.

**What this proves (once):** git repo -> observation, GitHub object ->
observation, GBP (fixture) object -> observation, all through
`POST /ingest -> CanonicalizationService -> UnifiedEventRuntime.emit`
(phase0-verified canonical authority), with canonical persistence,
provenance (evidence sha256 refs), duplicate-delivery safety
(idempotent re-POST), and knowledge-pipeline reachability by the ID
handoff contract (KNOWLEDGE-PIPELINE-TRACE.md).

**Dry-run status already proven:** `node ingest-sim.mjs` = ALL CHECKS PASS
(2,503 envelopes, 2,500 expected journal rows, 3 within-source redeliveries
absorbed, 422/400 negative probes correct). `node recovery-sim.mjs` = pass
(checkpoint unmoved by crash, recovery resumes from old checkpoint, 0 dup rows).

---

## Step 0 — resolve the live gateway and the bearer (no decisions)

Run on the Pig (WSL). Every command is exact.

```bash
# 0a. Confirm the recorded repo state is untouched before any write sequence.
cd /home/nolan/projects/ping-bcq-substrate
git worktree list --porcelain | head -8
git branch --show-current          # expect: lane/bcq-connector-substrate
git status --short                # expect: only "?? src/fyd/connectors/"
```

```bash
# 0b. Resolve the live gateway URL (do not hardcode; verify at runtime).
docker port ping-gateway
# expect: 8080/tcp -> 0.0.0.0:8080   (host port may differ; use what it prints)
# GATEWAY=http://127.0.0.1:<host-port>   (from the Pig)
```

```bash
# 0c. Confirm the running container code is the phase0-verified build.
docker exec ping-gateway sha256sum /app/gateway/events/unified_event_runtime.js 2>/dev/null \
  || docker exec ping-gateway sha256sum /app/ping-runtime/events/unified_event_runtime.js
# expect: 2f56ba17e694eff76d0a2384510415759937a6dd2c44a4a06ed26d8b4969937a6dd2c44a4a06ed26d8b7...
# (must start with 2f56ba17 — the phase0-verified digest; abort otherwise)
```

```bash
# 0d. Load the bearer into a shell variable ONLY. Never echo it, never write
#     it to a file, never include it in any report or log.
export PING_INGEST_BEARER="$(docker exec ping-postgres psql -U postgres -d crx_runtime -tAc \
  "SELECT api_key FROM exterior_agent_credentials WHERE agent_id='muse' AND is_active LIMIT 1")"
[ -n "$PING_INGEST_BEARER" ] && echo BEARER_LOADED || echo BEARER_MISSING_ABORT
# expect: BEARER_LOADED. If BEARER_MISSING_ABORT: stop, escalate (credential issue).
```

```bash
# 0e. Sanity probe (read-only): auth works, ingest route is mounted.
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $PING_INGEST_BEARER" \
  "$GATEWAY/ingest" -X POST -H 'content-type: application/json' -d '{}'
# expect: 400  (route reached, body validation rejected the empty object)
```

**Abort conditions for Step 0:** bearer missing, gateway unreachable, container
digest mismatch, or INGEST-001 not a GO. Any of these -> stop, report, do not
proceed.

---

## Step 1 — POST the 2,503 envelopes (the live write)

```bash
cd ~/workspace/ping-build-program/lane-wire
wc -l milestone-envelopes-all.jsonl
# expect: 2503

node run-live.mjs --gateway "$GATEWAY" \
  --envelopes milestone-envelopes-all.jsonl \
  --out live-run-RESULTS.json
# Exit 0 = ALL LIVE ASSERTIONS PASS. Exit 1 = assertion failed (see RESULTS).
```

What the script does, in order (no decisions needed):
1. POSTs each envelope to `/ingest` with the bearer; records http + eventId per
   logicalId (10 ms pacing).
2. Asserts every response is 201.
3. Reads back via `GET /events/recent` (same bearer): filters the three source
   strings, diffs journal `event_id`s against locally recomputed content-
   deterministic eventIds (exact emit formula), asserts zero missing / zero
   extra rows and eventId uniqueness.
4. Asserts native Git SHA citations: for every `git:commit:<sha>` row, the
   journal payload's `sha` equals the SHA in the logicalId.
5. Re-POSTs all 2,503 envelopes; asserts every response is 201 with the
   IDENTICAL eventId and the journal row count is unchanged
   (ON CONFLICT DO NOTHING; handlers not re-triggered).

Expected final numbers: 2,503 POSTs -> 201; journal rows for the three sources
= 2,500 (3 within-source redeliveries dedupe: the same octocat/Hello-World repo
recorded in 3 fixtures and one issue recorded twice); re-POST adds 0 rows.

---

## Step 2 — independent DB cross-check (proves persistence, not just the API)

```bash
docker exec ping-postgres psql -U postgres -d crx_runtime -tAc "
SELECT count(*) FROM ping_events
WHERE source IN ('git-ingestor:lane-a',
                 'connector:github-connector:lane-conn',
                 'connector:google-business-profile:lane-conn');"
# expect: 2500

docker exec ping-postgres psql -U postgres -d crx_runtime -tAc "
SELECT count(*) FROM (SELECT event_id FROM ping_events
WHERE source IN ('git-ingestor:lane-a',
                 'connector:github-connector:lane-conn',
                 'connector:google-business-profile:lane-conn')
GROUP BY event_id HAVING count(*) > 1) d;"
# expect: 0   (event_id is the PK; this is the duplicate-delivery safety proof)

docker exec ping-postgres psql -U postgres -d crx_runtime -tAc "
SELECT count(*) FROM ping_events e
WHERE e.source='git-ingestor:lane-a'
  AND e.payload->>'kind'='git_commit'
  AND e.payload->>'sha' IS NOT NULL
  AND length(e.payload->>'sha')=40;"
# expect: >0  (native Git SHAs present as citations in the journal)
```

---

## Step 3 — record and report

1. Copy `live-run-RESULTS.json` to the lane-wire dir (it is already written there).
2. Append a dated entry to `~/workspace/ping-build-program/lane-wire/STATE.md`
   (see the template at the bottom of this runbook).
3. Report to the parent agent: milestone status, the six assertion results,
   the journal row count, any failed assertion with its evidence.
   Do NOT include the bearer or any credential material.

**Do not:** commit anything, touch shared branches, reset/clean/checkout,
modify the BCQ worktree further, or POST anything beyond these 2,503 envelopes.
The re-POST in Step 1 is the only permitted duplicate traffic, and it is the
idempotency proof itself.

---

## Troubleshooting (no decisions, just branches)

| Symptom | Action |
|---|---|
| Any POST returns 422 | Stop. The registry changed since the dry run. Record the eventType + error, report, do not retry. |
| Any POST returns 401 | Bearer invalid/expired. Re-run Step 0d. If still 401, stop, escalate (credential issue). |
| Any POST returns 400 | Stop. Envelope shape rejected. Record logicalId + error, report, do not retry. |
| `eventIdsMatch` fails (missing > 0) | Rows were not persisted. Check gateway logs (`docker logs ping-gateway --tail 200`). Report; do not re-POST blindly (re-POST is safe by idempotency, but diagnose first). |
| Gateway unreachable mid-run | Stop. The script is resumable: re-running it re-POSTs everything and the journal dedupes (this is the recovery property). Fix connectivity, then re-run from Step 1. |
| Container digest mismatch (Step 0c) | Abort. The running code is not the phase0-verified build. Escalate (canonical-corruption risk). |

---

## STATE.md entry template (paste after the run)

```
## LIVE RUN <UTC date> — INGEST-001 GO
- Envelopes POSTed: 2503 (git 2487 / github 11 / gbp 5)
- 201s: <n> | journal rows (3 sources): <n> | duplicate event_ids: 0
- Idempotent re-POST: <n> replays, 0 new rows, identical eventIds
- Git SHA citations verified: <n> rows
- Assertions: <list any failures, else ALL PASS>
- Results file: ~/workspace/ping-build-program/lane-wire/live-run-RESULTS.json
- Milestone status: <PROVEN-live / BLOCKED-exact + blocker>
```
