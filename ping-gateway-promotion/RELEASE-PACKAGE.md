# RELEASE PACKAGE: ping-gateway promotion (jev/verdict-authority-hardening @ fffe99f7a)

Lane: P1 Gateway release package. Written 2026-09-24 ~11:30 MDT by the release-package lane.
The live 8080 gateway was NOT touched. No cutover executed.

## 1. Digest pin (immutable)

- Tag: `ping-gateway:candidate-fffe99f7a`
- **Digest: `sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`**
- Image built 2026-09-24T16:47:35Z from a clean clone at
  `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f` using the committed selective-copy
  Oracle Dockerfile (`infrastructure/oracle/Dockerfile.gateway` @ `fffe99f7a`).
- OCI labels verified on the image: `revision=fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`,
  `source=local:jev/verdict-authority-hardening@fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`.
- Compose image field now reads:
  `ping-gateway:candidate-fffe99f7a@sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`
- Image entrypoint verified: `wd=/app`, `cmd=["node","gateway/server.js"]`,
  `/app/gateway/server.js` present via docker cp.
- `docker compose config` renders clean against the digest (validated on the Pig
  with dummy-only secret values; the real Pig-side `.env` is a cutover-time step).

## 2. Runbook query repairs (diff applied to RUNBOOK.md)

Two queries in the runbook were broken against the actual `ping_events` schema
(`event_id, event_type, source, timestamp, payload, metadata, namespace, processed,
created_at` — there is NO `sequence` column and NO `aggregate_id` column;
aggregate_id lives inside `metadata` JSONB, set by `gateway/routes/events.js`).

- Section 5 step 4c (negative-probe forensic):
  - BEFORE: `SELECT count(*) FROM ping_events WHERE aggregate_id = 'p0-proof';`
    (errors: column does not exist)
  - AFTER: `SELECT count(*) FROM ping_events WHERE metadata->>'aggregate_id' = 'p0-proof';`
- Section 6 step 4 (pre-cutover DB markers):
  - BEFORE: `SELECT max(sequence) AS max_seq, count(*) AS total FROM ping_events;`
    (errors verbatim) plus a redundant second `count(*)`.
  - AFTER: `SELECT count(*) AS total FROM ping_events;` and `SELECT now() AS snapshot_at;`
    (the max(sequence) query was removed as unrepairable).

## 3. HOLD/reaper safety check (scheduler path IS included)

- The candidate bundles `POST /orchestration/engine/loop` and
  `reapExpiredLeases` (`WHERE status IN ('running','assigned')` -> `created`).
- The candidate contains NO HOLD state and NO watchdog: HOLD/parked semantics
  (aa267e380) were never merged into this branch, and the watchdog is a
  separate Nolan-gated deployment.
- Result: this image's reaper CANNOT turn an UNKNOWN/HOLD mission into `created`,
  because HOLD is not a status this image can produce. The CEO contradiction is
  not present in this release.
- Reservation: when the F-01 HOLD lane deploys later, the reaper MUST be
  re-proven against the HOLD invariant before that deployment.

## 4. Rollback identity (re-proven 2026-09-24 ~11:25 MDT)

- Live container `ping-gateway` still runs
  `sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`
  (`ping-gateway:devin-boundary2`), started 2026-09-22T16:54:48Z. Unchanged.
- Held rollback image confirmed present on the Pig at the same digest.
- Rollback policy per RUNBOOK section 8: previous image held for non-security
  regressions ONLY; any security-relevant failure closes the route, never rolls
  back to a known-ungated image.

## 5. Certification evidence (already on file)

- In-image gate file byte-identical to source at `fffe99f7a`.
- Isolated adversarial proof: forged verdict events rejected with zero persisted
  rows; `/orchestration/engine/loop` still returned 200; in-image gate suite
  34/34 green.
- Acceptance model: P0 gate = verdict-forgery closure at the durable journal,
  NOT HTTP 401 (HTTP auth on the loop route is absent by candidate design;
  new scope if desired).

## 6. Release checklist (pre-go)

- [x] Candidate image built from clean `fffe99f7a`, digest pinned, labels verified
- [x] Static code proof from the image (gate file byte-identical to source)
- [x] Adversarial proof 34/34 on the image, zero persisted rows on forged verdicts
- [x] Compose digest placeholder filled; `docker compose config` renders clean
- [x] Runbook queries repaired against the live schema
- [x] Live baseline re-observed (Step -1): still devin-boundary2
- [x] Rollback identity re-proven; rollback image held on the Pig
- [x] HOLD/reaper check: no HOLD state in this image; watchdog not part of this release
- [ ] Pig-side `.env` with MUSE_LEVEL_1_KEY, MUSE_LEVEL_2_KEY, POSTGRES_PASSWORD
      (cutover time; values re-resolved from the live container env via SSH)
- [ ] Pre-cutover snapshot per RUNBOOK section 6 (cutover time)
- [ ] Post-cutover section 5 proof procedure all green (cutover time)
- [ ] 30-minute soak: healthy, no crash loop, no new error signatures (cutover time)
- [ ] deployment_registry row + daily-log entry (cutover time)

## 7. Exact runtime verification plan (post-cutover, from RUNBOOK section 5)

1. Identity: `docker inspect ping-gateway --format '{{.Image}}'` equals the pinned
   digest; image labels show revision starting `fffe99f7a`.
2. Static: `docker create`/`docker cp` the gate file from the image, grep the
   three gate markers, sha256-compare against `git show fffe99f7a:...`.
3. Negative: POST forged `WITNESS_CREATED` and `JEV_DECISION_EVALUATED` to
   `/events` -> expect HTTP 500 with `verdict_not_authorized` in the body.
4. Loop: POST `/orchestration/engine/loop` with bounded params -> expect 200
   with `resolved` and `dashboard` (gate proven by forensics, not status code).
5. Forensic (repaired queries): (a) zero `auto_scan`/`bypass_type` rows;
   (b) verdict sources are only replay/witness/lineage/jev-shadow, zero `api`;
   (c) `metadata->>'aggregate_id' = 'p0-proof'` count = 0.
6. Positive: `/health` 200, container health status healthy; 30-minute soak.
7. Record: deployment_registry row + daily log; keep the renamed-aside
   pre-cutover container until the soak passes.

## 8. GO / NO-GO

**Package status: GO for the staged release procedure, gated on cutover-time
items 6.9-6.13 above.** Every item that can be completed before a live
production action is complete: digest pinned, queries repaired, compose
validated, baseline re-observed, rollback identity re-proven, HOLD/reaper
contradiction proven absent from this image, certification evidence on file.

**One action requiring material live-production authorization: the staged
cutover itself** (RUNBOOK section 8 cutover pattern: `docker rename
ping-gateway ping-gateway-precutover`, then `docker compose -f
ping-gateway.compose.yml up -d`, followed by the section 5 proof, the soak,
and the registry/logging writes). Per the standing rule the live gateway stays
untouched until the coordinator executes the staged release procedure with the
cutover-time preflight in hand. The lane does not self-authorize the cutover.
