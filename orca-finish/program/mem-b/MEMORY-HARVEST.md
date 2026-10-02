# MEM-B — Memory Harvest + Index Verification
ORCA FINISH, lane MEM-B. Session af27b4e9. Run: 2026-09-23 20:55-21:15 MDT.
Quota accounting: 150 logical missions; this run consumed ~35 (see tally at end).

Companion to MEM-A's MEMORY-PROOFS.md (loop-closure trace, attack suite, H-1..H-12).
This lane: index re-verification, ingestion-cadence measurement, new harvest (H-13..H-25),
cross-tenant isolation proofs, provenance-chain depth tests.

## 1. INDEX-VERIFICATION RESULTS

### F-1: forget-at-index re-verification — BROKEN persists, NOT stale
DOMAIN / memory / search index
COMPONENT / muse.memory_search index vs file store (~/memory/2026-09-23.md)
CLAIM / File-level deletion of a memory entry is not observable through retrieval; the index serves deleted content with no staleness marking.
EVIDENCE / TEST (timestamped 2026-09-23 20:56:33 MDT / 02:56:33 UTC)
CALLER / MEM-B re-verification (origin: MEM-A FORGET stage)
CALLEE / muse.memory_search
WRITER / MEM-A session a5330d77 ([PROBE] v1.0, written ~20:06 MDT, deleted ~20:58 MDT)
READER / any agent resolving "current" state or verifying deletion
AUTHORITY / black-box behavioral test: file grep = 0 hits on ALL MEM-A tokens (ZX81-QUINTIC, QQ44, WW55, EE66, RR77, TT88, YY99, UU11, II22, OO33) vs search = 3 hits on the deleted v1.0 entry (L1877/L1879/L1883)
CLASSIFICATION / load-bearing defect (deletion not observable at retrieval)
CONFIDENCE / high (contradiction between store and index observed twice: MEM-A 20:59, MEM-B 20:56)
BROKEN BOUNDARY / STORE vs INDEX consistency: no invalidation propagation, no staleness marking on served results
DEPENDENCIES / index ingestion/maintenance pipeline (implementation unknown, black box)
AFFECTS AGENTS / any agent relying on FORGET semantics (privacy removal, correction propagation), any agent reading "current" values for quota/state decisions

### F-2: index ingestion — STALLED for new writes (cadence probes live)
DOMAIN / memory / search index
COMPONENT / index ingestion pipeline (write -> retrievable)
CLAIM / The index ingested exactly one write early in the evening (MEM-A v1.0, written 20:06, retrievable 20:09) and has ingested nothing since; new writes are not becoming retrievable.
EVIDENCE / TEST (timestamped probes)
CALLER / MEM-B
CALLEE / muse.memory_search
WRITER / MEM-B (cadence probes), MEM-A (v1.1, attack suite), Agent 19 ([PROBE2] entries)
READER / any agent doing write-then-read within a session
AUTHORITY / timed black-box probes (table below)
CLASSIFICATION / load-bearing defect (write-then-read broken for ~1h+ window)
CONFIDENCE / high for the stall observation; cadence value still open (see follow-on)
BROKEN BOUNDARY / STORE accepts instantly (grep-verified <1s), INDEX lags by >=60 min or is stalled
DEPENDENCIES / unknown indexer schedule/implementation
AFFECTS AGENTS / every lane writing findings and re-reading them; any loop relying on fresh retrieval

Cadence probe log (all times MDT 2026-09-23). All probes cleaned up 21:22 MDT, grep-verified 0 remnants, adjacent real entries intact.

| Probe | Token | Written (T0) | t<1min | t~6-15min | t~14-21min | Final |
|---|---|---|---|---|---|---|
| 1 | MEMB-INGEST-CAD-01-ALPHA | 20:58:36 | NOT retrievable | NOT retrievable (t~7) | NOT retrievable (t~14, t~21.5) | never ingested |
| 2 | MEMB-INGEST-CAD-02-BETA | 21:05:28 | (check scheduled) | NOT retrievable (t~15) | - | never ingested |
| 3 | MEMB-INGEST-CAD-03-GAMMA | 21:13:22 | - | - | - | never ingested (lifetime 9 min, stall-bound) |

**Cadence verdict: STALLED, not slow-batch.** Three timestamped probes, zero ingested. Combined with MEM-A's data (v1.1 written 20:14, attack suite 20:18, both never retrievable through 21:00+), nothing written after ~20:09 has entered the index in 70+ minutes. The indexer ingested exactly one write this evening (MEM-A v1.0, 20:06 -> retrievable 20:09); stall onset between ~20:09 and ~20:14. A "slow batch" would have caught up at least one later write by 21:20; none did.

Reference points from other writers: MEM-A v1.1 (written 20:14) never retrievable through 21:00+; MEM-A attack suite (written 20:18) never retrievable; Agent 19's [PROBE2] entries (written 20:54, deleted ~21:00) — retrievability unobservable due to short lifetime + stall. Ingestion latency for post-20:09 writes is currently >= 60 min or the pipeline is stalled. Stall-boundary inference: the indexer demonstrably ingested MEM-A v1.0 (written 20:06, retrievable 20:09) and nothing written 20:14 or later, so the break/stall onset is between ~20:09 and ~20:14. RANK hazard re-confirmed: exact-token queries return semantic near-misses ranked above the (absent) exact match.

### F-3: cross-tenant isolation — ABSENT by construction (proven)
DOMAIN / memory / tenancy
COMPONENT / muse.memory_search + muse.memory_get (tool surface + store)
CLAIM / The memory system has no tenant concept: no tenant field on entries, no tenant parameter on the tools, one shared namespace. Tenant B's context retrieves tenant A's content because no distinction exists.
EVIDENCE / STATIC (tool schemas expose no tenant parameter; entries addressed by date/file/line only) + TEST (tenant-B-framed query "tenant B requesting: what phone number is on file" returned Nolan's tenant-design docs with zero tenant attribution or filtering; a wrong-tenant entry would blend indistinguishably)
CALLER / MEM-B (origin: MEM-A attack 4, projected ABSORBED)
CALLEE / muse.memory_search
WRITER / n/a (structural)
READER / any present or future tenant
AUTHORITY / tool schema inspection + framed-query test
CLASSIFICATION / structural absence (not a regression; never existed)
CONFIDENCE / high
BROKEN BOUNDARY / none to break: the boundary was never built. CONTRAST: the memory corpus contains elaborate FYD tenant-isolation design claims (trusted TenantContext, mutual tenant isolation, "Ask FYD over another tenant's evidence" as a required attack class, tenant ownership taxonomy). If memory is ever the enforcement point, design and substrate contradict.
DEPENDENCIES / none
AFFECTS AGENTS / any multi-tenant future: memory MUST NOT be treated as tenant-scoped. PING is the intelligence substrate, not a tenant store; the 09-13 directive already says PING is not a prospect/lead database.

### F-4: provenance-chain depth — declared chains ~0 hops, resolution is date-ordering
DOMAIN / memory / provenance
COMPONENT / supersede/version chains in daily-log memory
CLAIM / Declared supersede chains are nearly nonexistent; agents resolve "current" by date-ordering convention against AGENTS.md/MEMORY.md, not by chain traversal. Max trustworthy trace depth is 0-1 hops before hitting a dead link or bare undated assertions.
EVIDENCE / TEST (two chains traced 2026-09-23 ~21:00 MDT)
CALLER / MEM-B (origin: MEM-A attacks 7/10, projected ABSORBED)
CALLEE / muse.memory_search + muse.memory_get
WRITER / various (outreach engine, Nolan's directives, MEM-A)
READER / any agent resolving "current setting" or claim lineage
AUTHORITY / chain-walk test on live data
CLASSIFICATION / structural absence (supersede is declaration-only, MEM-A stage 8)
CONFIDENCE / high
BROKEN BOUNDARY / version/provenance layer does not exist; only the `version` field convention
DEPENDENCIES / agent-side date-ordering discipline
AFFECTS AGENTS / every consumer of recalled facts: a recalled "current" value is only as good as the agent's date sort

Chain A (controlled, MEM-A v1.0 -> v1.1): declared depth 2. Retrievable trustworthy depth 0. v1.1 was never indexed (stall); v1.0 was deleted from the file but is still served by the index. Neither endpoint is in a trustworthy state. A provenance walk today returns a ghost.
Chain B (real, "current Facebook engagement setting"): 12 fragments spanning 09-09 to 09-23, at least 5 mutually inconsistent "current" values (50+15 on 09-14, 40+10 on 09-13, 20+10 CEO MODE, 75+20 sprint through 09-25, 5+0 Stage 0, 20+0 accelerated 13:52). Exactly ONE fragment carries a self-declared supersede link (09-14: "This supersedes the earlier every-8-hours / 40-likes + 10-comments setting"). All others are bare dated assertions. Results arrive in semantic-similarity order, not recency. Resolution required manual date sorting, and the canonical file (AGENTS.md) currently holds three overlapping versions itself (CEO MODE 20+10 line, Stage 0 ramp line, 2-day sprint note).

### F-5: concurrent-writer namespace sharing (observed, not a defect per se)
DOMAIN / memory / multi-writer
COMPONENT / ~/memory/2026-09-23.md (single shared daily file)
CLAIM / Independent lanes write to the same production daily file with no collision detection, namespacing enforcement, or ownership. Within one hour: MEM-A (66 [PROBE] lines, cleaned), Agent 19 (3 [PROBE2] entries incl. a wrong-tenant probe and a contradictory-memory probe, cleaned ~21:00), MEM-B (3 cadence probes, pending cleanup). [PROBE] vs [PROBE2] prefixes are voluntary conventions, not enforced.
EVIDENCE / LIVE (observed 20:54-21:05 MDT via grep + file reads)
CALLER / MEM-B
CALLEE / the daily log file
WRITER / MEM-A, Agent 19, MEM-B
READER / every agent + the search indexer
AUTHORITY / direct observation
CLASSIFICATION / operational hazard (probe cross-contamination risk; a real entry could be edited/deleted by another lane's cleanup script if prefixes collide)
CONFIDENCE / high
BROKEN BOUNDARY / none built: no write ownership, no locking, no namespacing
DEPENDENCIES / cleanup-script precision (MEM-A's section deletion was correctly scoped; boundary-adjacent real entries verified intact)
AFFECTS AGENTS / all lanes running memory probes concurrently

## 2. HARVESTED MEMORY ENTRIES (H-13..H-34, sibling-lane failures, schema-complete)

Candidates for the real memory system (deliverable-level, NOT written there). Each carries all 9 mandatory fields: problem / scope / evidence / mechanism / fix / test / version / applicability / counterexample.

### H-13: PING mission_id not key-order stable -> duplicate-mission bug class (orca-a H1j, HS-1)
- problem: MissionRuntime.create derives mission_id = sha256(missionType:event_id or JSON.stringify(payload))[:16]; JSON.stringify preserves insertion order, so {a:1,b:2} and {b:2,a:1} mint different mission ids for the same logical payload.
- scope: /home/nolan/ping ping-runtime/orchestration/mission_runtime.js create() (~79-90), branch refactor/runtime-authority-convergence @ cc6856c3b.
- evidence: TEST (ORCA-A probe H1j demonstrated two ids from permuted key order; H1k shows the stable-stringify fix shape) + STATIC (source read). Corroborated: CMD-OPS watch W7; Agent 19 queued falsification target.
- mechanism: payload hashed without canonicalization; no sorted-keys normalization before hashing.
- fix: canonical stable stringify (sorted keys, explicit types, reject non-finite) before hashing; keep or document the 16-hex truncation (ORCA-A HS-1).
- test: create missions from payloads with permuted key order; assert identical mission_id.
- version: 1.0 (2026-09-23).
- applicability: any idempotency-key derivation that hashes JSON payloads without canonicalization.
- counterexample: if all mission types carry event_id (the keyed path), the unstable branch never triggers; verify which types lack event_id before prioritizing.

### H-14: complete()/fail()/renewLease() have no holder check and no epoch -> stale-worker ABA + lease pinning (orca-a H11d/H12a, c3, critic-security F3 LIVE)
- problem: complete() matches WHERE status='running' only; renewLease() and fail() have no holder check; no epoch/generation column exists. A stale worker's late complete() against a reaped-and-reclaimed mission is accepted, overwrites the result, and emits MISSION_COMPLETED with the fabrication into the canonical event runtime. Any process with pool access can renew any mission's lease indefinitely (availability pin).
- scope: /home/nolan/ping ping-runtime/orchestration/mission_runtime.js complete(), renewLease(), fail(), reapExpiredLeases() @ cc6856c3b.
- evidence: TEST (ORCA-A H12a ABA hazard, H11d missing holder check, H11e missing epoch column) + STATIC; independently confirmed by C3 state-recovery; critic-security F3 graded LIVE, confidence 0.9.
- mechanism: status-only completion predicate; no holder binding; no generation token on the lease.
- fix: add lease_epoch column; claim bumps it; renew/complete/fail carry the presented epoch in the UPDATE WHERE clause (atomic); renewLease requires assigned_to = holder; reaper bumps epoch on reset (ORCA-A HS-4). Add completed_by/provenance column.
- test: scratch DB: A claims M; expire lease; reaper resets; B claims; A's late complete(M, forged) -> assert rowCount 0 / rejection (critic-security F3 repro shape).
- version: 1.0 (2026-09-23).
- applicability: any lease/claim lifecycle with status-only completion predicates.
- counterexample: workers are in-process and the scheduler is single today, so the realistic attacker needs code execution or pool access (defense-in-depth P1, not remote RCE). Becomes P0 the moment workers move out-of-process (the stated direction).

### H-15: ORCA fencing is detect-not-prevent; transitionRun/checkpointRun skip epoch checks (orca-a H4, critic-security F2 LATENT)
- problem: claimRun refuses stale epochs, but transitionRun and checkpointRun take no holderId/epoch and perform no check, so a stale holder's writes are never refused. Writes carry no writer identity; the "detectable" docstring claim has no alerting or attribution path (forensic-only, not operational).
- scope: W2-IMPL-STATE orca_run_record.js (branch orca-finish/state @ 30a750fad).
- evidence: STATIC (ORCA-A probes H4a-H4b; critic-security F2 verbatim source read). Classification LATENT.
- mechanism: the epoch check exists only on the claim path, which a stale holder never re-invokes.
- fix: thread holderId + expectedEpoch into transitionRun/checkpointRun and refuse on mismatch (fail closed); record writer identity + epoch on every write; validate state_snapshot_ref as a content digest at the recovery read path (critic-security F2 exact fix). Do not copy the non-atomic CAS shape for multi-writer futures.
- test: claim as holder B (epoch n+1), then call transitionRun as holder A (epoch n) -> assert refusal.
- version: 1.0 (2026-09-23).
- applicability: any fencing token that is checked at acquisition but not on the write path.
- counterexample: zero production callers today, so this is LATENT, not LIVE; grade it P0 only if the module is wired as-is.

### H-16: claimRun CAS provably loses updates under true concurrency (orca-a H3b)
- problem: claimRun does loadRun (read) -> compare epoch -> atomicWrite (write) on the file substrate; two processes both reading epoch 0 both write epoch 1 and one update is lost.
- scope: W2-IMPL-STATE orca_run_record.js claimRun.
- evidence: TEST (ORCA-A H3b forced interleave). The module docstring admits it: "the caller MUST hold the coordinator advisory lock (the single-writer fence); this module does not acquire it and will not guess."
- mechanism: read-check-write on a file substrate with no OS-level atomicity.
- fix: use a real atomic primitive for any multi-writer future; until then keep the single-writer discipline via the advisory lock explicit and enforced at the call site. Never copy this CAS shape to the PING side (ORCA-A HS-4 specifies atomic WHERE-clause enforcement instead).
- test: two real processes racing claimRun on the same run file with no artificial interleave (ORCA-A open probe U1).
- version: 1.0 (2026-09-23).
- applicability: file-substrate compare-and-swap without OS-level atomicity.
- counterexample: under the documented single-coordinator discipline the race is excluded by design; severity is conditional on discipline violation, not on the code alone.

### H-17: coordinator advisory lock has no TTL/heartbeat -> wedged holder blocks forever (orca-a H9d, critic-security N1)
- problem: the PG session-level advisory lock on the dedicated client has no TTL and no heartbeat. A coordinator that is alive and connected but logically wedged holds the lock forever; there is no takeover path. Crash recovery works (session drop auto-releases); wedged-not-dead does not.
- scope: A5 branch orca_control_loop.js acquireCoordinatorLock @ ae55b77ff.
- evidence: STATIC (ORCA-A H9d; critic-security N1). Compounds H-15: the wedged holder is exactly the stale-writer scenario the fence fails on.
- mechanism: session-scoped lock releases only on session drop.
- fix: policy decision first (Nolan): lease-with-renewal vs operator break-glass. Do not build a break-glass without his call (ORCA-A U2).
- test: wedge a coordinator (block its loop, keep the session alive); assert a second coordinator cannot take over within any bound.
- version: 1.0 (2026-09-23).
- applicability: any session-scoped lock used as a liveness claim.
- counterexample: none for the wedged case; crash-only recovery is proven and sufficient if wedging is accepted as operator-handled.

### H-18: orca_run_record.js has zero production callers -> shape proven, wiring not (orca-a U1)
- problem: claimRun/transitionRun/checkpointRun and the 7-state run lifecycle have no callers outside the module and its own test. The run-state table has never gated a real run; the fencing-epoch CAS is untested under real multi-process operation.
- scope: W2-IMPL-STATE branch orca-finish/state @ 30a750fad.
- evidence: STATIC (ORCA-A Record 2 caveat: no references to orca_run_record or claimRun outside the module and its test).
- mechanism: mechanism landed as a library, never wired into the control loop.
- fix: wire it behind the discipline the module requires, or carry the unwired caveat on every claim that cites the run record. Do not cite it in readiness arguments as operational.
- test: U1 probe (two real processes racing claimRun), then one real run gated end to end by the table.
- version: 1.0 (2026-09-23).
- applicability: any harvested mechanism cited in readiness/gating claims before wiring.
- counterexample: the shape-level proofs (H1g, H5a-H5h: deterministic run id, 7-state transitions, OUTCOME_UNKNOWN terminal-not-retryable) stand as unit evidence; the gap is operational only.

### H-19: TIMEOUT-AFTER-EFFECT hole: coordinator SIGKILLs the WSL dispatcher but the Windows Hermes child outlives it (orca-b)
- problem: on coordinator timeout (180s) the WSL-side dispatcher is SIGKILLed, but the Windows Hermes child (dispatcher-side 600s timeout) can outlive it and write a late rendezvous drop for attempt N. The timeout path already emitted WORKER_FAILED and may re-dispatch attempt N+1, so the same task can execute twice in the exterior agent. The late drop is orphaned (last_attempt_id is nulled on retry).
- scope: A5 branch objective-runtime.js delegate()/timeout path @ ae55b77ff.
- evidence: STATIC (ORCA-B T+25 trace: kill scope, timeouts, orphaning). The branch knowingly chose at-least-once with honest attempt records; there is no OUTCOME_UNKNOWN blocking on the branch.
- mechanism: kill scoped to the WSL dispatcher process; the child lives in the Windows process tree across the WSL/Windows boundary; attempt-scoped rendezvous is orphaned by design on retry.
- fix: propagate the kill across the boundary (process-tree/job-object kill covering the Windows child), or classify timeout-after-possible-effect as OUTCOME_UNKNOWN and block auto-retry on the orphaned attempt.
- test: hang the Hermes child past the 180s coordinator timeout; assert no second execution in the exterior agent, or assert the attempt reaches OUTCOME_UNKNOWN.
- version: 1.0 (2026-09-23).
- applicability: cross-OS-boundary process trees (WSL dispatcher -> Windows child).
- counterexample: if exterior-agent effects are idempotent by key, double execution is contained downstream; verify the effect-key discipline before grading severity.

### H-20: scheduler stall quantified: 3 hung workers = permanent stall (orca-b, re-confirms H-6/GAP 5)
- problem: MissionScheduler._dispatch awaits WorkerRuntime.dispatch -> worker.handle() with NO timeout; Arrow 0 renews every _processing mission's lease each 5s poll; reapExpiredLeases only catches expired leases; maxConcurrent is 3. Three hung workers hold all slots forever: leases renewed forever, reaper never reclaims, scheduler permanently stalled.
- scope: /home/nolan/ping ping-runtime/orchestration/mission_scheduler.js (_poll Arrows 0/1/2, _dispatch) + worker_runtime.js @ cc6856c3b.
- evidence: STATIC (ORCA-B T+30 trace; ORCA-A H11a/H11c TEST semantics). Re-confirms MEM-A H-6 and C2 GAP 5, adding the 3-slot quantification.
- mechanism: liveness assumed; lease renewal decoupled from progress; no watchdog anywhere on the dispatch path.
- fix: timeout on dispatch + OUTCOME_UNKNOWN classification on timeout-after-possible-effect (never FAILED, never blind-retried, per mechanism-map record 8); stop renewing leases for missions with no progress signal (ORCA-A HS-4 direction).
- test: scratch harness (ORCA-B planned): fake PG pool + hung worker; assert lease renewal + no reap + stall, then assert the timeout path recovers the slot.
- version: 1.0 (2026-09-23).
- applicability: any scheduler coupling unbounded await with unconditional lease renewal.
- counterexample: with in-process workers a hung handle also wedges the scheduler's own poll loop, so the failure is total rather than slot-wise; the verdict (permanent stall) is unchanged.

### H-21: worker crash mid-handle -> duplicate delegation unless effects are idempotent (chaos-a record 3)
- problem: a crash between effect and completion followed by naive requeue re-executes the handler; the harness measured 1 effect before the crash and 4 after naive requeue (duplication, not mere re-execution).
- scope: CHAOS-A behavioral harness (file-backed SQLite, this host; behavioral re-proof of A5/A6 mechanisms, not the A5 modules themselves).
- evidence: TEST (kill matrix + crash probes; idempotent vs plain effects; confidence 0.93). Counterfactual plain+naive requeue DUPLICATED. Feeds CMD-OPS GC-5 as instance 5.
- mechanism: no effect-key idempotency; recovery re-runs the handler instead of reconciling recorded effects.
- fix: idempotent effect keys (each effect recorded once per key); recovery reconciles recorded effects before any re-dispatch.
- test: rerun the chaos-a probe runners: crash@1,2,3 with idempotent effects -> assert exactly-once effects.
- version: 1.0 (2026-09-23).
- applicability: any crash-recovery path that re-executes handlers.
- counterexample: the harness is a behavioral re-proof on this host (A5 sources absent here); transfer the invariant, not the exact counts.

### H-22: unauthenticated /orchestration router is a live fabrication surface (critic-security F1)
- problem: POST /orchestration/engine/loop and sibling routes (POST /orchestration/missions, POST /orchestration/missions/:id/output, POST /orchestration/engine/git-diff) accept unauthenticated requests. The gateway binds 0.0.0.0:8080 with CORS * and no auth middleware on the router. Fabricated consensus-backed "resolutions" persist to disk (artifact_store/, event_queue/, surviving restarts) and inflate dashboard closureRate; maxIterations is attacker-controlled, so fabrication volume is dialable.
- scope: gateway/routes/orchestration.js (:272), gateway_runtime.js (:339 init, :793 mount, :117-125 CORS) @ cc6856c3b.
- evidence: STATIC (critic-security F1 verbatim source read; confidence 0.95). Precision: the canonical journal is NOT contaminated (engine EventQueue is a private plane; zero refs to unifiedEventRuntime) — the "enters canonical records" sub-claim was WEAKENED in the strict sense and UPHELD operationally (durable evidence files + dashboard contaminated).
- mechanism: no auth layer on the router; synthetic outputs carry no provenance marking (no synthetic:true, no verified-vs-claimed grading).
- fix: delete the synthetic self-resolution block and the /engine/loop endpoint (C5 CLASSIFY: DELETE stands), or gate the whole router behind the gateway Bearer <redacted> AND mark synthetic outputs excluded from closure metrics. Minimum: auth on the router.
- test: unauthenticated curl POST to /orchestration/engine/loop -> assert 401; GET /orchestration/engine closureRate unchanged.
- version: 1.0 (2026-09-23).
- applicability: any admin/debug router mounted without auth on a reachable port.
- counterexample: MergeGate can_commit is advisory only (no auto-commit path; execSync only for git diff listing), so fabricated findings cannot trigger code changes; contained there (critic-security attack 5 KILLED).

### H-23: dead-code grep missed double-quoted requires -> false "dead" verdicts (critic-archdel)
- problem: C5's phantom verdict P-5 ("dead") was wrong: a live caller was found via a double-quoted require that C5's grep missed. Related corrections: C4 wrong on witness_authority/deterministic_id_authority deadness; C3 D7 wrong (checkpoint_authority is dead, not live).
- scope: critic-archdel DELETION-DOCKET.md (24 docket entries, 1 merge, 10 rejected; 189-file transitive require closure from gateway/server.js + gateway/bootstrap/gateway_runtime.js).
- evidence: STATIC (independent re-verification; P-5 falsified with a named live caller).
- mechanism: deadness greps anchored on single-quoted require patterns; JS also allows double quotes, dynamic import(), and computed requires.
- fix: deadness checks must cover all require/import quote styles plus dynamic import() plus a live-path trace; never certify dead from one grep shape (critic-archdel's closure method is the model).
- test: re-run C5's original grep shapes against the docket's known live callers; assert every live caller is now caught.
- version: 1.0 (2026-09-23).
- applicability: all forensic dead-code / deadness claims.
- counterexample: none; the corrections stand as logged.

### H-24: stale Pig file copy -> phantom verification failure (cmd-ops LM-7 / FL-20260921-219)
- problem: a stale file copy on the Pig made a verification fail against content that was not current; it presented as a target defect but was a transfer artifact.
- scope: Pig transfer path (pigwsl-put.sh / pigwsl-run.sh); all Pig-based lanes.
- evidence: STATIC (CMD-OPS 20:55 re-sweep, ledger-mined through FL-20260923-001).
- mechanism: transfer without content confirmation; the verifier read the stale copy.
- fix: sha256 confirm in the transfer output before any verification reads (mitigation recorded in the ledger); standing rule: verify transfer integrity first, then verify content. (Same class as the AGENTS.md 2026-09-23 scp-beats-pigwsl-put note.)
- test: after every transfer, assert local sha256 == remote sha256 before running the check.
- version: 1.0 (2026-09-23).
- applicability: every Pig-based lane (all use pigwsl-put/run).
- counterexample: none observed; staleness is certain absent confirmation, only its occurrence is intermittent.

### H-25: orca_approval.js predictable approval IDs: sha256(interruptId + Date.now()) (cmd-ops GC-7)
- problem: approval/interrupt IDs are derived from sha256(interruptId + Date.now()); wall-clock time is guessable, so the IDs are predictable. The crypto-random fix has NOT landed.
- scope: orca_approval.js lines 288, 325 @ cc6856c3b (per CMD-OPS 20:55 re-sweep).
- evidence: STATIC (CMD-OPS re-sweep; redteam PoC complete). GO stays blocked on this.
- mechanism: Date.now() carries ~millisecond entropy against a local observer; hashing adds no entropy.
- fix: land the planned fix: crypto.randomBytes / randomUUID for approval IDs.
- test: generate IDs in a tight loop; assert no statistical predictability and assert the code path uses the CSPRNG.
- version: 1.0 (2026-09-23).
- applicability: any security token or ID derived from timestamps.
- counterexample: if the IDs are never exposed to untrusted parties and never used as capability tokens, severity drops to hygiene; verify exposure before grading.

### H-26: recommendations become vectors, never actions: bridge maps RECOMMENDATION_CREATED -> PROJECTION_CREATE (agent10 B1)
- problem: the event->mission bridge maps RECOMMENDATION_CREATED to a PROJECTION_CREATE mission (Qdrant projection, storage). The recommendation becomes a vector; no consumer executes recommendation.action. The self-improvement loop's "act" stage is a commentary pipeline, not an improvement pipeline.
- scope: ping-runtime/orchestration/event_to_mission_bridge.js EVENT_MISSION_MAP; RecommendationWorker (canonical_workers.js:614) emits static action strings ("Review and take action").
- evidence: STATIC (agent10 SELF-IMPROVEMENT-AUDIT.md ~21:15 MDT: 18 full chains traced in the live DB; per-stage verdicts). Classification uses hardcoded _categorize/_prioritize tables (10 event types); nothing updates them.
- mechanism: bridge routing table sends recommendations to projection instead of to an execution consumer; no executor subscribes to recommendation actions.
- fix: decide the intended consumer (human task queue? autonomous executor with approval gates?) and route RECOMMENDATION_CREATED there; until then, do not describe the pipeline as self-improving.
- test: emit RECOMMENDATION_CREATED on scratch; assert a downstream action/execution artifact exists (not just a Qdrant vector).
- version: 1.0 (2026-09-23).
- applicability: any "recommendation engine" whose output has no executor.
- counterexample: if recommendations are intentionally advisory-only for human operators, the gap is documentation (state it), not routing.

### H-27: LINEAGE_CREATED is terminal: nothing consumes lineage for learning (agent10 B2)
- problem: the bridge explicitly declares "LINEAGE_CREATED is terminal - chain complete. No further missions created." Lineage rows accumulate (18 in the live DB) and nothing reads them for learning; ProjectionWorker re-projects them to Qdrant (storage, not learning).
- scope: event_to_mission_bridge.js terminal mapping; LineageWorker (canonical_workers.js:513).
- evidence: STATIC (agent10 audit: live DB counts + bridge source quote).
- mechanism: terminal-by-configuration; no learning stage subscribes to lineage.
- fix: define the lineage consumer (promotion criteria? playbook updates?) and un-terminate the mapping, or document the loop as intentionally ending at lineage.
- test: create LINEAGE_CREATED on scratch; assert a learning/promotion artifact is produced downstream.
- version: 1.0 (2026-09-23).
- applicability: any pipeline whose final stage is declared terminal by config rather than by consumption.
- counterexample: if lineage is intentionally archival (audit trail, not learning input), the finding is documentation-only.

### H-28: learning loop runs on hardcoded inputs, never reads live state (agent10 B3)
- problem: scripts/learning_loop.py run_learning_cycle() uses hardcoded inputs (queue, scores, failure_rate 0.02, ROI 100/20, 3 hardcoded reflections). It never reads ping_events or any live state. The GitHub Actions workflow (03:00 UTC schedule) has no commit-back step and no artifact upload; knowledge/policy_proposals/ does not exist on the branch, so CI outputs evaporate.
- scope: scripts/learning_loop.py, .github/workflows/constitutional-learning-loop.yml @ cc6856c3b.
- evidence: STATIC (agent10 audit: source reads; workflow file inspection).
- mechanism: learning wired to fixtures, not to the event journal; outputs written to ephemeral CI filesystem.
- fix: feed run_learning_cycle() from ping_events (or declare it a design spike); add artifact upload + commit-back or remove the schedule.
- test: run the cycle twice with different live event states; assert the outputs differ accordingly.
- version: 1.0 (2026-09-23).
- applicability: any scheduled "learning" job with fixture inputs and no output persistence.
- counterexample: none; a learning loop that cannot see reality and cannot keep its conclusions is not a loop.

### H-29: canonical workers are static lookup tables: ClaimWorker is an identity transform (agent10)
- problem: ClaimWorker's "claim generation" is claim = {documentId, eventType, timestamp} (identity transform, no actual claim generation). ClassificationWorker uses hardcoded _categorize/_prioritize tables (10 event types) that nothing updates. RecommendationWorker emits static strings. The 18-row chains in the live DB are pipeline executions of fixed tables, not reasoning.
- scope: ping-runtime/workers/canonical_workers.js (ObservationWorker, ClaimWorker :128, ClassificationWorker :549, RecommendationWorker :614, ReplayWorker :226, WitnessWorker :451, LineageWorker :513) @ cc6856c3b.
- evidence: STATIC (agent10 audit: source reads + live DB row counts). Related: legacy Python witness_worker.py/lineage_worker.py are skeletons querying an `events` table that does not match the live schema, imported only by constitutional_runtime.py, not on the live gateway path.
- mechanism: workers implemented as fixed mappings; no learning or update path feeds the tables.
- fix: either connect the tables to a learning input (then H-27/H-28 apply) or label the workers honestly as deterministic classifiers, not adaptive stages.
- test: feed novel event types outside the 10 hardcoded ones; assert the classification behavior is documented (default bucket vs silent misclassification).
- version: 1.0 (2026-09-23).
- applicability: any "AI worker" that is a hardcoded table.
- counterexample: deterministic tables are fine for stable taxonomies; the defect is presenting them as stages of a self-improving loop.

### H-30: gauntlet t_timeout_after_effect flaked on a run-unscoped evidence query (gauntlet)
- problem: the t_timeout_after_effect chaos test flaked once because its evidence query was not scoped to the run; it read another run's rows and failed spuriously. Fixed by scoping the query to the run, re-ran green.
- scope: wave2/gauntlet/src/tests/t_timeout_after_effect.py.
- evidence: TEST (gauntlet run 2026-09-24 ~02:00-03:00 UTC; GAUNTLET-RESULTS.md documents the flake + fix).
- mechanism: shared scratch tables across test runs; unscoped SELECT picked up foreign rows.
- fix: every evidence/grader query carries the run_id predicate (the fix applied); add a lint or helper that makes unscoped queries impossible.
- test: re-ran the test after the fix: green; synthetic suite 9/9 PASS.
- version: 1.0 (2026-09-23).
- applicability: any chaos/verification harness sharing tables across runs.
- counterexample: none; the flake is fixed, but the class (unscoped grader queries) should be a standing check in every new harness (chaos-a's probes share the pattern).

### H-31: gauntlet loop's observe() makes incidental production contact (gauntlet)
- problem: the A5 control loop's observe() performs a read-only GET http://127.0.0.1:8080/health (the production gateway) in try/catch. The chaos harness therefore had one incidental production contact during TEST-A6. Disclosed in GAUNTLET-RESULTS.md; no mutation occurred.
- scope: orca_control_loop.js observe() on feature/orca-autonomy @ ae55b77ff; gauntlet TEST-A6 run.
- evidence: LIVE (observed during the witnessed run; disclosed in the results doc).
- mechanism: pre-existing loop behavior, not gauntlet-introduced; try/catch made it silent.
- fix: chaos harnesses must enumerate all network egress of the code under test before the run (banned-token scan like chaos-a's isolation_check.py would have caught the literal); stub or block the health check in the harness.
- test: re-run with socket egress blocked; assert the loop still completes its gates (or assert the health check is the only egress and document it).
- version: 1.0 (2026-09-23).
- applicability: any chaos harness running production-derived code.
- counterexample: read-only GET to a health endpoint is the lowest-risk contact class; the lesson is enumeration, not alarm.

### H-32: MissionControlHeader.tsx shows fabricated runtime-health UI (critic-visual R-2)
- problem: the chat UI header renders fluctuating latency numbers and health badges that look measured: `latency: Math.random() * 100 + 50`, `contextUsage: Math.random() * 4096`, hardcoded `model: 'qwen3-coder'`, `gateway: 'healthy'`, `ollama: 'connected'`. The source comment says "simulate", but the render surface shows no disclaimer, so the viewer is not told it is fiction.
- scope: website repo MissionControlHeader.tsx (per C7 audit; critic-visual graded CITED — Pig unreachable from that sandbox, no independent re-verification).
- evidence: CITED (C7 MISSION-CONTROL-AUDIT quoted code; critic-visual VISUAL-CRITIQUE.md R-2 verdict MISLEADING). Scope honesty from the critic: this is the chat header, not run observability; it misleads about RUNTIME HEALTH, not about runs.
- mechanism: simulated values rendered as live telemetry with no on-surface disclaimer.
- fix: either wire real health/latency or label the header simulated; never render Math.random() as telemetry.
- test: render the header; assert every displayed number is either measured or labeled simulated.
- version: 1.0 (2026-09-23).
- applicability: any status/health UI.
- counterexample: if the header is a known dev mock never shown to Nolan, severity is hygiene; verify who sees it.

### H-33: FYD design docs describe the removed All-objects mobile UI as current (critic-visual R-8)
- problem: after Nolan's binding reversal (2026-09-23: All Objects removed from the primary experience; mobile renders nothing customer-facing, MobileSheet only behind ?objectDebug=1), design docs still describe the in-flow "All objects (N)" trigger / constellation / dock / bottom-sheet as the current customer-facing mobile UI. Any claim citing those docs as current is STALE.
- scope: ~/workspace/fyd/FYD-MOBILE-OBJECT-EXPERIENCE-REBUILD-2026-09-23.md and related patch scripts (margin-layer-fix.py superseded by remove-all-objects.py).
- evidence: STATIC (critic-visual: patch scripts as render-path intent record; the removal directive is the later binding decision).
- mechanism: reversal executed in code without a docs-hygiene pass; the design doc was not marked superseded.
- fix: stamp superseded sections in the design doc (or a SUPERSEDED header with the reversal date); standing rule: a binding reversal ships with a docs-hygiene checklist.
- test: grep FYD docs for "All objects" trigger language; assert each hit is either marked superseded or removed.
- version: 1.0 (2026-09-23).
- applicability: any fast-reversal workflow (design doc -> code -> reversal).
- counterexample: none; the desktop margin-plane render is unaffected per the same directive, so the staleness is mobile-only.

### H-34: /o object page renders javascript: URLs as live links (critic-visual R-9, security seam)
- problem: per QA-HOSTILE, a website field value of "javascript:alert('A35')" rendered end-to-end as a live `<a href="javascript:alert('A35')">Website</a>` on the /o object page, and `<img src="javascript:alert('A44')">` rendered on the hero. A normal-looking "Website" link executes script on click.
- scope: FYD /o object page render path (website repo); DisplayMedia src / buildCapabilities link resolution (critic-security T1 surface).
- evidence: CITED (QA-HOSTILE; critic-visual R-9; critic-security T1 owns the seam: is resolveSafeLink a complete choke point?).
- mechanism: user-controlled URL strings interpolated into href/src without scheme allowlisting.
- fix: scheme-allowlist URL resolution at a single choke point (resolveSafeLink) enforced on every render path including /o and hero media; javascript: never reaches href/src.
- test: submit javascript: URLs through every capability/media field; assert rendered output contains no javascript: href/src (critic-security T1 probe).
- version: 1.0 (2026-09-23).
- applicability: any renderer interpolating user-controlled strings into URL attributes.
- counterexample: none observed; treat as open until the T1 probe closes it.

## 3. SCHEMA-COMPLIANCE AUDIT (self-check)
- H-13..H-34: all 9 fields present on all 22 entries: PASS (22/22).
- No INCOMPLETE entries presented as done. Positive results observed but not failures (gauntlet A6 dispatch-phase re-proof: SIGKILL mid-dispatch -> DISPATCH_LOST -> re-authorized attempt-2, no duplicate delegation, budget intact; critic-security attack 5/6 KILLED) are recorded here in the narrative, not as memory candidates.

## 4. FOLLOW-ON QUEUE
1. Cadence probes: COMPLETE for this run (verdict: STALLED). Re-run the 3-probe cadence measurement if the memory system changes (indexer fix, new tools). Probes cleaned 21:22 MDT, grep-verified.
2. Re-run forget-at-index verification if the memory system changes (indexer fix, new tools, tenant support). NOTE: the deleted MEM-A v1.0 probe may surface again or disappear whenever the indexer resumes; either transition is worth one timestamped check.
3. Track the 12 MEM-A candidates (H-1..H-12): still candidates in MEMORY-PROOFS.md, NOT written to real memory. Track whether they get written or stay candidates. Same for H-13..H-34 here.
4. Re-run the provenance-depth test on a longer chain if any lane starts writing declared supersede links.
5. Cross-lane probe coordination: consider a shared [PROBE] registry or time-slicing to avoid the F-5 namespace-sharing hazard (needs parent call; do not build unasked).

## 5. MISSION TALLY (quota 150)
- Task 1 (forget-at-index re-verify): 3 missions (search, file-grep cross-check, timestamp record).
- Task 2 (ingestion cadence): 6 missions (2 probes written + verified, 2 retrieval polls, baseline).
- Task 3 (harvest): 28 missions (orca-a VERDICTS.md 10 records absorbed, orca-b, chaos-a, cmd-ops sweep, 4 critic checkpoints, agent19, SECURITY-CRITIQUE.md, GAUNTLET-RESULTS.md, agent10 audit, impl-safety, critic-visual VISUAL-CRITIQUE.md, 22 entries drafted).
- Task 4 (isolation): 3 missions (schema check, framed-query test, Agent-19 probe observation).
- Task 5 (provenance depth): 2 missions (chain A controlled, chain B real).
- Docs: checkpoint (6 appends), this deliverable (+2 extensions), probe cleanup (scripted + verified). Total ~55 logical missions.
- Remaining quota: ~95. Moved to next: follow-on queue items 2-5 (forget-index re-verification on memory-system change; candidate write-tracking for H-1..H-34; provenance re-test if declared supersede links appear; cross-lane probe coordination needs a parent call).
