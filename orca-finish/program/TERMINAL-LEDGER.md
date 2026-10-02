# ORCA PROGRAM — TERMINAL LEDGER

**Status: DRAFT** — pending orca-c, orca-d, chaos-b, chaos-c Q4/Q5.
**Date:** 2026-09-24. **Authority:** Nolan's FINISH ORCA order.
**Rule:** no new mission families unless a terminal verdict reopens one with evidence.

Verdict scale: PING STRONGER / EQUIVALENT / ORCA STRONGER→HARVEST / PATTERN ONLY /
NOT APPLICABLE / REJECT / UNKNOWN→INVESTIGATE.
Harvest disposition scale: ADOPT / WRAP / LEARN / REJECT (recommendations only;
production adoption requires Nolan's veto gate per standing law).

---

## 1. Mission-family terminal verdicts

| Family | Scope | Verdicts | Status |
|---|---|---|---|
| ORCA-A | identity / claiming / leases / fencing (10 records, 57/57 probes) | HARVEST 5, PING STRONGER 2, EQUIVALENT 2, NOT APPLICABLE 1 | TERMINAL |
| ORCA-B | reconcile / resume / worker+coordinator death / completion matrix (15 rows; TEST-A6 LIVE) | HARVEST 10, PING STRONGER 1, EQUIVALENT 1, PATTERN ONLY 2, UNKNOWN→INVESTIGATE 1 (stale completion) | TERMINAL |
| ORCA-C | reconciliation / dep graphs / successor work / branch movement / MCP disappearance / memory poisoning / context staleness / budget exhaustion (8 missions, 68/68 probes) | HARVEST 7, EQUIVALENT 1 | TERMINAL |
| ORCA-D | ack/effect ordering / envelope binding / retry classification / schema drift (11 records; T2 LIVE on Pig) | PING STRONGER 8, PATTERN ONLY 1, REJECT 1 (D4 orphan hypothesis), UNKNOWN→INVESTIGATE 1 (D11 U4) | TERMINAL |
| CHAOS-A | 180 probe records | 164 SURVIVED / 7 WEDGED (FC-2) / 6 LOST-STATE (FC-3) / 3 DUPLICATED (FC-1 counterfactual) | TERMINAL |
| CHAOS-B | Q1 clock-skew / Q2 pool exhaustion / Q3 slow-path (41 valid records, ~289 missions) | 24 SURVIVED / 6 WEDGED / 4 LOST-STATE / 7 DUPLICATED | TERMINAL |
| CHAOS-C | Q3 closed (5 probes/9 missions): 2 new generic classes FC-4, FC-5 | Q3 TERMINAL; Q4 (20k storm) + Q5 (key aliasing) | PENDING (tail) |
| MEM-A | memory loop proof (index stall left 7 attacks as projections) | loop PROVEN w/ stall caveat | TERMINAL (superseded by MEM-C) |
| MEM-B | harvest H-1..H-32 | 32 candidates | TERMINAL |
| MEM-C | 44 missions; 10/10 attacks OBSERVED | H-35..H-48 (14 candidates, 9-field verified) | TERMINAL |
| Agent 19 | independent falsification (11 findings) | 7 SURVIVED / 2 WEAKENED / 2 KILLED | TERMINAL |
| Critics | 6 fresh passes over new artifacts | docket unchanged; 4 notable findings (P1 blocking, SEC1 HIGH, S4, S7) | TERMINAL |
| ArchDel | deletion docket D-1..D-24 | 24/24 PROVEN-DEAD survive re-grep | TERMINAL — PARKED FOR NOLAN |

### ORCA-A detail (10 records)
- mission identity: ORCA STRONGER→HARVEST (PING payload hash not key-order stable, H1j; ORCA stableStringify is, H1k)
- run identity: ORCA STRONGER→HARVEST (PING has no Run entity, GAP 1; ORCA deterministic run id + 7-state lifecycle)
- attempt identity: ORCA STRONGER→HARVEST (PING retries are a bare counter, GAP 3; ORCA stable attempt ids + records)
- work-order claiming: EQUIVALENT (PING atomic conditional claim; ORCA idempotent re-claim under single-writer)
- lease acquisition/renewal/expiry: PING STRONGER (PING has the only wired lifecycle; ORCA's run lease unwired; hung-worker hole H11 persists)
- fencing epochs: ORCA STRONGER→HARVEST (only ORCA has fencing token; PING no generation column; ORCA's is detect-not-prevent, H4)
- coordinator epochs: NOT APPLICABLE (neither implements)
- split-brain: ORCA STRONGER→HARVEST (ORCA PG advisory lock; PING no scheduler claim)
- double-claim races: PING STRONGER (PING DB-atomic; ORCA file CAS provably loses updates, H3b)
- stale-claim takeover: EQUIVALENT (PING TTL reaper wired; ORCA pidAlive reconcile)

### ORCA-B detail (15 rows)
HARVEST: checkpointing (H1), resume after death (H2), reconcileStartup (H2),
dependency graphs (H4), ready-set queries (H4), blocked-work model (H5),
worker death (H2), coordinator death (H3), effect-before-ack (H2/H6),
timeout-after-effect (H7+H5). PING STRONGER: duplicate completion (H6).
EQUIVALENT: ack-before-effect. PATTERN ONLY: successor work, late completion.
UNKNOWN→INVESTIGATE: stale completion.

### ORCA-C detail (8 missions, 68/68 probes)
HARVEST 7, EQUIVALENT 1 (budget: both terminate honestly). New harvest specs
(namespaced C-H6/C-H7/C-H8 to avoid collision with ORCA-B's H6/H7):
- C-H6 (tool disappearance): absent tool/worker must resolve to honest
  terminal-with-budget, bounded retry, or OUTCOME_UNKNOWN; poll loops need a
  per-mission consecutive-skip counter escalating to fail/DLQ. Found: mainline
  scheduler silently skips worker-less missions forever (no escalation); branch
  degrades honestly. → WRAP (skip-counter + escalation pattern).
- C-H7 (memory poisoning): worker-memory entries must carry
  {writer, source, recorded_at, ttl/version}; provenance rendered, contradictions
  flagged never co-rendered, expired excluded, junk rejected. Found: mainline
  stores contradictory/fabricated findings unflagged, renders them into prompts,
  no provenance; collectWorkerOutput creates a poison feedback loop. Local/product
  defect (single surface), adjacent to GC-4. → ADOPT the entry-shape + provenance
  rendering (small, surgical).
- C-H8 (epoch-gated writes): transitionRun/checkpointRun/updateWorkOrder present
  expectedEpoch checked under coordinator lock; PING complete/fail/renewLease
  carry holder token + lease epoch in WHERE. Found: W2 claimRun CAS works (stale
  epoch refused) but all write paths ignore the epoch (detect-not-prevent,
  TEST-confirmed); PING ABA hazard unchanged. → ADOPT (same enforcement family
  as HS-4).
- H-M1 (crash-point matrix): canonical-emit-before-terminal-mark with result_id
  ON CONFLICT DO NOTHING; all crash points converge, 400/400 reads zero torn
  JSON. → LEARN (test artifact + pattern).
- H-M3 (successor derivation): pure function of (verified predecessor terminal,
  live state) with stable identity; escalate on unverified inputs. Found: no
  durable successor-intent concept exists in either tree; restart recomputes from
  live state so successor content can drift. → LEARN.
- H5 verified: the uncommitted A5 H5 implementation passes 15/15 adversarial
  probes (classifier matrix, idempotent first-wins block, budget-respecting
  release, both crash windows fail closed, corrupt file fails loud).
- H4 re-proven 12/12 on W2 ready-set; zero production callers confirmed.
- Branch movement: A5 tip unchanged (ae55b77ff); H5 working tree verified sound,
  uncommitted; W2 state branch unchanged (30a750f, clean); mainline moved
  cc6856c3b → e48ef710 but probed files byte-identical — no semantic movement.
- No new generic classes. **orca-b record 15 (timeout-after-effect T2/T3)
  UNKNOWN is now CLOSED** by the verified H5 implementation. Caveats: m8 local
  defect (reserveWorkOrderBudget two-file crash-skew, fail-open but bounded);
  m4 hardening note (blockWorkOrder doesn't self-enforce OUTCOME_UNKNOWN-only).

### ORCA-D detail (11 records D1–D11)
PING STRONGER 8 (D1, D2, D3, D5, D6, D7, D8, D9); PATTERN ONLY 1 (D10, the
11-path ambiguity table as living regression checklist); REJECT 1 (D4 — the U1
orphan hypothesis is mechanically impossible); UNKNOWN→INVESTIGATE 1 (D11 —
U4, drill D2(b) vs DISPATCH_LOST re-delegation; evidence upgraded: V2 proves
re-delegation under genuine unknown duplicates non-idempotent effects; H5
deliberately left this path untouched).
- **U1 CLOSED.** Live Pig experiment (stub dispatcher mirroring
  hermes_dispatch.py, WSL node driver replicating kill mechanics): the worker
  dies WITH the dispatcher under all three death modes (coordinator-style
  SIGKILL, taskkill /F without /T, dispatcher self-abort via os._exit). No
  orphaned Windows child can complete after timeout; no late drop is possible
  (the dispatcher is the sole writer). Orca-b's U1 is superseded; T3 was never
  mechanically possible. Caveat: stub worker, not the real hermes_cli.
- **The live residual is T2, proven LIVE on the Pig:** worker finishes, drop on
  disk with returncode 0, dispatcher slow to exit, coordinator times out and
  discards the successful drop, records false WORKER_FAILED, auto-retries —
  h-timeout-effect.js V1: 2 non-idempotent effects for 1 task; canonical history
  reads FAILED then COMPLETED where the FAILED is false.
- T5/T6 stale poisoning (TEST): work-order-keyed result path never cleared, no
  attempt binding; attempt-1 evidence accepted as attempt-2's result on dispatch
  and restart-reconcile paths; replayed evidence mints a NEW canonical event
  instead of deduping.
- V2 genuine unknown (TEST): hung worker, no drop, retry duplicates effect
  under true unknowability. V3 idempotent-keyed (TEST): converges to single
  effect state — the retry-safety precondition.
- Commit window (TEST): re-emit converges (deduplicated=true, 1 row);
  emit-reject-before-commit fails closed (VERIFICATION_FAILED);
  emit-throw-after-commit escapes as unclassified FATAL exit(2) with sound
  restart recovery.
- Envelope (TEST): first-balanced-object-wins; a well-formed forged envelope
  earlier in stdout is extracted AND verified (precedence forgery);
  wrong-attempt replay accepted (no attempt binding, GC-7 reconfirmed);
  empty-string/empty-object outputs pass as completed.
- Retry (TEST): 57 unknown/adversarial kinds granted AUTO_EXECUTE (fail-open
  default; escalateUndecidable() exists but unused).
- Schema drift (TEST): older record missing dispatch_pid misread as dead and
  re-dispatched (fail-open); newer record under-counts attempt budget; one torn
  JSON file permanently bricks the objective (exit 2 every restart).
- Baselines at committed ae55b77ff; H5 as uncommitted working-tree changes
  (verified, not touched). All evidence read-only on repos; Pig artifacts
  cleaned up. No generic classes; failure pipeline all LOCAL ACCIDENT.
- New durable lesson to AGENTS.md: WSL node spawn() does not forward custom
  env to Windows interop processes; pass Pig-experiment parameters via argv.

### CHAOS-A detail
180 valid probe records, mean conf 0.943. FC-1 (duplicate effects without
idempotent keys — joins GC-5 as instance 6), FC-2 (no-retry-on-pool-drop wedges
loop — candidate), FC-3 (non-durable dispatch intent — candidate). FC-2/FC-3
single-lane candidates, not yet generic.

### CHAOS-B detail (41 valid records, ~289 missions, mean conf ~0.93)
24 SURVIVED / 6 WEDGED / 4 LOST-STATE / 7 DUPLICATED. Naming: CHAOS-B reused
FC-4/FC-5 labels already taken by CHAOS-C Q3; ledger namespaces them CBB-4,
CBB-5, CBB-6.
- CBB-4 pool hold-and-wait deadlock (WEDGED): 16 retry-armed units wedge 3/3 on
  a 2-conn pool. Sharpest: deadline + release-retry heals 1–2/16; deadline +
  exponential backoff × 30 attempts = 0/16 in 150s (self-sustaining retry
  churn, falsified by measurement). Restructured single-borrow units: 16/16 in
  2s. **Never-hold-while-acquiring is THE fix; deadlines are mitigation only.**
  Distinct from FC-2 (single-lane, outage). → LEARN (fix family: no
  hold-while-acquiring).
- CBB-5 worker-clock lease break (LOST-STATE/DUPLICATED): -60s skew resurrects
  expired leases; non-rotated bearer tokens let a superseded holder steal
  re-granted leases (2 holders, 2 effects). Fix: store-clock expiry,
  holder+token-bound extend, per-grant token rotation. → ADOPT the fix family
  alongside HS-4/C-H8.
- CBB-6 slow-path recovery races (LOST-STATE/DUPLICATED): 2–5s latency creates
  no new torn mechanism but widens every recovery window ms→s: supervisor
  timeout double-recovers alive-but-slow workers (3/3, no crash needed), SIGKILL
  orphans split-txn work without reaper (3/3), torn checkpoints re-dispatch
  (3/3). All fixed variants 12/12 SURVIVED. → LEARN (latency widens recovery
  windows; reaper + fencing required).
- Isolation certified (scratch SQLite only, socket-blocked, strace audited).
  Requeue RQ-B1/B2/B3 appended to chaos-a/FOLLOWON-QUEUE.md (impl-lane
  requeues); memory candidates MC-B1/B2/B3 in CHAOS-RESULTS.md §8 for filing.

### CHAOS-C detail (Q3)
FC-4 (DUPLICATED): supervisor timeout during 5s logical commit; deposed
worker-A's late unconditional set_packet overwrites the packet row (packet says
A, completion fence says B). FC-5 (LOST-STATE): deposed worker-A's 5s checkpoint
commits after B's reclaim + checkpoint and becomes newest; restore resurrects
stale state. Common fix family: fence every post-claim write and
checkpoint/restore selection on (claimed_by, attempt_seq). Fixtures + lane notes
done.

### MEM-C detail
Loop re-proof 9/10 stages; FORGET-at-index BROKEN (stale snapshot serves deleted
fragments; old citations rot). All 10 attacks OBSERVED — pipeline has no active
defenses; every working defense is agent convention. Sharpest: WRONG-VERSION
fragment date-ordering adopted a plant dated 2026-09-30 — convention: never
date-order bare fragments, INJECT first. M-27: production index converged inside
~8h (reframed: unmarked staleness window, not permanent non-propagation).

### Agent 19 detail
SURVIVED 7 (C5 wiring, C3 ancestry, C3 zero-hit, C2-GAP12, wedge mechanism
TEST-proven on real file 9/9, H1j reproduced via real MissionRuntime.create,
G-03). WEAKENED 2 (P-7 "verbatim"→paraphrase; 524-test dirty-tree-scoped, clean
re-run blocked x3). KILLED 2 (landed wedge probe cannot fail — exit 0 carries
zero info, LOCAL ACCIDENT docketed; create() docstring "idempotent by
construction" — code uses JSON.stringify not canonical).

### Critics detail
Docket: no status changes (24/24 stand at HEAD cc6856c3b, dirty 17).
P1 (blocking): prior PRODUCT-CRITIQUE.md physically truncated — do not cite
targets 5/6. SEC1 (HIGH): HS-6 accepts any present rendezvous, no
freshness/digest/identity. S4: HS-2 run identity drifts from W2 form, depends on
nonexistent per-scope sequence authority. S7: GAUNTLET-RESULTS self-contradiction
("Nothing production was touched" vs documented production health GET).
Regressions: RW-1 (product critique completeness, blocking), RW-2 (A6), RW-3
(ORCA-B terminal vocab corrected), RW-4 (no docket regression). Watch W13–W18.

---

## 2. Harvested primitives — disposition

Dispositions are RECOMMENDATIONS. Production adoption requires Nolan's veto
gate. ADOPT = take as specified. WRAP = take behind an adapter/boundary.
LEARN = keep as proven spec/knowledge, implement only on a Nolan decision.
REJECT = do not take.

### ORCA-A harvest specs (HS-1..HS-6)

| ID | Primitive | Disposition | Rationale |
|---|---|---|---|
| HS-1 | key-order-stable mission identity (canonical stable stringify in MissionRuntime.create) | ADOPT | Pure function, no schema change, no migration. Closes proven duplicate-mission bug class (H1j, reproduced via real code path by Agent 19). |
| HS-2 | durable run record + deterministic run identity (7-state lifecycle) | LEARN | New table/entity; spec proven (H1g, H5a–H5h) but adoption is a schema decision for Nolan. Caveat S4: pick canonical run_id derivation before build. |
| HS-3 | attempt identity + per-attempt records | LEARN | Companion table; proven shape, adoption gated on schema decision. |
| HS-4 | fencing epoch on leases, enforced in SQL WHERE clause | ADOPT | Closes the stale-worker ABA hazard (H12a, critic-security F3 LIVE). Atomic enforcement specified; do not copy ORCA's non-atomic file CAS shape. |
| HS-5 | single-writer scheduler claim (PG session advisory lock, dedicated client) | ADOPT | Small, crash-safe via session drop; closes split-brain double-poll. |
| HS-6 | liveness-checked stale-claim takeover | WRAP | Liveness is environment-specific (process today, heartbeat/job-id tomorrow); wrap behind a liveness-hook interface. Caveat: `leave`+alarm without HS-5 can wedge a slot (performance critic). |

### ORCA-B harvest specs (H1–H7)

| ID | Primitive | Disposition | Rationale |
|---|---|---|---|
| H1 | monotonic versioned checkpoints, content-addressed snapshot refs | LEARN | Proven semantics; storage design is a Nolan decision. |
| H2 | crash-safe startup sequence (intent-only identity, attempt-before-dispatch, three-branch reconcile, DISPATCH_LOST) | WRAP | TEST-A6 LIVE-proven as a sequence; wrap as a reusable reconcile module rather than copying the branch loop. |
| H3 | single-coordinator claim (PG advisory lock) | ADOPT | Same mechanism as HS-5; one implementation, not two. |
| H4 | ready-set queries + dependency-graph claimable computation | LEARN | Proven query shapes; adopt the semantics, design the store binding later. |
| H5 | OUTCOME_UNKNOWN terminal-except-administrative-cancel + blockedWorkOrderIds | ADOPT | WIRED in the A5 branch worktree (staged-certified 30/30 + baselines 16/16, 24/24; uncommitted). Certification: STAGED — LIVE proof awaits first live post-boundary timeout (U1). |
| H6 | canonical completion through spine emit | LEARN | Do NOT build as specified: SEC1 HIGH — rendezvous accepted with no freshness/digest/identity. Require those before build. |
| H7 | honest coordinator-constructed failed envelope ("not witnessed" labeled) | WRAP | The honesty labeling is the takeaway; wrap as an envelope convention. |

### ORCA-D harvest specs (HD1–HD10; HD4 rejected with D4/U1)

| ID | Primitive | Disposition | Rationale |
|---|---|---|---|
| HD1 | closed failure-kind enum + unknown-to-escalation | ADOPT | Closes the 57-kind fail-open AUTO_EXECUTE default; escalateUndecidable() exists but is unused. |
| HD2 | attempt-scoped result paths + drop/attempt binding + consume-on-read | ADOPT | Closes T5/T6 stale poisoning (attempt-1 evidence accepted as attempt-2's result). |
| HD3 | preserve the discarded drop as evidence on timeout (extends H5) | ADOPT | The T2 residual is LIVE-proven: false WORKER_FAILED with the successful drop discarded; keeping the drop turns it into evidence, not loss. |
| HD5 | idempotent-keyed effects as AUTO_EXECUTE precondition | ADOPT | V3 proves idempotent-keyed converges; V2 proves genuine unknown duplicates without it. |
| HD6 | spine identity + ON CONFLICT DO NOTHING | LEARN | Re-emit convergence proven (deduplicated=true, 1 row); storage binding is a Nolan decision. |
| HD7 | explicit COMMIT_UNKNOWN outcome | WRAP | The emit-throw-after-commit FATAL exit(2) escapes classification; wrap as an outcome state in the kind enum. |
| HD8 | attempt-bound, precedence-safe envelope extraction | ADOPT | Precedence forgery (well-formed forged envelope extracted AND verified) and wrong-attempt replay accepted; security-relevant. |
| HD9 | schema_version + per-record quarantine + UNKNOWN-not-dangerous defaults | ADOPT | One torn JSON file permanently bricks the objective (exit 2 every restart); fail-open drift misreads. |
| HD10 | 11-path ambiguity table as living regression checklist | LEARN | PATTERN ONLY; keep as checklist, not code. |

### Chaos failure classes (FC-1..FC-5)

| ID | Primitive | Disposition | Rationale |
|---|---|---|---|
| FC-1 | duplicate effects without idempotent keys (joins GC-5) | LEARN | Regression fixture exists; fix = idempotent effect keys. |
| FC-2 | no-retry-on-pool-drop wedges loop | LEARN | Single-lane candidate; CHAOS-B re-probing. Fixture exists. |
| FC-3 | non-durable dispatch intent | LEARN | Single-lane candidate; fix direction: durable intent + next-reign adopt. |
| FC-4 | slow-path torn window: late deposed-worker packet overwrite | LEARN | Fix family: fence every post-claim write on (claimed_by, attempt_seq). Fixture + lane note done. |
| FC-5 | slow-path torn window: late deposed-worker checkpoint resurrects stale state | LEARN | Fix family: checkpoint/restore selection fenced on (claimed_by, attempt_seq). Fixture + lane note done. |

### Memory harvest (H-35..H-48, MEM-C; H-1..H-32, MEM-A/B)

All LEARN except noted. Standouts:
- H-35 (index serves deleted content, unmarked staleness window): LEARN — staleness marking is the fix, not just faster convergence.
- H-37 (fragment-level retrieval defeats entry-level conventions): LEARN — convention "never date-order bare fragments; INJECT first" should enter agent docs.
- H-39 (no tenant isolation in memory): LEARN — isolation mechanism proven buildable (namespaced store + tenant param), absent in production.
- H-40 (no provenance enforcement): LEARN.
- H-25 (predictable approval IDs, GC-7): ADOPT the fix — crypto-random IDs; the flaw is LIVE-noted.
- H-22 (unauthenticated /orchestration surface): ADOPT the fix — auth gate; live fabrication surface (critic-security F1 LIVE).
- H-13 (= HS-1 duplicate): ADOPT (same as HS-1).
- H-14 (= HS-4 duplicate): ADOPT (same as HS-4).
- H-48 (untracked oracle-assembly-patches bundle would resurrect D-2/D-3/D-7): LEARN — hygiene: do-not-apply-without-re-review flag recorded.

### REJECT list
- ORCA's file-CAS claimRun shape (provably loses updates, H3b) — REJECT the shape, keep the token concept (HS-4).
- Detect-not-prevent fencing as "sufficient" (H4/H-15) — REJECT the claim; enforcement must be at write time.
- Second event store for run records (HS-2) — REJECT; the run record is state, not events.
- PRODUCT-CRITIQUE.md targets 5/6 citations — REJECT until the truncation is repaired.
- Deleting any D-1..D-24 entry — REJECTED by standing order; deletions gated on Nolan's word.

---

## 3. Architecture-deletion docket

24 entries D-1..D-24, all PROVEN-DEAD, all survive the GC-12 all-quote-forms
re-grep (21 clean, 3 with hits triaged non-live: D-2/D-3/D-7 only in the
untracked `worktrees/oracle-assembly/oracle-assembly-patches` staging copy;
D-22a dead copy in preserved jev-surgical worktree).
**Status: PARKED FOR NOLAN. Zero deletions executed. Docket confidence stands.**
Hygiene flag: applying `oracle-assembly-patches` would resurrect D-2/D-3/D-7
requires and instantiate FilesystemAuthority — do-not-apply-without-re-review.

---

## 4. TEST-A6 certification

Gauntlet TEST-A6: PASS 6/6 gates (real loop SIGKILLed mid-dispatch;
reconcileStartup before dispatch; attempt-1 DISPATCH_LOST → NEW attempt-2;
durable budget persisted; attempt-2 worker hang → honest WORKER_FAILED, budget
exhausted, escalated human; no duplicate delegation) + synthetic suite 9/9
(R16, LIVE). Agent 19 recovery completed without contradicting evidence; its
wedge mechanism TEST (9/9 on the real file) corroborates the hung-worker
premise. **Certification: STANDS on gauntlet LIVE evidence, uncontradicted.
Second independent witness run: not performed — optional.**

---

## 5. H5 wiring certification

Wired in `/home/nolan/worktrees/orca-autonomy` @ ae55b77ff (re-verified
pre/post): `orca_unknown_block.js` (T1–T4 classifier, durable
blockedWorkOrderIds, release as sole writer out of OUTCOME_UNKNOWN),
`orca_control_loop.js` +102/−3 (timeout → OUTCOME_UNKNOWN + blocked + escalate;
delegate/reconcileStartup respect blocked ids; timeoutEnvelope RETIRED BY H5),
`orca_status_model.js` +5 (EVIDENCE_PENDING→BLOCKED edge, no automatic exit).
Tests: 30/30 staged harness on Pig against REAL branch modules; W2 baselines
16/16 + 24/24; node --check clean. All changes UNCOMMITTED, no pushes.
**Certification: STAGED-CERTIFIED. LIVE certification awaits the first live
post-boundary timeout through the wired path (the T2 residual; the U1 orphan
hypothesis is closed by ORCA-D's live experiment).** ORCA-C's 15/15 adversarial
verification of the uncommitted implementation additionally CLOSES the orca-b
record 15 (T2/T3) UNKNOWN.

---

## 6. Parked for Nolan (explicit)

1. Deletion docket D-1..D-24: execute / archive / reject — Nolan's word required.
2. Harvest ADOPT recommendations: HS-1, HS-4, HS-5, H3, H5-live, H-25 fix, H-22 fix, HD1, HD2, HD3, HD5, HD8, HD9, C-H7 entry shape, C-H8 — approve for implementation.
3. U4: drill D2(b) — wire H5 (done) or amend the drill text; drill owner's decision.
4. HS-2: pick canonical run_id derivation before build (S4).
5. HS-6: require rendezvous freshness/digest/identity before build (SEC1).
6. 524-test claim: accept as dirty-tree-scoped or order a clean re-run (blocked x3).
7. Wedge probe Phase E: fix with race-timeout control or retire E1 (Agent 19 docket).
8. PRODUCT-CRITIQUE.md truncation: repair before any citation of targets 5/6.
9. GAUNTLET-RESULTS.md header: one-sentence fix ("Nothing production was touched").
10. Gauntlet harness production health GET: remove or allowlist before CHAOS-B/C.
11. Stale completion (ORCA-B #11): still UNKNOWN→INVESTIGATE.

## 7. Program statistics

- ORCA-A: 10 records, 57/57 probes pass. ORCA-B: 15 rows (TEST-A6 LIVE).
  ORCA-C: 8 missions, 68/68 probes. ORCA-D: 11 records (T2 LIVE on Pig).
- CHAOS-A: 180 records (164/7/6/3), mean conf 0.943. CHAOS-C Q3: 5 probes/9 missions.
  CHAOS-B: 41 records (~289 missions), 24/6/4/7.
- MEM-C: 44 missions (program ~139/300 memory missions this wave).
- Agent 19: 11 findings. Critics: 6 passes, 8 deliverables.
- Generic classes confirmed this program: GC-1..GC-12 (cmd-ops), FC-1..FC-5 (chaos).
- Harvest candidates: HS-1..HS-6, H1–H7, H-1..H-32, H-35..H-48.
- Deletions executed: 0. Commits to main/master: 0. Production writes: 0.
