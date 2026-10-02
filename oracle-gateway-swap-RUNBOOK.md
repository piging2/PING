# ORACLE GATEWAY SWAP RUNBOOK — LANE D

Revision v2, prepared 2026-09-21 ~11:55 UTC by Pigi. Supersedes v1 (2026-09-21 02:45 UTC).

## WHAT CHANGED IN V2 (improvements over v1)

1. **Re-verify-at-execution gate (step -1).** v1's live-state values were 9 hours old at
   revision time and already wrong (the container had been recreated). All live-state
   values in a runbook expire; the operator re-captures everything at execution.
2. **Candidate refresh policy.** v1 pinned commit d3ad88c39. Lane D has since committed
   7a7c7c04c, 9bcccaa23, and 3c5d280dd, and built ping-gateway:candidate-3c5d280dd on
   the Oracle. The runbook now pins the candidate at execution and tells the operator
   how to verify a prebuilt image's provenance.
3. **P0 credential-rotation sequencing.** Rotation is in progress. Env capture (step 2)
   must happen only after rotation completes and gateway connectivity is revalidated,
   or the env file is stale on arrival.
4. **Projection digest is never hardcoded.** v1 named an expected digest from hours
   earlier. Digests are captured at execution and compared pre/post; a digest that
   "matches" a stale value is a red flag, not a pass.
5. **Digest/test-event ordering fixed.** Baseline digest is compared BEFORE the
   post-swap governed test event is written; the post-test digest becomes the new
   baseline. v1 compared after without saying so.
6. **Rename collision guards** (steps 3 and 5): stale containers from a previous
   attempt now stop the run instead of failing mid-swap.
7. **Concrete 8081 exercise commands** with envelope fixtures from the repo test file.
8. **Secret-scan grep patterns** in step 6.
9. **8081 candidate cleanup** added to step 8 (v1 left it running).
10. **ONE GRILL routing**: the operator decision goes through
    ~/workspace/GRILLING-BRIEF.md; no parallel decision artifacts.
11. **Report format**: one concise GO evidence block; quiet otherwise.

STATUS: EXECUTED 2026-09-21 ~12:05Z on Nolan's GO. Live ping-gateway now runs
ping-gateway:candidate-3c5d280dd (4aa9d7f669bc). Previous container kept stopped as
ping-gateway-prev-84486f056 per the 24h rule. Rollback image untouched.

## THE ONE DECISION

"Rebuild (or verify) the Oracle gateway image from the latest verified commit on the
convergence branch and swap the live ping-gateway container onto it, with rollback
ready."

Route this decision through ~/workspace/GRILLING-BRIEF.md. If Nolan says GO, the
operator executes the steps below in order and stops at the first failed gate.
If Nolan says HOLD, nothing changes; the current container keeps serving.

## LIVE STATE (refreshed 2026-09-21 ~11:50 UTC, read-only)

- Container: ping-gateway
- Running image: ping-gateway:candidate-84486f056 (id 467af2dabc08, source 84486f056)
- Started: 2026-09-21T11:25:08Z — recreated during the P0 credential rotation
  (FL-20260920-022, 11:24-11:28 UTC: ping-gateway rebuilt with the new env).
  Cause is KNOWN and verified in the failure ledger. Same image, restart count 0.
- Network: oracle_ping_internal; Port: 8080/tcp -> 127.0.0.1:8080
- Health: GET http://127.0.0.1:8080/health returns 200
- Cmd: node gateway/server.js, workdir /app, user nodejs, restart policy
  unless-stopped, no volume mounts
- Database: crx_runtime (PostgreSQL 17). P0 credential rotation IN PROGRESS.
- **New candidate image already on the Oracle:** ping-gateway:candidate-3c5d280dd
  (id 4aa9d7f669bc), built ~11:44Z from commit
  3c5d280dd3735ceb2deb4433384902d07552d372
  "fix(oracle): compile constitutional-dist in oracle gateway image (FL-20260921-P1)"
  (2026-09-21 05:36 MDT). It already contains d3ad88c39 + 7a7c7c04c + 9bcccaa23.
  It has NOT been run anywhere yet.
- Protected rollback image (DO NOT ALTER):
  oracle-gateway:certified-20260919 (id 8400deecf2a9)
  also tagged oracle-gateway:latest and oracle-gateway:rollback-20260919

## CANDIDATE POLICY

- At execution, the candidate is the latest VERIFIED commit on the convergence
  branch. Pin the SHA, record `git rev-parse HEAD` and `git archive <sha> |
  sha256sum`.
- Current verified candidate: 3c5d280dd (full SHA above).
- If the candidate image already exists on the Oracle (as candidate-3c5d280dd
  does now): verify provenance before reusing. Check `docker inspect` created
  time and confirm the image came from the recorded source archive. If in doubt,
  rebuild from the archive and compare image IDs. **Never deploy an image whose
  source commit you cannot name.**
- Expected endpoint delta: regenerate at execution from the actual diff between
  the running image's source (84486f056) and the candidate SHA. v1's delta
  (POST /identities, GET /identities, BFF envelopes on POST /events,
  SECRET_REJECTED, vocabulary enforcement rejecting unfollows/unlikes) still
  applies; the projector ordering tiebreaker (7a7c7c04c), knowledge ingest
  adapter (9bcccaa23), and constitutional-dist compile fix (3c5d280dd) must be
  confirmed from the diff, not trusted from this paragraph.

## DATA MUTATION: NONE

All state lives in the PostgreSQL journal (crx_runtime). The image swap touches
no database, no table, no journal row. Pre-swap and post-swap projection digests
must match, and the digest is captured at execution (step 4), never copied from
an earlier report.

## EXECUTION STEPS (operator runs these on the Oracle)

-1. RE-VERIFY LIVE STATE (first thing at execution, before anything else):
  - `docker ps` / `docker inspect` ping-gateway: image, started time, restart count.
  - GET http://127.0.0.1:8080/health returns 200.
  - Candidate image exists and its source commit is verified per CANDIDATE POLICY.
  - P0 rotation: complete, and gateway connectivity revalidated after it.
  - The cause of any container recreation since this runbook's revision is known.
  - If anything contradicts this runbook, STOP and update the runbook first.

0. Verify source closure (Pig):
   `cd /home/nolan/ping && git rev-parse HEAD` must equal the candidate SHA.
   `git archive <sha> | sha256sum` — record the value.
   Transfer the archive to the Oracle as /tmp/gateway-src-<sha>.
   (Even when reusing a prebuilt image, record the archive hash for the record.)

1. Build on the Oracle (skip ONLY if step 0 provenance check passed on an
   existing image):
   ```
   cd /tmp/gateway-src-<sha>
   docker build -f gateway/Dockerfile -t ping-gateway:candidate-<sha> .
   ```
   Verify: `docker inspect ping-gateway:candidate-<sha>` shows Architecture arm64
   (native Oracle build); build completes with no errors.

2. Capture current env WITHOUT printing values to any console, chat, or log
   (P0 rule; values stay on the Oracle only). Do this AFTER the P0 rotation
   completes:
   ```
   docker inspect ping-gateway --format \
     '{{range .Config.Env}}{{println .}}{{end}}' > /tmp/gateway-env-<sha>
   ```
   Sanity check (no values shown): file is non-empty and every line matches
   KEY=VALUE with no blank lines. Never cat, echo, or paste this file anywhere.

3. Boot the candidate WITHOUT touching the live container:
   - Guard: if a container named ping-gateway-candidate exists from a previous
     attempt, `docker rm -f ping-gateway-candidate` first.
   ```
   docker run -d --name ping-gateway-candidate \
     --network oracle_ping_internal -p 127.0.0.1:8081:8080 \
     --env-file /tmp/gateway-env-<sha> \
     --restart no -u nodejs -w /app \
     ping-gateway:candidate-<sha>
   ```
   Gate: GET http://127.0.0.1:8081/health returns 200 within 60s.
   Exercise the new surface on port 8081 (use gateway/test_social_ingest_adapter.js
   from the source archive as the envelope fixture reference; do not hand-craft
   crypto):
   a. GET /identities returns 200; response contains no private-key-looking fields.
   b. POST /identities with a valid governed envelope mints; repeating the same
      payload is idempotent (same id, no duplicate); a malformed handle is
      rejected with 4xx.
   c. POST /events with a valid BFF envelope is accepted (2xx).
   d. POST /events with an invalid-signature BFF envelope is rejected (4xx).
   e. POST /events with private-key-looking material is rejected
      (SECRET_REJECTED semantics).
   f. POST /events with an unfollows/unlikes predicate is rejected as
      PREDICATE_NOT_CANONICAL.
   On ANY failure: `docker rm -f ping-gateway-candidate`; STOP; report; record
   in ~/workspace/FAILURE_LEDGER.md with replay instructions BEFORE narrating.

4. Record the pre-swap baseline (three numbers, nothing else):
   - `SELECT count(*) FROM ping_events;`
   - `SELECT max(sequence) FROM ping_events;`
   - Projection digest via the canonical projector digest procedure. Record the
     EXACT command used and the resulting value. This is the baseline.

5. The swap:
   - Guard: if any container named ping-gateway-prev-* exists, STOP. A previous
     attempt left state behind; resolve it before proceeding.
   ```
   docker stop ping-gateway
   docker rename ping-gateway ping-gateway-prev-84486f056
   docker run -d --name ping-gateway \
     --network oracle_ping_internal -p 127.0.0.1:8080:8080 \
     --env-file /tmp/gateway-env-<sha> \
     --restart unless-stopped -u nodejs -w /app \
     ping-gateway:candidate-<sha>
   ```

6. Post-swap gates (ALL must pass, IN THIS ORDER):
   - GET http://127.0.0.1:8080/health returns 200 within 60s.
   - GET /identities returns 200.
   - Projection digest EQUALS the step-4 baseline (compare BEFORE writing the
     test event below).
   - POST /events accepts one governed signed event: max(sequence) is exactly
     baseline + 1; verify hash-bound and Ed25519 through a sanitized read.
   - Record the new projection digest as the new baseline.
   - `docker ps` shows ping-gateway Up; restart count still 0 after 5 minutes.
   - Secret scan (any hit is investigated, never ignored):
     `docker logs ping-gateway | grep -iE 'private[_-]?key|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|password=|passwd|token=|bearer |api[_-]?key|secret='`
     must return nothing. Tune patterns to avoid false positives on field names
     like public_key; a real hit stops the swap.

7. ROLLBACK (only if any gate fails; also available later on Nolan's word):
   NOTE (2026-09-21, proven during the 8080 promotion): the rollback image
   oracle-gateway:certified-20260919 (8400deecf2a9) has NO `nodejs` user
   (default user is root, entrypoint docker-entrypoint.sh). Do NOT pass
   `-u nodejs` or the container fails to start. Omit `-u` entirely.
   ```
   docker stop ping-gateway
   docker rename ping-gateway ping-gateway-failed-<sha>
   docker run -d --name ping-gateway \
     --network oracle_ping_internal -p 127.0.0.1:8080:8080 \
     --env-file /tmp/gateway-env-<sha> \
     --restart unless-stopped -w /app \
     oracle-gateway:certified-20260919
   ```
   Gate: /health 200; projection digest equals the step-4 baseline;
   max(sequence) equals the baseline value (or baseline + 1 with the test event
   explicitly accounted for).
   The rollback image (8400deecf2a9) is NEVER rebuilt, retagged, or deleted.

8. Cleanup only after 24h stable:
   - `docker rm -f ping-gateway-candidate` (the 8081 instance).
   - Remove /tmp/gateway-src-<sha>; `shred -u /tmp/gateway-env-<sha>`.
   - Keep ping-gateway-prev-84486f056 stopped until the 24h mark, then remove it.
   - The rollback image stays forever.

## STOP CONDITIONS

Stop the swap and hold if: step -1 contradicts this runbook; any container recreation
since this runbook's revision is unexplained; build fails; any 8081 exercise fails; health
does not return 200; digest mismatches; secret scan hits; a rename guard trips;
or anything here contradicts live state on re-inspection. Record the failure in
~/workspace/FAILURE_LEDGER.md with replay instructions BEFORE narrating it.

## REPORT FORMAT

When all gates pass, return one concise GO evidence block: candidate SHA, image
ID, 8081 exercise results (a-f), baseline vs post-swap digest, sequence +1
proof, 5-minute stability, secret scan clean. Stay quiet otherwise.

---
v1 prepared by the sprint coordinator, Lane D, 2026-09-21 02:45 UTC (read-only).
v2 revised by Pigi, 2026-09-21 ~11:55 UTC (read-only): no image built, no
container touched, no deployment executed.
