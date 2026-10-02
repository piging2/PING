# Agent 12 — Observability + Recovery (the synthesis verdict)

**Worker:** Agent 12 re-dispatch (bounded forensic worker) · **Mode:** READ-ONLY; COMMITS CREATED: NONE; no patches applied, no journal rows written, no processes touched, no secret values printed · **Date:** 2026-09-24 05:10–06:00 MDT · **Base:** CORE `/home/nolan/ping` (live runtime, read-only) · plus `~/workspace/constitutional-sprint/` (this VM)
**Transport:** `~/workspace/pig/pigwsl-run.sh` (base64-fed bash on Pig WSL), `docker exec brain-postgres psql` read-only SELECTs, one read-only `curl http://127.0.0.1:8080/health`.
**Scope rule (dedupe):** OBS1 (mission traceability), OBS3 (worker/queue), OBS4 (governance trace) are COMPLETE and are cited, not redone. This verdict covers what Agent 12 uniquely owned: (a) the per-mechanism inventory across lanes, (b) the lifecycle-answerability audit — can a random work item's full lifecycle be answered from the trace, (c) the recovery mechanism classification (proven vs theater), (d) broken boundaries at the intersection, (e) the ledger row.
**Already-known recovery facts are cited, not re-proven:** dump.py = the one live proven recovery writer (Agent 20 map row 18); journal durability UNOWNED (row 19, F204/F63, RPO unbounded); destructive recovery authorization UNOWNED/possession-based (row 20, F208); Agent 13's durability verdict F58–F65; F214 (appendOwnerEvent audit rewrite).

---

## 1. Per-mechanism inventory (observability + recovery surfaces, file:line)

### 1a. Durable trace surfaces (answer "what happened" after a restart)

| # | Surface | Writer | Reader / endpoint | Coverage | Citation |
|---|---|---|---|---|---|
| T-1 | `ping_events` (sovereign journal) | `UnifiedEventRuntime.emit` (ON CONFLICT DO NOTHING) | `GET /events*`, causal endpoints `/events/:id/{children,descendants,ancestors}`, `/events/correlation/:id` | All journaled decisions; 2,429 rows live, last write 2026-09-23 23:24 UTC | obs1 (Q1/Q2/Q5); live DB probe 2026-09-24 |
| T-2 | `ping_missions` (mission lifecycle) | `MissionRuntime` via `MissionScheduler` | `/mc/missions/{pending,active,stats}`, `/mc/missions/:id/trace` | created/assigned/running/completed/failed/retry_pending + retries + last error; 471 completed live | obs1 Q3; live DB probe 2026-09-24 |
| T-3 | `repository_dead_letters` (poison sink) | `DeadLetterAuthority.recordDeadLetter` | `/mc/dead-letters*` | job_id, mission_id, correlation_id, causation_id, failure_reason, replayable, witness; 0 rows live | obs1 Q6; live DB probe 2026-09-24 |
| T-4 | `event_processing` (vestigial queue protocol) | `/events/processed|/failed` routes | **NO endpoint reads it** | durable machinery, zero consumers | obs3 row table (queue-protocol) |
| T-5 | `ping_events.processed` (column) | nothing on the live path | nothing | dead column, 2429/2429 FALSE | obs3; F68 |
| T-6 | Adapter owner log `data/fyd-owner/<id>.json` | `appendOwnerEvent` | `projectOwnerState` (pure fold) | append-only + revert-as-append; F214: rewrite-destroy hazard on read failure | obs4 G5; S7 F214 |
| T-7 | Adapter claim store `data/fyd-claims/<id>.json` | `writeClaim` (atomic tmp+rename) | `readClaim`, `GET ?view=inspect` | state + audit history; F19/F211: `release()` destroys VerificationProof | obs4 G4 |
| T-8 | dump.py projections `var/fyd-projections/*.json` | `tools/fyd-site-projection/dump.py` (manual) | `getPingObjectGraph` (digest-verified read) | last regen 2026-09-22 14:50 UTC; dumpedAt field present; NO age check on read | Agent 20 map row 18; FINDINGS-LOG F281; Pig probe 2026-09-24 |
| T-9 | `approvals` / `mission_executions` | ApprovalAuthority / MissionExecutionAuthority | `getApproval*` (code only) | **`approvals` table DOES NOT EXIST in live DB; `mission_executions` = 0 rows** (W12-F1) | live DB probe 2026-09-24 |
| T-10 | Trace correlation keys | bridge/scheduler/workers | `MissionRuntime.getTrace`, `/mc/missions/:id/trace` | correlation_id back-trace code-complete on bridge path; MISSION_* events correlation-orphans | obs1 Q1, T8(4) |

### 1b. Session-only trace surfaces (answer "what's happening now" until restart — then GONE)

| # | Surface | Scope | Restart effect | Citation |
|---|---|---|---|---|
| S-1 | `/mc/scheduler`, `/mc/workers`, `/mc/bridge`, `/mc/event-mission-bridge` | `scope:'session'` in-memory counters | all operational history wiped | obs1 Q5; obs3 row table |
| S-2 | `/scheduler`, `/workers`, `/bridge`, `/event-mission-bridge` (gateway routes) | session stats only | same | obs3 |
| S-3 | `MissionScheduler._processing` (in-flight set) | memory-only Set | only a size is exposed; set contents never durable | obs1 T8(2) |
| S-4 | WorkerRuntime per-worker stats (incl. lastHeartbeat) | in-memory `_stats` | same | obs3 row table (worker-exec) |
| S-5 | EventBridge cursor/errors | `ping_bridge_cursors` durable cursor + **in-memory** errors counter | failures visible only until restart (and F3: cursor advances past failures anyway) | obs3 F3 |

### 1c. Recovery surfaces

| # | Mechanism | Target | State | Citation |
|---|---|---|---|---|
| R-1 | `tools/fyd-site-projection/dump.py` | website projections from journal | LIVE, PROVEN, manual cadence, dirty file | Agent 20 row 18; W12-F5 |
| R-2 | MissionScheduler `failWithRetry` → `DeadLetterAuthority` | poisoned missions | LIVE, PROVEN sink; recovery arrow dead | obs1 Q6; W12-F3 |
| R-3 | Adapter owner-log pure fold (`projectOwnerState`) | owner state | LIVE, PROVEN (fold-twice byte-identity, REACHABILITY A1) | obs4 G5 |
| R-4 | `replayDeadLetter` | DLQ → retry | DORMANT: zero live callers (W12-F3) | obs1 T7(c); Pig grep 2026-09-24 |
| R-5 | `destructive_recovery_certification.py` | "recovery certification" | DORMANT, dangerous (F206) | recovery row |
| R-6 | `backup_postgres.ps1` / PING_BACKUPS.md plan | journal backup | DORMANT, never wired | recovery row |
| R-7 | Checkpoint step in `MissionExecutionAuthority._checkpoint` | execution checkpoint | PHANTOM: `checkpointAuthority` accepted in constructor; no such module on disk; 0 rows ever persisted | W12-F4 |
| R-8 | Journal backup / WAL / replication | `ping_runtime` on `compose_postgres_data` | UNOWNED: archive_mode=off (F63); no pg_dump schedule; no cron on Pig WSL; no Task Scheduler evidence; no backup dir; volume confirmed `compose_postgres_data` (re-anchors F203) | F204/F63; Pig probes 2026-09-24 |
| R-9 | Vector/knowledge recovery (re-embed, Qdrant snapshot) | brain-qdrant / ping-qdrant | UNOWNED: 48% PRNG-noise fallback vectors (F138), no re-embed path; ping-qdrant `Up (unhealthy)`; zero snapshots ever | F138; docker ps 2026-09-24 |

---

## 2. Lifecycle-answerability audit (6 sampled mechanisms across lanes)

Checklist from the task: **why it existed / who claimed it / what it knew / sources / version / decision / tool called (+authorized?) / effect / result / verified–failed–retried–recovered–committed–merged–deployed / successor work**.
Scoring: **Y** = answered from the trace · **P** = partial · **N** = not answerable · **U** = currently unanswerable live (transport dark).

### M1 — Core mission pipeline (bridge-driven canonical chain: REVIEW_RECEIVED → observation → … → lineage)

Ground: OBS1 (T2/T3/T4/T7/T8). Live scale: ping_missions 471 completed; journal last wrote 2026-09-23 23:24 UTC (probe).

| Question | Score | Evidence |
|---|---|---|
| why it existed | Y | bridge maps event_type → mission type (`event_to_mission_bridge.js:52`); `payload.event_type` preserved |
| who claimed it | **N** | `created_by` arbitrary unauthenticated string, stored verbatim, **zero live readers** (OBS1 T5) |
| what it knew | Y | mission payload carries event_id, event_type, source, namespace (event_to_mission_bridge.js:128-135) |
| sources | Y | `payload.event_id` → `ping_events.event_id`; back-trace via `MissionRuntime.getTrace` |
| version | N | no schema/envelope version on the mission payload; envelope versions are write-only provenance (F194) |
| decision | Y | mission row transitions + `MISSION_*` journal events |
| tool called + authorized? | P | `assigned_to` worker label recorded; **authorized? N** — no capability check in the mission path (S5-F1, F101, F125) |
| effect | Y | worker outputs journaled with `causation_id` pointing at real rows (bridge path) |
| result | Y | `result` + `duration_ms` on completed rows |
| verified | P | replay/witness/lineage tail exists in code; live verification of a given chain possible via `/mc/replay/trace/:correlationId` |
| failed | Y | `failed` state + `MISSION_FAILED` events; but per-attempt errors overwritten (last wins) |
| retried | P | retries counted; **reaper lease-resets bypass the retry budget** (OBS1 T8(6)) |
| recovered | **N** | `replayDeadLetter` unwired, zero callers (W12-F3); DLQ is a terminal sink |
| committed/merged/deployed | P | mission `completed` is the terminal durable state; no commit/merge vocabulary exists for missions |
| successor work | P | echo loop creates successor missions **unboundedly** once fueled (OBS1 T1 — dispatch re-match, P-T1 supersedes OBS3-P1) |

### M2 — Adapter owner command → FYD_SITE_OVERLAY → dump.py → public site render (the only live business-value chain)

Ground: OBS4 G2/G5, Agent 20 map rows 12/15/18, FINDINGS-LOG F281, Pig probes.

| Question | Score | Evidence |
|---|---|---|
| why it existed | Y | owner command (correct/hide/restore/confirm/add-service/visibility); provenance in the event |
| who claimed it | P | `approvedBy: "demo-owner (seeded, unverified)"` — recorded honestly as non-authentication; three identity namespaces unlinkable (F189) |
| what it knew | Y | command + basis carried in `fyd-owner@1` event payload |
| sources | Y | journal `FYD_SITE_OVERLAY` events; applied in (timestamp, event_id) order |
| version | N | `fyd-owner@1` generator binding present; no negotiation/version semantics (F194) |
| decision | Y | overlay event journaled with sha256 content-hash ID |
| tool called + authorized? | P | `dump.py` (manual); **authorized? N** — possession-based (F208); gate is demo-owner env flag (F211/F216) |
| effect | Y | regenerated projection file in `var/fyd-projections/` |
| result | P | `dumpedAt` timestamp present; digest verified downstream (fail-closed) |
| verified | Y | downstream digest check is genuinely enforced (Agent 20 row 18) |
| failed/retried | **N** | no failure record; recovery = human reruns dump.py manually |
| recovered | Y | **the proven recovery** — regeneration from the journal is R-1 |
| committed/merged/deployed | P | file written; outputs not committed; **no cron — ~48h stale as of 2026-09-24** (W12-F5) |
| successor work | N | no chain; terminal projection |

### M3 — Core approval-gated code execution (ApprovalAuthority → MissionExecutionAuthority → _commit)

Ground: OBS4 G7/G8 + new live DB probes (W12-F1, W12-F4).

| Question | Score | Evidence |
|---|---|---|
| why it existed | Y | mission record (in theory) |
| who claimed it | **N** | `approved_by='system'` literal or `approveManually` free-string parameter |
| what authorized | **N** | `_evaluateApprovalConditions` uses `testResults.passed \|\| true` — conditions can never block; policy hardcoded "automatic" |
| decision | **N (theater)** | `requestApproval` returns `approval_status`; `_commit` reads `approval.status` → **always throws**; gate is live-dead |
| effect | **N** | no commit can complete through this path |
| result | **N** | **`approvals` table does not exist in live DB; `mission_executions` = 0 rows** — nothing ever persisted (W12-F1) |
| recovered | N | checkpoint step references a **phantom authority** (no checkpoint_authority.js on disk; W12-F4) |
| successor work | N | none |

### M4 — Adapter claim verification (OBSERVED → CLAIMED → VERIFIED-CONTROLLED)

Ground: OBS4 G4, S7 F211, F19, F214.

| Question | Score | Evidence |
|---|---|---|
| why it existed | Y | mandatory human-readable `basis` recorded in the audit event |
| who claimed it | P | `proof.verifiedBy` = self-asserted operatorLabel; honestly labeled "a statement, not a cryptographic proof" |
| what authorized | P | demo-owner-mode gate on route (403 otherwise); **gate = config flag, so any flag-holder can verify any resource** (F211) |
| decision | Y | state transition + audit event appended |
| effect | Y | claim file gains history entry (atomic tmp+rename) |
| result | Y | verify-attempt failures also audited |
| recovered | P | `release()` returns to OBSERVED — **but destroys the VerificationProof** (F19); F214 audit-rewrite hazard destroys history on read failure |
| successor work | N | none |

### M5 — Core witness attestation (WITNESS_CREATED)

Ground: Agent 02 F150/F151, OBS4 G9.

| Question | Score | Evidence |
|---|---|---|
| who claimed it | P | witness worker; authority self-declared (`authority: 'ContinuousReplayAuthority'`) |
| what authorized | **N** | issuance automatic; witness constructed with `success: true` **hardcoded** |
| effect | Y | certificate/witness objects journaled (66 live attestations) |
| verified | **N** | F150: live attestation drops the commitment — **verifyWitness would reject all 66**; the central question the mechanism exists to answer is unanswerable |
| recovered | N | none |

### M6 — Adapter social write (createFydPost → signed envelope → journal → attestation re-read)

Ground: OBS4 G6, Agent 20 map row 14, reachability F13.

| Question | Score | Evidence |
|---|---|---|
| who claimed it | Y | gateway-minted `identity_<16hex>`; Ed25519 from FYD key custody (0600) |
| authorized? | P | dev keypair custody; envelope signs with dev stand-in serializer (F10) |
| effect | Y | journaled events when transport existed |
| verified | Y | `attestRelationshipState` re-reads journal and refuses to report success without it (ATTESTATION_REJECTED) — the one honest gate |
| failed/retried/recovered | **U** | **currently UNANSWERABLE live: lane is dark — nothing listens on 127.0.0.1:18199; zero transport to the journal (F13)** |

### 2a. Cross-lane synthesis (what the audit says)

- **"What happened" is durably answerable** for journaled paths (T-1..T-3, T-6..T-8). The journal holds.
- **"Who did it" is broken or unverifiable in 5 of 6 samples:** arbitrary created_by (M1), seeded demo literal (M2), self-asserted operatorLabel (M4), hardcoded system (M5), and only M6 (social) binds a real keypair — on a lane that is dark.
- **"Was it authorized" is theater on the core lane** (M3 rubber stamp + always-throw gate; M5 hardcoded success) and config-flag-grade on the adapter (M2/M4 demo mode).
- **"Did it recover" has exactly one proven mechanism** (M2's dump.py regen, R-1) and one dead end (M1's DLQ, R-2/R-4); M3's checkpoint is phantom.
- **"What is happening now" dies on restart** (S-1..S-5): every operational counter is session-scoped. A restart erases the entire operational history except the durable tables — lifecycle questions spanning a restart boundary can only be answered from tables, never from the control plane.
- **The two most important traces are mutually unjoinable:** `MISSION_*` lifecycle events are correlation-orphans (W12-F7/OBS1 T8(4)) — the mission-lifecycle stream and the business causal stream cannot be joined by correlation_id. Whoever asks "what did the system do about event X" must do two independent queries with an indirect join via the shared trigger event_id.

---

## 3. Recovery mechanism classification

### PROVEN (executed and verified live)

| # | Mechanism | Evidence | Caveats |
|---|---|---|---|
| R-1 | `tools/fyd-site-projection/dump.py` regenerates website projections from the journal | Outputs regenerated 2026-09-22 14:50 UTC; downstream digest verification fail-closed (Agent 20 row 18; Pig probe) | **Dirty in git since 2026-09-21** (provenance of the one proven recovery writer unconfirmed); manual invocation only — no cron, no Task Scheduler evidence (Pig probe 2026-09-24); **~48h stale** (W12-F5) |
| R-2 | Mission retry → DeadLetterAuthority | 3 attempts, 5s backoff, durable `repository_dead_letters` rows, listable via `/mc/dead-letters*` (OBS1 Q6; OBS3 poison path) | 0 rows live; poison path validated by code, not by a live drill (OBS3's recommended synthetic drill never ran) |
| R-3 | Adapter owner-log pure fold | fold-twice → byte-identical (REACHABILITY A1); revert-as-append | same module carries F214's rewrite-destroy hazard (read failure → catch-all `[]` → rewrite with newest event only) |

### THEATER (claims recovery/verification it does not perform)

| # | Mechanism | Evidence |
|---|---|---|
| T-A | `ApprovalAuthority` "approved" records | rubber-stamp conditions (`\|\| true`), `status`/`approval_status` field mismatch → `_commit` always throws (OBS4 G7/G8); **W12-F1: `approvals` table absent from live DB, `mission_executions` = 0 rows** — theater has never even persisted |
| T-B | `ReplayCertificate` / `continuous_replay_authority.js` | `success: true` hardcoded in witness constructor; `signature` defaults null; certificates built in memory (OBS4 G9) |
| T-C | `runtime/replay/` + `replay-integrity.yml` CI | directory is EMPTY; 5 certification tests import from it and cannot load; CI guards a directory that does not exist (F14, CP-5) |
| T-D | 66 live `WITNESS_CREATED` attestations | labels, not commitments — `verifyWitness` would reject every one (F150) |
| T-E | `RESTORE_TEST_REPORT.md` "RESTORE_TEST_PASSED" | file-integrity sample ("No restore operation was needed"), not a restore test (F207) |
| T-F | WAVE_3F replay audit | cites files that do not exist on disk (F207) |
| T-G | `GET /health` → `"status":"healthy"` | **confirmed live 2026-09-24** (`:8080` returns healthy, uptime ~41.8h) while registering 8 checks and **none** for MissionScheduler/WorkerRuntime/EventBridge/EventToMissionBridge/DeadLetterAuthority (OBS3 L2; gateway_runtime.js:726-759) — the pipeline's health answer is false certainty |
| T-H | `MissionControlHeader` gateway 'healthy' | hardcoded + simulated `Math.random()` metrics (Agent 20 §5, inbound P-20260923-081) |
| T-I | `MissionExecutionAuthority._checkpoint` | accepts `checkpointAuthority` in constructor; **no such module exists on disk**; 0 rows ever written (W12-F4) |

### DORMANT (exists, never exercised — classify, do not delete)

| # | Mechanism | Evidence |
|---|---|---|
| D-1 | `replayDeadLetter` | zero live callers (Pig grep 2026-09-24); no HTTP route (F69); the only recovery arrow out of the DLQ is unwired |
| D-2 | `destructive_recovery_certification.py` | never executed (zero TEST_OBJECT rows); no confirmation prompt; deletes ALL Qdrant collections (F206) — one careless run from catastrophe |
| D-3 | `backup_postgres.ps1` / `PING_BACKUPS.md` plan | never wired; rclone never installed |
| D-4 | `projection_replay.py`, `replay_worker.py` | never ran |
| D-5 | `MissionEventBus` | never constructed; duplicates the mission-queue concept a third way (OBS3) |
| D-6 | Python worker fleet (workers/*, root *_worker.py) | compose `profiles: [dev]`; no container running |
| D-7 | `/events/unprocessed|/processed|/failed` protocol | fully implemented routes; zero producers, zero consumers; `_poll` disabled |

### UNOWNED (no mechanism, no decision point)

| # | Gap | Evidence |
|---|---|---|
| U-1 | Live journal durability | no pg_dump schedule (no cron on Pig WSL; no backup dir; `pg_dump.sql` files are June-era wrong-generation — F205); no WAL archive (archive_mode=off, F63); no replication; volume `compose_postgres_data` confirmed live (re-anchors F203); RPO unbounded since 9/16; RTO not achievable (F204) |
| U-2 | Destructive recovery authorization | possession-based only — Pig SSH/docker = root of recovery; no gate, no role, no confirmation, no audit (F208) |
| U-3 | Vector/knowledge recovery | 48% PRNG-noise fallback vectors, no re-embed path (F138); ping-qdrant `Up (unhealthy)`, zero snapshots ever; traffic goes to brain-qdrant (F143) |
| U-4 | Observability ownership (this lane's predecessor state) | Agent 20 map row 20's UNKNOWN on row 20's "who owns recovery" is now this verdict; no owner named for journal durability either (row 19) |

---

## 4. Broken boundaries found (Agent 12 intersection findings)

| # | ID | Boundary | Why it is broken | Proof level |
|---|---|---|---|---|
| 1 | W12-F1 | **Approval persistence vs live schema.** `ApprovalAuthority.requestApproval` INSERTs into an `approvals` table that **does not exist** in `ping_runtime`; `mission_executions` has 0 rows. | read-only `psql` on brain-postgres, 2026-09-24: `relation "approvals" does not exist`; `\d mission_executions` + `count(*)=0`. Closes OBS4's open question (code could not show whether theater accumulated state): it does not — the pipeline has never persisted. | PROVEN (live DB) |
| 2 | W12-F2 | **`/health` omits the entire worker pipeline.** Live `:8080/health` returns `"status":"healthy"` (uptime 150475s) with 8 checks — none covering MissionScheduler, WorkerRuntime, EventBridge, EventToMissionBridge, or DeadLetterAuthority. | live HTTP read 2026-09-24 + `gateway/bootstrap/gateway_runtime.js:726-759` (8 `registerHealthCheck` calls, none on the pipeline). The gateway can report healthy while the worker pipeline is stopped or dropping work. | PROVEN (live HTTP + code) |
| 3 | W12-F3 | **DLQ is a terminal sink; the recovery arrow is unwired.** `replayDeadLetter` has zero live callers; no HTTP route replays a dead letter (F69). | Pig grep `replayDeadLetter` over `gateway/ ping-runtime/` → only the definition site in dead_letter_authority.js; OBS1 T7(c); F69. A poisoned mission's lifecycle ends at "failed" — "recovered" is not an option. | PROVEN (code) |
| 4 | W12-F4 | **Checkpoint authority is phantom.** `MissionExecutionAuthority` accepts `checkpointAuthority` in its constructor (`mission_execution_authority.js:36-43`) but no `checkpoint_authority.js` module exists anywhere under `gateway/` or `ping-runtime/`; the `mission_executions` INSERT names `checkpoint_id` but 0 rows exist. | Pig grep `checkpoint_authority` → no module file; constructor/INSERT lines cited. The recovery step of the execution pipeline cannot resolve even if the gate were fixed. | PROVEN (code + live DB) |
| 5 | W12-F5 | **dump.py provenance + cadence gap.** The one proven recovery writer is **dirty in git** (uncommitted since 2026-09-21 15:14 -0600), runs **manually only** (no cron on Pig WSL; no Task Scheduler evidence), and last ran **2026-09-22 14:50 UTC (~48h stale)**. | `git status --porcelain`, `stat`, `ls -lt var/fyd-projections/`, crontab (empty), projections' `dumpedAt`. The public site currently renders from a >24h-stale digest-verified projection — verified-freshness is a claim, not a property. | PROVEN (infra) |
| 6 | W12-F6 | **Journal freshness.** `ping_events` = 2,429 rows, last write 2026-09-23 23:24 UTC; `ping_missions` = 471 completed only. | live DB probe. Consistent with OBS1/OBS3's "no business events flowing" — the trace is quiescent, not merely latent. | PROVEN (live DB) |
| 7 | W12-F7 | **`MISSION_*` lifecycle events are correlation-orphans.** Emitted without `correlation_id` (`mission_runtime.js:97-100` etc.), so `getTrace` / `/mc/missions/:id/trace` never include them. | OBS1 T8(4) carried as synthesis: the mission-lifecycle stream and the business causal stream cannot be joined by correlation_id. | PROVEN (code, via OBS1) |
| 8 | W12-F8 | **`created_by` is write-only.** No live consumer SELECTs `ping_missions.created_by`; omitted from `MISSION_CREATED` payload and dispatch metadata. | OBS1 T5 carried as synthesis. "Who claimed it" is unanswerable on the core mission lane by construction. | PROVEN (code, via OBS1) |
| 9 | W12-F9 | **Reader serves projections without an age check.** `getPingObjectGraph` verifies the digest but not the age (FINDINGS-LOG F281) — a journaled overlay fixed yesterday can be invisible to the public page for the whole dump cadence with no staleness signal. | Agent 20 map row 15 + F281 evidence line, carried as synthesis. | PROVEN (code, via Agent 20 map) |
| 10 | W12-F10 | **Vector recovery unowned.** 48% PRNG-noise fallback vectors, no re-embed path (F138); `ping-qdrant` `Up (unhealthy)` with zero snapshots ever; recovery/RECOVERY.md's Qdrant story never proven. | `docker ps` 2026-09-24 (unhealthy), F138, F208. If knowledge collections are lost (F206's script is one careless run away), there is no re-derivation path. | PROVEN (infra + code, via F138) |

Severity: W12-F1 (P1 — the broken gate is already fail-closed; the missing table makes the theater self-limiting), W12-F2 (P1 — false health certainty), W12-F3 (P2 — DLQ is a sink by design today; wiring replay is a decision, not a bug fix), W12-F4 (P2 — phantom on an already-dead pipeline), W12-F5 (P1 — provenance + staleness on the sole proven recovery), W12-F6 (info), W12-F7 (P1), W12-F8 (P1), W12-F9 (P2), W12-F10 (P1).

No new patch proposals from this lane: every defect above either is already proposed by an owning agent (echo P-T1 → OBS1; trigger promotion → Agent 13 P1; approval theater → OBS4) or would require a business/owner decision (DLQ replay wiring, backup ownership, dump.py scheduling — the convergence wave owns). Per the write gate: nothing applied.

---

## 5. Ledger-row verdict (exact ledger format)

| DOMAIN | AUTHORITY (candidate) | STATE | BROKEN BOUNDARY | PROOF LEVEL | PATCH STATUS | BLOCKERS | NEXT |
|---|---|---|---|---|---|---|---|
| 12 Observability + recovery | Trace: `ping_events` + `ping_missions` + `repository_dead_letters` (durable) / session-scoped counters (ephemeral). Recovery: **UNOWNED** — no named recovery authority; dump.py is the sole proven recovery *mechanism*, owned by no decision point (extends Agent 20 map rows 19/20) | VERDICT DELIVERED 2026-09-24 06:00 MDT (Agent 12 re-dispatch) | W12-F1: `approvals` table ABSENT from live DB, `mission_executions`=0 rows — approval pipeline theater never persisted (P1); W12-F2: live `:8080/health`="healthy" omits the entire worker pipeline — 8 checks, none on scheduler/workers/bridges/DLQ (P1); W12-F3: `replayDeadLetter` zero live callers — DLQ is a terminal sink, no recovery arrow (P2); W12-F4: checkpoint authority is phantom (no module on disk; 0 rows) (P2); W12-F5: dump.py dirty in git, manual-only, last ran 2026-09-22 14:50 UTC — ~48h stale (P1); W12-F7: `MISSION_*` events are correlation-orphans — lifecycle and business streams unjoinable (P1); W12-F8: `created_by` write-only, no live reader — "who claimed it" unanswerable on the mission lane (P1); W12-F9: projection reader verifies digest but not age — staleness invisible (P2); W12-F10: vector recovery unowned (48% noise vectors, no re-embed, ping-qdrant unhealthy, zero snapshots) (P1); W12-F6: journal quiescent — 2,429 rows, last write 2026-09-23 23:24 UTC (info). Lifecycle synthesis across 6 sampled mechanisms: "what happened" durably answerable; "who did it" broken/unverifiable in 5 of 6; "was it authorized" theater on the core lane; "did it recover" has exactly one proven mechanism (dump.py regen) and one dead end (DLQ). Recovery classification: PROVEN = dump.py regen, mission retry→DLQ, owner-log pure fold; THEATER = ApprovalAuthority records, ReplayCertificate, replay-integrity.yml on empty dir, 66 WITNESS_CREATED labels, RESTORE_TEST_PASSED, WAVE_3F, /health healthy, hardcoded MissionControlHeader healthy, phantom checkpoint; DORMANT = replayDeadLetter, destructive_recovery_certification.py, backup_postgres.ps1, projection_replay.py/replay_worker.py, MissionEventBus, Python fleet, vestigial queue protocol; UNOWNED = journal durability (RPO unbounded), destructive recovery authorization (possession-based), vector recovery. No new proposals this lane — every fix belongs to an owning agent or a business decision | PROVEN (code + live read-only DB probes + live HTTP health read + infra greps; COMMITS CREATED: NONE) | none | BLOCKER: none this lane | agent12-observability-recovery/OBSERVABILITY-RECOVERY.md (this file); SUMMARY.md. Convergence-wave inputs: (1) name a recovery owner for journal durability + destructive-recovery authorization (U-1/U-2 are unowned decisions, not just gaps); (2) adopt or reject OBS1 P-T1 (dispatch scoping) before any live-fire drill — the drill would ignite the unbounded echo; (3) decide the DLQ replay arrow (wire `replayDeadLetter` or declare the DLQ terminal-by-design); (4) schedule dump.py (cron/Task Scheduler) or accept ~48h-stale projections and pin provenance (commit or revert the dirty file); (5) add the worker pipeline to /health or document it as intentionally unmonitored |

**Ledger-note for the coordinator:** this row was the only UNKNOWN in MASTER-LEDGER.md. Provisional IDs W12-F1..W12-F10 are used above; the coordinator assigns canonical F-numbers on merge (FINDINGS-LOG.md must not be renumbered). Existing findings F58–F65, F203–F208, F214 are cited, not re-proven. OBS1/OBS3/OBS4 deliverables are cited, not duplicated. W12-F1 **closes OBS4's open question** ("verify the approvals table in the live database"): the answer is that the table does not exist and `mission_executions` has 0 rows — the approval theater is code-only.
