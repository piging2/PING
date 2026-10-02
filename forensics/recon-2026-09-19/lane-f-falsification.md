# LANE-F Falsification Report — 2026-09-19 (round 1)

Role: adversarial falsification, read-only. No source edits, no commits, no DB writes, no restarts, no secret reads.
Planes: LOCAL_WORKTREE = /home/nolan/worktrees/constitutional-convergence @ 84da2d40c (branch constitutional-convergence-v2).
LIVE_RUNTIME = container `ping-gateway` (image ping-gateway:devin-boundary2, up 26h), inspected read-only via docker exec.
Evidence states: DECLARED / INFERRED / SOURCE_VERIFIED / REACHABILITY_VERIFIED / LIVE_VERIFIED / FALSIFIED / BLOCKED.
EFFECTIVE classes: PHANTOM / DORMANT / LEGACY_UNREACHABLE / EFFECTIVE.

Method: every load-bearing claim below was re-derived from primary source (git objects, file bytes, md5, docker exec reads) through the Pig WSL hop. Other lanes' reports were used as leads only; where this report agrees with them it is by independent verification, and where it disagrees the file:line evidence is cited.

---

## 1. LANE-P artifact-parity proof — PRE-FALSIFICATION (proof file not yet landed)

Status: **BLOCKED** for direct falsification. No `lane-p-artifact-parity.md` exists in recon-2026-09-19/ as of 2026-09-19 01:09 (directory listing verified). What follows is pre-falsification of the three assertions any artifact-parity proof must make, derived independently from primary source. I will re-attack the proof itself when it lands.

### A1. "ce3f8687c5 exists on constitutional-convergence-v2 with exactly the 4 certified paths"
Verdict: **HOLDS (SOURCE_VERIFIED).**
Evidence: `git show --stat --oneline ce3f8687c5` returns exactly 4 paths: EVIDENCE_LEDGER.md, OPERATING_SPEC.md, ping-runtime/events/unified_event_runtime.js, certification/event-sequence-replay/sequence_replay_cert.js. Message "cert(events): database sequence and replay authority", dated 2026-09-18 18:19:58. I could not break this.

### A2. "The worktree's unified_event_runtime.js is the certified revision"
Verdict: **HOLDS at LOCAL_WORKTREE (SOURCE_VERIFIED).**
Evidence: `git log --oneline ce3f8687c5..HEAD -- ping-runtime/events/unified_event_runtime.js` is empty; `git status --porcelain` shows no modification to that file (only CERTIFICATION.md, CONTRADICTIONS.md, EVAL-006, evidence/, tests/mc1-legacy-ingress/ are dirty). md5 a7abc593ddb2a5b9ac73cae3f2b68af5. I could not break this.

### A3. "The deployed artifact contains the certified source revision"
Verdict: **FALSIFIED (LIVE_VERIFIED against; SOURCE_VERIFIED for the worktree side).**
Evidence (all read-only, container `ping-gateway`):
- md5(`/app/ping-runtime/events/unified_event_runtime.js`) = 31d43523ca35364e2cbcc95189092c88 vs worktree a7abc593ddb2a5b9ac73cae3f2b68af5. Byte parity fails.
- Structural, not cosmetic: container file is 358 lines vs worktree 532 lines. The container copy has no `identity_version` marker (grep: zero hits); it uses the older governance model (`_eventValidator.validateEventType`, `_eventGovernance.validateEvent`) while the certified revision mints identity via `identityAuthority.generateId('event', identityData)` (worktree line 201) with `identity_version: 2.0.0` in the preimage (worktree line 193).
- The container's `gateway_runtime.js` requires the old dual-emit `EventBridge` (line 73) and starts it (line 542); the container's `event_bridge.js` header is the old "Polls repository_events and canonical_events" design with no PRESERVED_INACTIVE fence; `legacy_ingress_adapter.js` is absent from the container.
- Corroborating file: md5(`/app/ping-runtime/workers/canonical_workers.js`) = 1731c5ce3579bcc97ed2c70e0517b628 vs worktree 4c412976508d408479f730ae7dc69dc0. The container copy has no `witness_root` binding in WitnessWorker (no equivalent of worktree lines 491/497), still maps `WITNESS_CREATE: 'witness'` in mission_scheduler.js (line 50), and registers the witness worker for `['WITNESS_CREATE', 'REPLAY_COMPLETED']` (line 731).

**What this changes:** any LANE-P parity claim scoped to LOCAL_WORKTREE/LOCAL_BRANCH can stand; any claim extending to LIVE_RUNTIME is dead on arrival. This confirms the backlog's provisional "SOURCE AUTHORITY vs DEPLOYED EFFECTIVE AUTHORITY" framing with byte-level evidence: the deployed image is structurally a different revision of the event authority, not merely an older build of the same code. The P0 promotion gate (certified SHA -> built image -> running image) is therefore not a formality; it is the blocking item, and no witness change is live until an image rebuild plus redeploy happens.

---

## 2. W-0 trigger adjudication: H0 vs H1 (independent re-trace, primary source)

H0 = 91e1337f4 did NOT disconnect the effective witness trigger.
H1 = 91e1337f4 changed reachable runtime composition such that the previous witness trigger ceased to execute.

**Verdict: H1 CONFIRMED at LOCAL_BRANCH HEAD; H0 FALSIFIED (for HEAD). With two material refinements (R1, R2) that other lanes underplayed.**

### BEFORE (parent of 91e1337f4; still observable today at LIVE_RUNTIME)
Chain, each edge verified:
1. `ReplayWorker.handle` emits `REPLAY_COMPLETED` via `BaseWorker._emit` -> `UnifiedEventRuntime.emit` (ping_events + `.on()` handlers). [canonical_workers.js:265/307/351]
2. `EventToMissionBridge.start()` registers `.on('REPLAY_COMPLETED', ...)` (bridge line 94); `EVENT_MISSION_MAP` maps `REPLAY_COMPLETED -> { missionType: 'WITNESS_CREATE' }`. [container bridge line 64]
3. `MissionScheduler._dispatch` maps `WITNESS_CREATE -> 'witness'` via MISSION_WORKER_MAP. [container scheduler line 50]
4. WitnessWorker registered `eventTypes: ['WITNESS_CREATE', 'REPLAY_COMPLETED']` and attested directly with no verified check. [container canonical_workers.js:731; recon-a verified the no-check behavior via docker exec]
Effective trigger: bridge -> WITNESS_CREATE mission -> scheduler -> worker. Live and connected, with the unverified bypass open.

### AT (91e1337f4, exact diff verified)
Three edges severed in one commit (7 files, 25 insertions, 26 deletions):
1. Bridge: `-  REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 },` (1 line deleted).
2. Scheduler: `WITNESS_CREATE` entry deleted from MISSION_WORKER_MAP (1 line deleted).
3. Worker: `eventTypes` narrowed to `['REPLAY_COMPLETED']`; `handle()` rejects anything else with `unsupported_witness_trigger` (canonical_workers.js, 21 lines changed).

### AFTER (HEAD 84da2d40c)
- Zero `.on('REPLAY_COMPLETED', ...)` registrations anywhere in gateway/ or ping-runtime/ (grep, excluding tests: 0 hits).
- `gateway/bootstrap/gateway_runtime.js` contains zero mentions of REPLAY_COMPLETED.
- Bridge `EVENT_MISSION_MAP` has no REPLAY_COMPLETED entry (line 64 is `WITNESS_CREATED -> LINEAGE_CREATE`).
- `MISSION_WORKER_MAP` (mission_scheduler.js:41-60) has no WITNESS_CREATE entry; `_dispatch` fail-closes on unknown mission_type ("No worker for mission type ... skipping", stats.skipped++).
- The sole `WorkerRuntime.dispatch` caller in non-test code is `MissionScheduler._dispatch` (mission_scheduler.js:226).
- `UnifiedEventRuntime.emit` dispatches to `.on()` handlers only; no worker dispatch on the emit path.
- Legitimate end-to-end flow terminates: PROJECTION_CREATED -> bridge -> REPLAY_VERIFY mission -> ReplayWorker (eventTypes ['REPLAY_VERIFY','PROJECTION_CREATED']) -> REPLAY_COMPLETED emitted -> dead end. WitnessWorker.handle is unreachable through any legitimate pipeline edge at frozen HEAD.

### LIVE (deployed container)
Still executes the BEFORE composition: bridge line 64 maps REPLAY_COMPLETED -> WITNESS_CREATE; scheduler line 50 maps WITNESS_CREATE -> witness; worker eventTypes include WITNESS_CREATE. The disconnect exists only at LOCAL_WORKTREE/LOCAL_BRANCH, not in the running system.

### Refinement R1 (scope correction)
"Write-dead" is a branch-HEAD property, not a system property. At LIVE_RUNTIME the witness trigger is connected and the unverified bypass is live. Any plan language claiming "the witness pipeline is write-dead" must be qualified to LOCAL_WORKTREE/LOCAL_BRANCH, or it misdescribes the deployed system.

### Refinement R2 (the break: "disconnected" is not "unreachable")
Recon-c's Q4 examined `POST /orchestration/missions` (the Orca route) and concluded "there is no route from HTTP input to WorkerRuntime.dispatch with an arbitrary event_type." It checked the wrong route. The MissionRuntime-backed route is `POST /missions` (gateway/routes/missions.js:22-30, mounted at gateway_runtime.js:812), and the full static trace to a fabricated WITNESS_CREATED is connected at HEAD:
1. `POST /missions` accepts arbitrary `{ missionType, payload }`; `_setupMiddleware` (gateway_runtime.js:113-125) installs only express.json + CORS, no auth.
2. `MissionRuntime.create` (mission_runtime.js:68) performs zero missionType validation; inserts any mission_type into ping_missions, idempotent by sha256 hash.
3. `MissionScheduler` polls the same store (`getPending`, mission_scheduler.js:193); `MISSION_WORKER_MAP['REPLAY_VERIFY'] = 'replay'` passes the guard.
4. `_dispatch` builds the dispatch event with `event_type: payload.event_type || mission.mission_type` (mission_scheduler.js, verified in the 200-300 line read). An attacker sets `payload.event_type = 'REPLAY_COMPLETED'`.
5. `WorkerRuntime.dispatch` matches `eventTypes.includes('REPLAY_COMPLETED')`; WitnessWorker is the sole registrant (canonical_workers.js:731).
6. `WitnessWorker.handle` gates: trigger is REPLAY_COMPLETED (pass), `payload.replay.verified === true` (attacker-supplied, pass), `witness_root` non-empty string (attacker-supplied, pass) -> emits WITNESS_CREATED bound to the attacker-chosen root, with `attestation: 'witness-<event_id slice>'` also attacker-influenced (`event_id: payload.event_id || mission.mission_id`).

Classification: REACHABLE_NONCANONICAL by static trace (not executed live, per read-only law; recon-a flagged the same route as needing a sandbox test). Consequence: 91e1337f4 did not merely disconnect the trigger; it replaced an internal bypass with a narrower but unauthenticated attacker-reachable emission surface. The honest terminal state for Q4 is not "PROVE ROUTE UNREACHABLE" but BLOCKED pending closure.

---

## 3. Q1-Q4 attacks (recon-c decisions)

### Q1 — Option 4 (no independent witness_id): HELD, with two mishandled cases
I could not break the core decision: no live consumer requires a witness_id, the legacy `witness_<16hex>` scheme is preserved-inactive, and Options 2/3 would create a second identity authority. Two cases the decision mishandles:
1. **The `attestation` label half-decision.** The live attestation still emits `attestation: 'witness-<event_id[0:16]>'` (canonical_workers.js:505), which looks like an identity, is not content-bound, and has zero live consumers. Option 4 keeps a pseudo-ID on the record while declaring no-ID. Any future consumer that mistakes it for an identity gets a non-unique, non-content-bound handle. The decision should have required its removal or relabeling, not just documentation.
2. **Re-attestation as a distinct act is unrepresentable.** Under Option 4, a byte-identical re-attestation dedups silently via `ON CONFLICT (event_id) DO NOTHING`. If attestation is an evidentiary act, "re-attested on date X" vs "never re-attested" is information the system cannot record without changing the payload (and any nonce breaks determinism/idempotence). The decision does not address whether re-attestation must be observable.
What would break Q1: a live consumer needing a payload-independent stable attestation handle (none exists today), or an evidentiary rule that re-attestation is a distinct recordable act.

### Q2 — Option D (retire canonical_hash, do not add the field): HELD on integrity, MISHANDLED on portability and authority-visibility
The integrity argument stands: the identity preimage covers the full payload, so a second hash is redundant for tamper-evidence inside PING. Two gaps:
1. **Portability.** `event_id` is PING-internal (identity_version 2.0.0, F7/D1 domain rules); an external verifier (Oracle evidence-chain verifier, a customer auditor) cannot re-derive or check it without PING's identity pipeline. A `canonical_hash` (full sha256 over canonical bytes) is the portable integrity artifact. Option D forecloses this without recording the requirement as conditional. Recon-d notes ORCA's chain verifier does not read witness events today, so there is no live need; the decision should be "D unless an external-verifier requirement materializes," not absolute D.
2. **Authority visibility.** The Merkle tree hashes with `crypto.createHash('sha256')` directly (merkle_tree.js:213-217), bypassing CanonicalAuthority. A canonical_hash defined via CanonicalAuthority would have been one lever to pull witness hashing under hash-authority versioning/rotation. The Q2 analysis treats the hash question as purely envelope-redundancy and misses this dimension.
What would break Q2: a concrete external-verifier requirement (e.g., Oracle needing offline attestation checks), or a hash-rotation event that must cover witness roots.

### Q3 — "Replay provider owns verification; worker must not re-verify": PARTIAL BREAK (decisive evidence falsified)
The architecture can stand, but recon-c's decisive evidence is false at HEAD. It claims the worker requires "the REPLAY_COMPLETED event itself (authenticated by its canonical event_id)." Primary source: `WitnessWorker.handle` (canonical_workers.js:454-505) never authenticates the triggering event against the canonical store. It reads `event.event_type`, `payload.replay.verified`, and `payload.replay.witness_root` directly off the dispatch envelope. No ping_events lookup, no payload-hash comparison, no provider signature check. The `event_id` is a string on a synthetic dispatch object (`event_id: payload.event_id || mission.mission_id`), not a proof of canonical existence.
Combined with R2 above, the worker attests forged "provider results": the verification-ownership boundary is declared but the trust boundary is unimplemented. The worker cannot distinguish the genuine provider's REPLAY_COMPLETED from a forged dispatch.
This compounds with the already-known provider-side hole (silent maxEvents truncation / malformed-envelope skips can still yield verified:true, assigned to R-1): the worker trusts an event it does not authenticate, whose verified flag does not mean what it claims.
What would fully break the recommendation (not just its evidence): a demonstration that the provider itself is forgeable through its legitimate inputs. That is R-1's input-integrity work; until it closes, Q3's "correct architecture" claim rests on two open holes.
Required repair before W-1 can certify: the worker must resolve the triggering event_id against the canonical event store and compare the payload (or the dispatch must carry an unforgeable provider attestation). Without this, W-1b/W-1c certify gates that an unauthenticated caller walks around.

### Q4 — "PROVE ROUTE UNREACHABLE": BREAK (wrong terminal state)
Falsified by R2: the route from unauthenticated HTTP input to `WitnessWorker.handle` emitting WITNESS_CREATED is connected at HEAD via `POST /missions` -> `MissionRuntime.create` (no validation) -> scheduler poll -> `MISSION_WORKER_MAP` guard pass on REPLAY_VERIFY -> `event_type` fallback spoof -> `WorkerRuntime.dispatch` -> WitnessWorker. Recon-c's Q4 trace examined `POST /orchestration/missions` (Orca's `ExecutionEngine._missions`, a different mission system) and missed the MissionRuntime-backed route entirely.
Correct state: **BLOCKED**, not "prove unreachable." Closure requires at least one of: auth on `POST /missions`; dispatch-time consistency validation (`event_type` must be compatible with `mission_type`); worker-side canonical-event authentication (same repair as Q3). Note this also reframes recon-d's "Critical Finding": the pipeline is not merely write-dead for legitimate flows; the write path is attacker-controlled. Recommend treating the unauthenticated witness-emission route as a security finding in its own right, not just a witness-contract footnote.

---

## 4. Ecosystem harvest — MECHANISMS ONLY (no architectures imported)

Surveyed current official sources (docs, changelogs, architecture notes) for Temporal, Restate, Hatchet, NATS JetStream, PostgreSQL patterns, and OpenTelemetry. Each entry: PROBLEM SOLVED / BEST MECHANISM / PING ANALOG / HARVEST? / WHY.

### 4.1 Temporal — append-only event history + replay; durable timers; exactly-once workflow / at-least-once activity split
- PROBLEM SOLVED: crash recovery without custom retry/state code; long-running orchestration that survives process death.
- BEST MECHANISM: per-workflow append-only event history as the source of truth; state is rebuilt by replaying history; workflow code must be deterministic, side effects must be idempotent or non-retryable; durable timers as first-class persisted waits.
- PING ANALOG: ping_events is already an append-only history; `UnifiedEventRuntime.replay()` orders by sequence; the backlog already wants "history is the state."
- HARVEST?: YES, as contract discipline, not code.
- WHY: Temporal's split (exactly-once orchestration semantics, at-least-once activity semantics with idempotent activities) is the precise vocabulary PING's worker contract needs: workers are activities (at-least-once, must be idempotent); the event log + replay is the exactly-once orchestration layer. Adopt the rule "worker handlers must be idempotent; the log is the truth; replay rebuilds" as the normative worker contract. Do not import the Temporal server.

### 4.2 Restate — per-invocation journal; ingress Idempotency-Key; awakeables; durable timers
- PROBLEM SOLVED: exactly-once service invocation across crashes; safe ingress retries; waiting on external systems/humans without polling.
- BEST MECHANISM: (a) every handler step journaled; on retry, completed steps are skipped, never re-executed; (b) `Idempotency-Key` header on ingress with response caching (24h), plus auto-injected keys for safe transparent retries; (c) awakeables: externally-resolvable durable promises (pass the awakeable ID to the external system; the handler suspends until resolved); (d) durable timers (`ctx.Sleep`) that survive restarts.
- PING ANALOG: ping_missions is a mission journal; mission idempotency today is content-derived sha256(missionType:payload) via ON CONFLICT DO NOTHING; approvals are a P0 open item (proposed -> approved -> attempted -> observed -> verified).
- HARVEST?: YES for (b) and (c).
- WHY: (b) A client-supplied idempotency key on `POST /missions` and webhook ingress is strictly better than content-derived hashing for the approval/effect-identity P0: retries of the same logical effect carry the same key even if the payload representation shifts. (c) Awakeables are the named, proven mechanism for the backlog's "webhook-resumed approvals": an approval is an externally-resolved durable promise recorded in the journal, not a poll loop and not a second mission type. Do not import the Restate runtime.

### 4.3 Hatchet — terminal-release idempotency keys; durable tasks; same-transaction ack
- PROBLEM SOLVED: duplicate task execution under retries; durable step state; ack/result/next-step atomicity.
- BEST MECHANISM: (a) idempotency keys on workflows/tasks (CEL-expression derived) with terminal-status release: the key is held until the task reaches a terminal state (completed/cancelled/retries-exhausted), then released; (b) durable tasks with Postgres-backed state; (c) acknowledgement, task result, and next-step updates committed in the SAME Postgres transaction.
- PING ANALOG: MissionScheduler lease claim + reaper (O4 repair: conditional claim); ON CONFLICT DO NOTHING dedup.
- HARVEST?: YES for (a) and (c).
- WHY: (a) PING's ON CONFLICT DO NOTHING never releases; Hatchet's terminal-release semantics are the correct shape for effect identity with retries: the key lives exactly as long as the effect is unsettled. (c) Same-transaction discipline directly answers the backlog P1 durable-orchestration item ("keyed recovery, same-transaction discipline, stable idempotency keys, durable checkpoints"): mission state transition + worker result + next-mission creation should commit atomically. Do not import Hatchet.

### 4.4 NATS JetStream — Nats-Msg-Id dedup window; explicit ack + redelivery; max-deliveries DLQ advisories; AckProgress heartbeats
- PROBLEM SOLVED: exactly-once processing over at-least-once delivery; dead-lettering; long-running handlers.
- BEST MECHANISM: (a) publish-side dedup via `Nats-Msg-Id` within a duplicate window (default 2 min; second publish is a no-op acked as duplicate); (b) consumer-side idempotency as the mandatory second half (deduplication + idempotent consumers = exactly-once); (c) `$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES` advisories feeding a DLQ stream with headers (original stream, sequence, failure reason); publish-to-DLQ acked before settling the original; (d) `AckProgress` heartbeats keeping long handlers in-flight so they are not redelivered prematurely.
- PING ANALOG: ON CONFLICT DO NOTHING is the publish-side dedup; DeadLetterAuthority is the DLQ; the mission lease is the ack-wait.
- HARVEST?: PARTIAL (patterns, not transport).
- WHY: (a)+(b) give PING's emit path its precise two-sided contract: publish-side dedup (have) + consumer-side idempotency (partially have; worker handlers are not all idempotent, e.g. the timestamp-in-preimage finding). (c) The DLQ advisory shape (original event reference + sequence + failure reason as headers, DLQ publish acked before settling) is a better envelope than PING's ad-hoc dead-letter rows; adopt the envelope shape. (d) AckProgress heartbeats map to the mission lease renewal discipline. Do not import NATS as a transport; PING's spine stays Postgres.

### 4.5 PostgreSQL — SKIP LOCKED claim; advisory locks; LISTEN/NOTIFY; upsert arbitration
- PROBLEM SOLVED: concurrent job claiming without double-claim; app-level mutexes; lightweight wakeups; write-write arbitration.
- BEST MECHANISM: (a) `SELECT ... FOR UPDATE SKIP LOCKED` for disjoint batch claims across racing workers (no double-claim, no waiting); (b) `pg_try_advisory_lock`/`pg_try_advisory_xact_lock` as non-blocking app mutexes (double-charge/double-send prevention); (c) LISTEN/NOTIFY for wakeups instead of polling; (d) `INSERT ... ON CONFLICT` with the index as the ownership arbiter ("first writer wins" via DO NOTHING).
- PING ANALOG: scheduler claim/reaper (conditional UPDATE claim per the O4 repair); mission idempotency via ON CONFLICT DO NOTHING.
- HARVEST?: YES for (a) discipline and the reaper lesson.
- WHY: the scheduler's crash/retry/lease journal is exactly the PG-queue problem. Two concrete takeaways: (1) verify the `getPending`/claim path uses SKIP LOCKED or an equivalent conditional-claim (the O4 conditional UPDATE is equivalent in effect; if any poll path does not, adopt SKIP LOCKED); (2) the heartbeat-less reaper failure mode is named and proven in the wild: a reaper without heartbeats resurrects still-running jobs and causes double execution; the heartbeat must carry a `locked_by` guard so a live worker's heartbeat protects its job while a dead worker's job is still recovered. This is the exact correctness property PING's mission reaper must be tested against. (d) is already PING's mechanism; keep it.

### 4.6 OpenTelemetry — span links; W3C TraceContext propagation
- PROBLEM SOLVED: correlating causally-related but non-parent-child work (batch, async, messaging); cross-process context propagation.
- BEST MECHANISM: (a) span links: a span may link to multiple causally-related spans beyond its single parent (the batch/async correlation primitive); (b) W3C TraceContext (`traceparent`/`tracestate`) as the wire propagation format; (c) producer->consumer span links for messaging paths.
- PING ANALOG: correlation_id/causation_id on events; LineageWorker (currently single-hop causationChain, per recon-d).
- HARVEST?: YES for the link shape.
- WHY: recon-d's lineage verdict recommends that attestation-lineage records carry `witness_root`, `replay_fingerprint`, and `upstreamEventId` by reference while staying causation-based. Span links are the standard shape for exactly this: a LINEAGE_CREATED record linking to multiple prior events (the business event, the REPLAY_COMPLETED, the WITNESS_CREATED) instead of a single causation_id. Adopt "links: [event_ids]" as the lineage edge model; keep causation_id as the primary parent. (b) is the wire format to use if PING ever propagates context to external executors (ORCA adapters). Do not import the OTel SDK or collector.

---

## 5. Handoff: what I attacked, what broke, what held, what it changes

**Attacked:** (1) three load-bearing assertions of the forthcoming LANE-P artifact-parity proof; (2) the W-0 H0/H1 trigger verdict via full BEFORE/AT/AFTER/LIVE re-trace; (3) recon-c Q1-Q4 decisions; (4) ecosystem mechanism survey.

**Broke:**
- A3 (deployed artifact contains the certified revision): FALSIFIED by md5 + structural diff (358 vs 532 lines, different identity/governance architecture).
- Q3's decisive evidence ("worker requires the REPLAY_COMPLETED event authenticated by its canonical event_id"): FALSIFIED; the worker never touches the canonical store.
- Q4's terminal state ("PROVE ROUTE UNREACHABLE"): FALSIFIED; the route via unauthenticated `POST /missions` + scheduler `event_type` fallback is connected at HEAD (recon-c examined the wrong route).
- H0: FALSIFIED for branch HEAD (with the R1 scope correction below).

**Held:**
- A1, A2 (cert commit shape; worktree file == certified revision).
- H1 (91e1337f4 severed the previous effective trigger; no legitimate replacement installed).
- Q1 core (Option 4), Q2 core (Option D on integrity grounds).

**What it changes about the plan:**
1. LANE-P's proof must be explicitly scoped to LOCAL_WORKTREE/LOCAL_BRANCH. Any LIVE_RUNTIME parity claim is falsified. The P0 promotion gate is confirmed blocking: the live image is a structurally different revision of the event authority, and every witness fix is undeployed.
2. The witness trigger story needs rewriting: at HEAD the legitimate pipeline is write-dead AND an unauthenticated emission route is open. "Close the route" (auth on POST /missions, dispatch-time event_type/mission_type consistency, worker-side canonical authentication) replaces "prove unreachable" as the Q4 work item. Treat the unauthenticated fabricated-WITNESS_CREATED route as a security finding, not a contract footnote.
3. W-1 cannot certify until the worker authenticates its trigger against the canonical store (Q3 repair). The W-1b/W-1c gates are walk-around-able as written.
4. R1 scope discipline: claims about "the system" must name the plane. LIVE_RUNTIME still runs the old connected trigger with the unverified bypass live; LOCAL_BRANCH runs the disconnected-but-forgeable composition. These are opposite states; the plan must reconcile them before any witness rollout.
5. Harvest feeds: P1 durable orchestration gets Restate awakeables (approvals), Hatchet terminal-release idempotency keys + same-transaction ack, and the PG reaper heartbeat-with-locked_by-guard lesson; lineage gets the OTel span-links edge model; the emit path gets the JetStream two-sided exactly-once contract language.

**Open for next round:** LANE-P's proof file has not landed (will re-attack on arrival); LANE-W evidence has not landed (my W-0 adjudication above is the independent verdict from primary source); the fabricated-witness route deserves a sandbox execution test (does the scheduler actually dispatch the spoofed event_type end to end) under non-read-only authorization.
