# GATEWAY PROMOTION RUNBOOK: jev/verdict-authority-hardening @ fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f

**Status: GO — Nolan 2026-09-24 ~11:08 MDT.** The live cutover is AUTHORIZED
after bounded preflight: pin certified image by immutable digest, re-run
Step -1 live observation, re-prove rollback, re-prove P0 verdict-forgery
rejection, confirm zero unexpected journal/projection mutation. Bounded: no DB
migration, no Qdrant migration, no pg_hba change, no compose-wide apply.
The live gateway on 8080 was NOT touched during prep (read-only `docker inspect`
and git reads only; no container was restarted, recreated, renamed, stopped, or probed
over HTTP).

**Decision record.** Nolan 2026-09-23: PROMOTE the verified candidate
`jev/verdict-authority-hardening @ fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f` with
PRODUCTION GATE CLOSURE as the acceptance criterion. Promotion is not green until the
running 8080 image is proven to contain and enforce the P0 gate
(`POST /orchestration/engine/loop` must be gated). Rollback default: the previous
image is held for non-security regressions ONLY; a security-relevant failure rolls to
"route closed", never back to a known-ungated image.

**Scope.** This runbook covers the standalone `ping-gateway` container on the Pig
(port 8080, bridge network). It does NOT cover the Oracle plane
(`OPERATOR-RUNBOOKS-PROMOTION.md` in the Pig repo root is Oracle-plane scoped:
compose project `oracle`, network `oracle_ping_internal`, images
`candidate-3c5d280dd` / `candidate-84486f056`; none of those exist on this host).

---

## 1. Candidate verification evidence (2026-09-24, read-only)

### 1a. Source identity

- Commit `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
  ("security(jev): register JEV_DECISION_EVALUATED in generated event artifacts"),
  2026-09-23, branch `jev/verdict-authority-hardening` (also contained in
  `lane/ping-core-perfection-jev`). Verified present in the Pig repo at `~/ping`.
- The jev gate series on this branch:
  - `5bb2d08b5` security(jev): verdict authority admission + replay payload
    precedence lock (the P0 gate itself)
  - `8bdfdfd78` security(jev): commit missing shadow worker pair into candidate
  - `8eccdfcf9` security(jev): add permanent production-bootstrap load regression gate
  - `fffe99f7a` security(jev): register JEV_DECISION_EVALUATED in generated event artifacts

### 1b. The P0 gate: code path (proven in source at the certified commit)

File: `ping-runtime/events/unified_event_runtime.js` (commit `5bb2d08b5`).

- `VERDICT_PRODUCERS` (frozen map): `REPLAY_COMPLETED -> 'replay'`,
  `WITNESS_CREATED -> 'witness'`, `WITNESS_REJECTED -> 'witness'`,
  `LINEAGE_CREATED -> 'lineage'`, `JEV_DECISION_EVALUATED -> 'jev-shadow'`.
- `_assertVerdictAuthority(eventType, source, payload)`: non-verdict types pass;
  verdict-class types require source to equal the registered producer worker AND
  `verdictProvenanceOk()` shape checks (e.g. `JEV_DECISION_EVALUATED` requires
  `mode === 'shadow'` and an `evaluations` array). Failures return
  `{ ok: false, reason: 'verdict_not_authorized: ...' }` or
  `'verdict_provenance_missing: ...'`.
- Wired at `UnifiedEventRuntime.emit`, step 2b: runs BEFORE persistence and BEFORE
  the `_skipGovernance` branch. Bridges, replays, and internal callers cannot bypass
  it. There is exactly one admission choke point and this is it.
- Companion hardening in the same commit: `WitnessWorker` qualifies execution
  evidence before attesting and emits `WITNESS_REJECTED` with observable refusal on
  insufficient evidence; `ReplayWorker` no longer honors caller-supplied replay
  transcripts unless built with test-harness metadata.
- Adversarial coverage committed with the gate: `gateway/test_verdict_authority.js`
  (8 admission cases), `gateway/test_replay_precedence.js` (6 cases),
  `gateway/test_witness_adversarial.js` (9 cases). The canonical rejection shape is
  `{ status: 'error', error: /verdict_not_authorized/ }`.

### 1c. What the gate is NOT (read this before writing the negative test)

There is NO HTTP bearer/auth middleware on `POST /orchestration/engine/loop` or
`POST /events` at the candidate commit. `gateway/exterior_auth_middleware.js`
existed at the Sep 20 rc (`4d522a6b`) but is absent at `fffe99f7a`; the gateway's
global middleware is CORS + JSON parsing only. So "gated" for the loop route means
**verdict-forgery closure at the durable journal**, not HTTP 401. An unauthenticated
caller can invoke the route, but no verdict-class event can be smuggled through it:
every verdict-shaped emission fails closed at `emit` step 2b before persistence.
If HTTP-level auth on the route is desired, that is a separate decision, not part of
this candidate.

### 1d. Image status: candidate image built and certified (2026-09-24, supersedes the earlier BLOCKING GAP)

Built from a clean clone at `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f` using the
committed selective-copy Oracle Dockerfile (build lane decision recorded):
- Tag: `ping-gateway:candidate-fffe99f7a`
- Digest (immutable pin): `sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`
  (built 2026-09-24T16:47:35Z per OCI label)
- Labels verified on the image: `org.opencontainers.image.revision =
  fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`,
  `org.opencontainers.image.source =
  local:jev/verdict-authority-hardening@fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
- `docker cp` of `/app/ping-runtime/events/unified_event_runtime.js` from the
  image was byte-identical to
  `git show fffe99f7a:ping-runtime/events/unified_event_runtime.js`
- Isolated adversarial proof: forged verdict events rejected, zero rows persisted,
  the `/orchestration/engine/loop` route still returned 200, in-image gate suite
  34/34 green. Live 8080 was not touched during the build or the proof.
- Compose placeholder filled with the digest; image entrypoint (`/app`,
  `node gateway/server.js`) matches the compose service definition.

The live 8080 gateway remains on `ping-gateway:devin-boundary2`
(`sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`).
Re-observed 2026-09-24 ~11:25 MDT: still running, started 2026-09-22T16:54:48Z.

### 1e. Forensic baseline (from the promotion decision)

Forensics found zero durable `auto_scan` / `bypass_type` rows in the journal.
Claim only "no durable contamination found", never "never exercised": the Sep 16
and Sep 20 images lack the P0 gate, so `POST /orchestration/engine/loop` is
effectively ungated in production right now; holding preserves a known live defect.

---

## 2. Live baseline (read-only snapshot, 2026-09-24)

Observed via `docker inspect` / `docker ps` only. Nothing was changed.

- Container: `ping-gateway`
- Image: `sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`
  (`ping-gateway:devin-boundary2`)
- Started 2026-09-16 via `docker run` (NOT compose-managed; no Docker healthcheck)
- Ports: `0.0.0.0:8080 -> 8080/tcp`
- Restart policy: `unless-stopped`; NetworkMode: `bridge`
- Volume: `muse-workspace` -> `/app/workspace/muse` (external named volume, RW)
- Env (non-secret): `NODE_ENV=production`, `LOG_LEVEL=INFO`,
  `QDRANT_URL=http://host.docker.internal:6333`, `QDRANT_HOST=ping-qdrant`,
  `QDRANT_PORT=6333`, `POSTGRES_HOST=host.docker.internal`, `POSTGRES_PORT=5432`,
  `POSTGRES_USER=postgres`, `POSTGRES_DB=ping_runtime`
- Secrets present in container env (re-resolvable via SSH at cutover time; NEVER
  written to files, memory notes, or chat): `MUSE_LEVEL_1_KEY`, `MUSE_LEVEL_2_KEY`,
  `POSTGRES_PASSWORD`
- `brain-qdrant` publishes 6333/6334 on the host, so
  `http://host.docker.internal:6333` inside the container reaches it.
- Companion container `ping-rc-gateway` (`ping-gateway:rc-4d522a6b`) listens on
  `127.0.0.1:18099`. It is the Sep 20 staging sandbox, NOT live traffic; leave it
  alone during this promotion.

---

## 3. Pre-go checklist (every item must be true before any go)

1. Candidate image built from a clean clone at `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
   per the section 4 recipe; `docker inspect` shows the digest and OCI labels with
   `org.opencontainers.image.revision` starting `fffe99f7a`.
2. Static code proof from the image passes (section 5, step 2).
3. `docker compose -f ping-gateway.compose.yml config` renders clean with the
   digest placeholder filled.
4. A Pig-side `.env` exists next to the compose file carrying `MUSE_LEVEL_1_KEY`,
   `MUSE_LEVEL_2_KEY`, `POSTGRES_PASSWORD` (names only in the repo; values never
   committed). Values re-resolved from the live container env via SSH at cutover.
5. Pre-cutover snapshot captured per section 6.

---

## 4. Compose definition and candidate image build recipe

The finalized compose is `ping-gateway.compose.yml` in this directory. It retires
the `docker run` deployment: exact env wiring from the live baseline, the real
Docker healthcheck (proven 200 pattern from the connectors lane), `restart:
unless-stopped`, external `muse-workspace` volume, port `8080:8080`.

- `image:` is `ping-gateway:candidate-fffe99f7a@sha256:<FILL_AFTER_BUILD>`.
  The placeholder is intentional. Never deploy without the digest filled.
- Secrets use `${VAR:?set in Pig-side .env}` so compose fails fast instead of
  booting with empty credentials. Non-secret values carry the observed live
  defaults. The compose file itself contains no secret values.

### Candidate image build recipe (executed 2026-09-24 by the build lane; recipe retained for audit)

1. Clean clone of the PING repo at `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
   (detached HEAD, `git status` clean; the image must contain zero uncommitted bytes).
2. **Dockerfile decision required before building.** Two candidates exist:
   - `infrastructure/oracle/Dockerfile.gateway` @ `fffe99f7a` (node:18-alpine,
     selective COPYs of `gateway/`, `ping-runtime/`, `runtime/`,
     `infrastructure/physical_clock_adapter.js`, `GENERATION_MANIFEST.yaml`,
     `database/`, plus the constitutional-dist tsc compile from `d3ad88c39`);
   - the Sep 20 rc recipe (`releases/candidate-4d522a6b/Dockerfile.candidate`):
     node:20-alpine, `COPY package*.json`, `npm ci --only=production`, `COPY . .`,
     `CMD ["node", "gateway/server.js"]` (see `~/workspace/pig-rc/CERTIFICATION-PACKET.md`).
   Do NOT build until the lane owner picks one; pinning a digest from the wrong
   recipe would certify the wrong artifact.
3. Labels (mirror the rc provenance pattern):
   `org.opencontainers.image.revision=fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`,
   `org.opencontainers.image.source=local:jev/verdict-authority-hardening@fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`,
   `org.opencontainers.image.created=<UTC timestamp>`,
   `org.opencontainers.image.title=ping-gateway promotion candidate`,
   `org.opencontainers.image.description` naming the 2026-09-23 promotion decision.
4. Tag `ping-gateway:candidate-fffe99f7a`; record the digest; fill the compose placeholder.
5. Known Pig build quirk (from the rc packet): Docker Desktop `credsStore desktop.exe`
   is broken in non-interactive sessions; use `DOCKER_CONFIG` with an empty
   `config.json` (anonymous public pull) as the workaround.

---

## 5. P0-gate proof procedure for live 8080 (post-cutover)

Run in order. Any step failing FAILS the promotion (see section 8 for the
security-failure path). All commands run on the Pig via `pigwsl-run.sh`.

**Step 0. Identity: the running image IS the candidate.**
```
docker inspect ping-gateway --format '{{.Image}}'
# expect: sha256:<the pinned candidate digest from the compose file>
docker inspect ping-gateway:candidate-fffe99f7a --format '{{json .Config.Labels}}'
# expect org.opencontainers.image.revision starting with fffe99f7a
```
If the digest differs, stop. The gate cannot be claimed for a different image.

**Step 1. Static: the image bundles the gate code (non-running probe).**
```
docker create --name gate-probe ping-gateway:candidate-fffe99f7a@sha256:<digest> true
docker cp gate-probe:/app/ping-runtime/events/unified_event_runtime.js /tmp/uer-image.js
docker rm gate-probe
grep -c "VERDICT_PRODUCERS\|_assertVerdictAuthority\|JEV_DECISION_EVALUATED: 'jev-shadow'" /tmp/uer-image.js
# expect: 3 (all present)
sha256sum /tmp/uer-image.js
# compare against: git -C ~/ping show fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f:ping-runtime/events/unified_event_runtime.js | sha256sum
# expect: identical hashes
```
`docker create` + `docker cp` never starts the container.

**Step 2. Negative: forged verdicts are rejected and nothing persists.**
```
curl -s -o /tmp/neg1.json -w '%{http_code}\n' -X POST http://127.0.0.1:8080/events \
  -H 'Content-Type: application/json' \
  -d '{"event_type":"WITNESS_CREATED","aggregate_id":"p0-proof","aggregate_type":"gate","event_data":{"documentId":"d1","witness":{"attestation":"w-x"},"upstreamEventId":"e1"}}'
# expect HTTP 500 and body containing: verdict_not_authorized
curl -s -o /tmp/neg2.json -w '%{http_code}\n' -X POST http://127.0.0.1:8080/events \
  -H 'Content-Type: application/json' \
  -d '{"event_type":"JEV_DECISION_EVALUATED","aggregate_id":"p0-proof","aggregate_type":"gate","event_data":{"mode":"shadow","evaluations":[]}}'
# expect HTTP 500 and body containing: verdict_not_authorized
  (source 'api' is not the registered producer 'jev-shadow')
```
The 500 comes from `asyncHandler` mapping the emit error; the acceptance signal is
the `verdict_not_authorized` body AND zero new rows (verified in step 4).

**Step 3. Loop: the autonomous loop cannot smuggle verdicts.**
```
curl -s -X POST http://127.0.0.1:8080/orchestration/engine/loop \
  -H 'Content-Type: application/json' \
  -d '{"maxIterations":1,"minPriority":10,"missionsPerIteration":1}' | head -c 400
# expect HTTP 200 with "resolved" and "dashboard" fields
# (bounded params: at most 1 iteration, priority >= 10, 1 mission)
```
Note: this route intentionally returns 200 (section 1c). The gate is proven by the
forensic checks in step 4, not by the status code.

**Step 4. Forensic: the journal shows closure.**
Run against the gateway's Postgres (`ping_runtime` via `host.docker.internal:5432`;
table `ping_events(event_id, event_type, source, timestamp, payload, metadata, namespace)`):
```sql
-- a. no bypass contamination, before and after the loop trigger
SELECT count(*) FROM ping_events
WHERE payload::text LIKE '%auto_scan%' OR payload::text LIKE '%bypass_type%';
-- expect: 0

-- b. every durable verdict came from its registered producer, never 'api'
SELECT event_type, source, count(*) FROM ping_events
WHERE event_type IN ('REPLAY_COMPLETED','WITNESS_CREATED','WITNESS_REJECTED','LINEAGE_CREATED','JEV_DECISION_EVALUATED')
GROUP BY 1,2;
-- expect: sources are only replay / witness / lineage / jev-shadow; zero 'api' rows

-- c. the negative probes persisted nothing (aggregate_id lives in metadata, not a column)
SELECT count(*) FROM ping_events WHERE metadata->>'aggregate_id' = 'p0-proof';
-- expect: 0
```

**Step 5. Positive: the gateway is healthy and serving.**
```
curl -sf http://127.0.0.1:8080/health && echo GATEWAY_HEALTHY
docker inspect ping-gateway --format '{{.State.Health.Status}}'
# expect: healthy
```
Soak 30 minutes: no crash loop, no new error signatures in logs, error rate at baseline.

---

## 6. Pre-cutover snapshot steps

Capture BEFORE any cutover command. The inspect dump contains secret env values:
store it redacted, and keep an env hash for equality checks (no secrets in logs).

```
# 1. Full config (redact MUSE_LEVEL_*_KEY and POSTGRES_PASSWORD before storing)
docker inspect ping-gateway > /opt/ping/promotion/precutover-inspect.json

# 2. Env equality hash (names AND values, no values in logs)
docker exec ping-gateway env | sort | sha256sum | tee /opt/ping/promotion/precutover-env.sha256

# 3. Image identity
docker inspect ping-gateway --format '{{.Image}} {{.Config.Image}}' | tee /opt/ping/promotion/precutover-image.txt
# expect: sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20 ping-gateway:devin-boundary2

# 4. DB markers (ping_runtime) - no sequence column exists on ping_events, so the
#    max(sequence) query was removed as unrepairable (it errors verbatim)
SELECT count(*) AS total FROM ping_events;
SELECT now() AS snapshot_at;

# 5. Health baseline
curl -s http://127.0.0.1:8080/health | tee /opt/ping/promotion/precutover-health.json
```

---

## 7. Post-cutover verification

1. Run the full section 5 proof procedure. All steps must pass.
2. `docker compose -f ping-gateway.compose.yml ps` shows `ping-gateway` up and
   compose-managed (labels `com.docker.compose.project` present).
3. Record the promotion: one row in `deployment_registry` (image tag, digest,
   source SHA `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`, timestamp, operator,
   rollback image held), plus a daily-log entry.
4. Keep the renamed-aside pre-cutover container until the 30-minute soak passes;
   only then remove it. Never delete the pinned candidate image or the held
   rollback image.

---

## 8. Rollback runbook

Cutover pattern (for the cutover lane): rename the live container aside, never
delete it before soak:
```
docker rename ping-gateway ping-gateway-precutover
docker compose -f ping-gateway.compose.yml up -d   # brings up the new ping-gateway
```

### 8a. Non-security regression: roll back to the held previous image

Trigger: crash loop, healthcheck never healthy, `/health` non-200, functional
breakage or perf regression with NO security impact (section 5 steps 2-4 pass).

The held previous image is `ping-gateway:devin-boundary2`
(`sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`).
It is known-ungated; rolling back to it is acceptable ONLY on this path.

```
docker rm -f ping-gateway
docker rename ping-gateway-precutover ping-gateway
docker start ping-gateway
for i in $(seq 1 12); do curl -sf http://127.0.0.1:8080/health && break || sleep 10; done
```
Then: record the rollback in `deployment_registry` and the daily log with the
acceptance item that failed and the diff that caused it. Do not retry blindly.

### 8b. Security-relevant failure: close the route, do NOT roll back

Trigger: any section 5 gate check fails closed the wrong way, i.e. a forged
verdict is ACCEPTED (negative probe returns 200/ok), an unauthorized verdict row
appears in the journal (`source = 'api'` among verdict types), or `auto_scan` /
`bypass_type` rows appear after the loop trigger.

```
docker stop ping-gateway
# 8080 serves nothing. Do NOT rename ping-gateway-precutover back up.
# Do NOT roll back to ping-gateway:devin-boundary2: it is known-ungated.
```
Then: record the security failure in `deployment_registry` and the daily log,
preserve the journal and container logs as evidence, and hold for a fixed
candidate. The route stays closed until a new promotion passes section 5.

### 8c. Standing rules

- Never roll back to, or deploy, an unvetted image.
- Never delete the pinned candidate image or the held rollback image before the
  replacement soak passes.
- Never `docker compose up --build` as a release path; releases deploy the
  digest-pinned `image:` only.
- Never promote without PRODUCTION GATE CLOSURE (section 5 all green).

---

## 9. Gaps that block a future go

1. ~~Candidate image not built~~ RESOLVED 2026-09-24: image
   `ping-gateway:candidate-fffe99f7a` built from clean `fffe99f7a`; digest
   `sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`;
   compose placeholder filled.
2. ~~Dockerfile decision~~ RESOLVED 2026-09-24: the committed selective-copy
   Oracle Dockerfile (`infrastructure/oracle/Dockerfile.gateway` @ `fffe99f7a`)
   was used; the image's gate file is byte-identical to source.
3. **HTTP auth on the loop route is absent by design of the candidate**
   (section 1c). If Nolan wants an HTTP-level gate too, that is new scope, not
   part of this promotion.
4. **HOLD/reaper safety (scheduler path included).** The candidate bundles the
   orchestration loop route and `reapExpiredLeases` (`WHERE status IN
   ('running','assigned')` -> `created`), but it contains NO HOLD state and NO
   watchdog: HOLD/parked semantics (aa267e380) were never merged into this
   branch, and the watchdog is a separate deployment that is Nolan-gated. So no
   UNKNOWN/HOLD mission can be turned `created` by THIS image's reaper. When the
   F-01 HOLD lane deploys later, the reaper MUST be re-proven against the HOLD
   invariant before that deployment.

## 10. Evidence index

- Candidate commit: Pig repo `~/ping`, `git show fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`
- Gate code: `ping-runtime/events/unified_event_runtime.js` (`VERDICT_PRODUCERS`,
  `_assertVerdictAuthority`, emit step 2b), via commit `5bb2d08b5`
- Adversarial tests: `gateway/test_verdict_authority.js`,
  `gateway/test_replay_precedence.js`, `gateway/test_witness_adversarial.js`
- rc certification packet (build recipe reference): `~/workspace/pig-rc/CERTIFICATION-PACKET.md`
- Reconstructed compose (starting point): workspace repo commit `ab71dd1`,
  `connectors/ping-gateway.compose.yml`
- Oracle-plane promotion runbook (different plane, same rollback policy):
  `OPERATOR-RUNBOOKS-PROMOTION.md` in the Pig repo root
