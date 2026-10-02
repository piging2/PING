# HARVEST LEDGER — internal half (Agent E: harvest-don't-clone, internal primitives)

Scope surveyed: /home/nolan/ping @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (branch
refactor/runtime-authority-convergence) vs 13 worktrees: 7 under /home/nolan/worktrees/
(constitutional-convergence, constitutional-convergence-authority-law, orca-autonomy,
ping-codex-convergence, ping-event-runtime, ping-harvest-12h, ping-oracle-deploy) and 6
under /home/nolan/ping/worktrees/ (VerifyReplay, agent-exec, agent-smoke-abc123def456,
oracle-assembly, playbook, python-prod). All access read-only via pigwsl-run.sh bridge.
Evidence standard: FILE + SYMBOL/FUNCTION + CALLER/REFERENCE + WHY. Claims tagged
OBSERVED FACT / SUPPORTED INFERENCE / UNRESOLVED.

Current-branch authorities referenced: event authority =
ping-runtime/events/unified_event_runtime.js -> ping_events; identity =
ping-runtime/authorities/identity_authority.js + deterministic_id_authority.js;
capability = runtime/kernel/capabilities/capability-authority.ts; evidence =
ping-runtime/evidence/evidence_authority.js; replay = runtime/kernel/replay/ (declared);
legacy = gateway/replay_verifier.js.

---

## E-01 — Duplicate-suppression early return + integration trace enrichment

SOURCE: /home/nolan/worktrees/ping-event-runtime, branch `event-runtime-deduplication`,
HEAD 1f40cf4328a09011ec5835e3824629815702d462. Commits 23f0df57e16e12710175ef0a7c04a943cb3c6aa4
("fix(events): prevent duplicate handler/integration dispatch"), 1f40cf4328a09011ec5835e3824629815702d462
("fix(events): implement collision detection for duplicate event IDs"), test 4d02c332f
("test(event-runtime): add concurrent duplicate emissions test").

VERSION: branch-experimental, 2026-09-17/18.

PRIMITIVE: In `UnifiedEventRuntime.emit()`, when `ON CONFLICT (event_id) DO NOTHING`
reports rowCount 0, compare persisted payload vs candidate payload: same payload =
genuine duplicate -> `return { status:'ok', eventId, event, deduplicated:true }`
BEFORE handler/integration dispatch; different payload = collision error with
`collision:true`. Integration routing enriched with `{ namespace, event_id,
correlation_id, causation_id }` (trace propagation across the integration boundary).

CURRENT CRX EQUIVALENT: same file ping-runtime/events/unified_event_runtime.js
(current lines ~150-205): dedup detected (`deduplicated++` at line 177), semantic
collision fails closed (lines 161-175) — OBSERVED FACT via direct read.

DELTA: current branch FALLS THROUGH after `deduplicated++` to handler dispatch
(lines 184-190) and integration routing (lines 197-201) — duplicate events still
fire handlers and integrations (double side effects). Integration emit is
unenriched (line 199: `emit(event.event_type, event.payload)` only). OBSERVED FACT
via direct read of current source.

ADOPT-ADAPT-REJECT: ADOPT (both hunks).

WHY: Fixes a real double-dispatch bug on the live boot path (problem real:
concurrent duplicate emissions tested 9-duplicates-1-outcome). Same file, same
authority — REPURPOSE, not shadow. Tested: commit message reports 11 passed/0
failed for the no-redispatch invariant plus concurrent-emission test
(SUPPORTED INFERENCE on exact test file content; commit messages are the
evidence). Deterministic: pure function of persisted vs candidate payload.

DEPENDENCY COST: zero (same file, additive return + enriched args).

MIGRATION RISK: low. Behavioral change is the fix itself; risk only if a
downstream caller depends on duplicate redispatch (grill G-3).

SECURITY EFFECT: reduces duplicate side-effect amplification (retry storms no
longer re-trigger integrations).

OBSERVABILITY EFFECT: positive — `deduplicated:true` return distinguishes
dedup from fresh emit; enriched integration args carry correlation/causation.

MEMORY EFFECT: prevents duplicate memory writes from redispatch.

MCP EFFECT: none directly.

---

## E-02 — Worker-hop lineage propagation (memory provenance)

SOURCE: /home/nolan/worktrees/ping-harvest-12h, branch `sprint/harvest-12h`,
HEAD 8fe3b806077d1afb821bb908cf518e5af83a76b6. Commits 404e789aa
("feat(workers): ObservationWorker propagates event.knowledge_refs lineage") and
014891f88 ("feat(workers): ClaimWorker propagates observation lineage to claims"),
both touching ping-runtime/workers/canonical_workers.js (+45 lines total).

VERSION: branch-experimental, 2026-09-17.

PRIMITIVE: fail-soft lineage passthrough — ObservationWorker copies
`event.knowledge_refs` onto the observation; ClaimWorker copies
`context_pack_id`, `context_evidence_refs`, `context_knowledge_refs` from
observation/payload onto the claim AND the CLAIM_CREATED payload. Well-typed
extraction only; absent/malformed leaves output byte-identical to baseline.

CURRENT CRX EQUIVALENT: ping-runtime/workers/canonical_workers.js has a
LineageWorker (lines ~511-540, tracks lineage/causation chains) but ClaimWorker
and ObservationWorker contain NO context_pack_id/knowledge_refs passthrough
(OBSERVED FACT via grep).

DELTA: lineage dies at the first downstream worker hop in current; the branch
closes observation -> claim.

ADOPT-ADAPT-REJECT: ADAPT (adopt the pattern; re-run the drive first).

WHY: Problem real — commit message documents the H75 finding that ClaimWorker
dropped all three fields at the first downstream hop. Improves the vertical
trace (MEMORY -> DECISION -> EVENT -> MEMORY -> RECALL) by keeping provenance
attached to derived records. Same authority file, additive fields, fail-soft —
REPURPOSE. Deterministic where it matters (pure field copy, no ordering
dependence).

DEPENDENCY COST: zero.

MIGRATION RISK: low (fail-soft; additive fields only).

SECURITY EFFECT: neutral (provenance aids audit; no new data flows).

OBSERVABILITY EFFECT: positive — claims become traceable to evidence.

MEMORY EFFECT: positive — this IS memory provenance.

MCP EFFECT: none.

CAVEAT: test evidence is commit-message-claimed ("Drive 7/7 pass"); no
standalone test file located in the tree (UNRESOLVED G-4). Re-run on the
convergence branch before adopting.

---

## E-03 — Collision-safe event identity with canonical-hash witness (V2 identity)

SOURCE: /home/nolan/worktrees/constitutional-convergence-authority-law, branch
`constitutional-convergence-authority-law`, commit 1995f0a5907dfd1c709426ab2986275ecc318ec8
("feat(events): collision-safe event identity with canonical-hash witness").
Files: ping-runtime/events/unified_event_runtime.js (+129/-31),
runtime/kernel/authorities/identity_authority.js (+31).

VERSION: branch-experimental, 2026-09-19.

PRIMITIVE (separable layers):
(a) `identityAuthority.generateIdWithDigest(type, identityData)` returns
`{ id: '<type>_<16hex>', digest: <full 64-hex sha256> }`; the digest is persisted
as a `canonical_hash` witness column and compared on event_id conflict to decide
duplicate vs true collision (witness compared, never recomputed from stored
content). Historical rows stay NULL and are NEVER backfilled — recomputation
cannot prove the original preimage choice, so a fabricated witness is worse than
none (honest provenance).
(b) `sequence` column: PostgreSQL-allocated monotonic log position, explicitly
storage metadata, never an input to event identity; idempotent backfill ordered
by (timestamp, event_id), classified LEGACY BACKFILL ORDER not proven execution
order.
(c) Opaque capability object `_legacyIngressCapability` minted once in bootstrap;
emit() grants the legacy-registry exception only on exact object-identity match
— forgeable boolean flags (`options._skipGovernance`, `options._legacyIngress`)
are closed.
(d) Typed deterministic failure codes through emit(): IDENTITY_VALUE_REJECTED
(F7/D1 value-domain boundary BEFORE minting — rejected events get no ID, no
persistence, no acceptance claim), UNKNOWN_EVENT_TYPE, GOVERNANCE_VIOLATION,
EVENT_IDENTITY_CONFLICT (fail-closed), with `collisions_rejected` /
`witness_unavailable` stats.
(e) RFC-8785 canonicalization of the identity preimage; `identity_version`
inside the preimage (domain separation; Era H 64-hex IDs never rewritten).

CURRENT CRX EQUIVALENT: unified_event_runtime.js mints
`crypto.createHash('sha256').update(JSON.stringify(identity))` (current line 82)
— insertion-order dependent, NOT canonicalized (OBSERVED FACT; determinism gap).
No witness column, no sequence, no typed codes in emit (grep count 0 for
deterministicFailure), no capability-bound ingress.

DELTA: (a) is the highest-value delta — content-derived identity WITHOUT a
collision witness is a latent misclassification bug (16-hex truncation can
collide). (e) fixes the live determinism gap in minting. (c) closes a real
bypass class in the same file.

ADOPT-ADAPT-REJECT: ADAPT in phases — (e) canonical minting first (smallest,
highest value); then (a) witness column + conflict comparison; then (b)
sequence/replay() foundation (required by E-05); (c)/(d) with the emit rewrite
as one reviewed change. The whole commit REPLACES the canonical authority's
internals in place — REPURPOSE, not shadow.

WHY: Problem real — emit() is the live boot path; concurrent emissions make
truncation collisions plausible, and the event-runtime branch proved concurrent
duplicates occur. Deterministic: RFC-8785 preimage, version in preimage.

DEPENDENCY COST: (b) needs a migration (additive columns, backfill); (a) needs
the identity_authority change in the same commit (co-located).

MIGRATION RISK: medium — identity era change (`event_` prefix vs current
64-hex) affects stored IDs and any downstream ID parsing; sequence backfill
semantics must be communicated (not proven order). Grill G-6.

SECURITY EFFECT: positive — closes forgeable-flag bypasses (c), fail-closed
collision handling (d), deterministic failure vocabulary.

OBSERVABILITY EFFECT: positive — typed codes + collision stats replace string
errors.

MEMORY EFFECT: positive — witness column is durable provenance.

MCP EFFECT: none.

NOTE: orca-autonomy commit 479d310d6 ("canonical event identity in
UnifiedEventRuntime.emit()") is already ABSORBED into current (identity material
with logical_id idempotency, lines 75-82) — do NOT re-harvest.

---

## E-04 — Durable objective/work-order/attempt identity + crash-safe coordinator rendezvous

SOURCE: /home/nolan/worktrees/orca-autonomy, branch `feature/orca-autonomy`,
commit 6a342dd276e12710175ef0a7c04a943cb3c6aa4 ("feat(orca): durable objective
identity, crash-safe dispatch rendezvous, startup reconciliation").
New file orca/control-loop/objective-runtime.js (508 lines); also touches
hermes_dispatch.py, orca_control_loop.js, external_agent_adapter.js (orca-side,
not harvested).

VERSION: branch-experimental, 2026-09-18.

PRIMITIVE (extractable, PING-side module, "no new event store, no new mission
authority, no canonical events emitted here" — its own header):
- `deriveObjectiveId({namespace, objectiveText, constraints})` — logical intent
  ONLY (never PID, wall clock, run ID, attempt number, worker identity).
- `deriveWorkOrderId(objectiveId, taskKey)`, `deriveAttemptId(workOrderId,
  attemptNumber)` — stable hierarchical identities.
- `stableStringify` — canonical JSON, fail-closed on non-finite numbers.
- `atomicWrite` — temp file + rename for all durable writes.
- `acquireCoordinatorLock(pgClient, dataRoot, objectiveId)` — PostgreSQL
  session-level advisory lock with content-derived key
  (`orca-coordinator-v1:` + objectiveId), REQUIRED dedicated pg.Client (the
  module documents exactly why gateway/advisory_lock.js's pool-based pattern is
  unsound: session locks die with the connection that took them).
- `rendezvousResultPath`/`readRendezvousResult` — at-least-once transport +
  idempotent logical work; exactly-once explicitly NOT claimed.
- `reserveWorkOrderBudget`/`budgetUsage` (bounded spend), `recordCancellation`
  (durable), `reconcileStartup` before dispatch.

CURRENT CRX EQUIVALENT: none for durable execution identity —
runtime/kernel/mission/ has only mission-authority-interface.ts +
mission-hierarchy.ts; no content-derived run identity (OBSERVED FACT via ls +
grep for deriveObjectiveId/work_order_id in ping-runtime: zero hits).

DELTA: entire primitive absent. Pre-fix state was witnessed-broken: A6 restart
proof (commit 00b1194fe, evidence dir a6-restart-proof-2026-09-18T14-55-00-000Z)
VERDICT: FAIL — SIGKILLED run orca-run-mu725l0c restarted as orca-run-mu72ads8
with no durable reconstruction and duplicate delegation (OBSERVED FACT).

ADOPT-ADAPT-REJECT: ADAPT the identity-derivation + dedicated-client advisory
lock + rendezvous-result patterns into the mission/execution lane; REJECT
importing orca/control-loop as a system (shadow architecture).

WHY: Problem real and EVIDENCED (the A6 FAIL). Stable execution identity across
restarts is required for any crash-safe dispatch in the vertical trace
(AUTHORIZATION -> MCP -> RESULT). Extractable without the orca loop — the module
is self-contained (crypto/fs/path only). Deterministic: sha256 of canonical
intent; cross-process determinism claimed tested.

DEPENDENCY COST: needs a pg client at the call site (dedicated, not pool).

MIGRATION RISK: medium — new durable-state directory convention
(PING_DATA_ROOT/objectives); coordinator election changes operational behavior.

SECURITY EFFECT: positive — fixes the documented pool-advisory-lock trap if
adopted as the pattern (see G-1); budget bounds limit runaway spend.

OBSERVABILITY EFFECT: positive — diagnostic coordinator-claim.json (explicitly
NOT the authority).

MEMORY EFFECT: positive — durable run records are memory that survives crashes.

MCP EFFECT: indirect — rendezvous pattern suits MCP tool-result durability.

CAVEAT: post-fix has assert-driver evidence (commit claims 17+7+15 assert
drivers, fail-closed lock/cancel/terminal paths) but NO post-fix live
crash-restart proof located; T1/T9 honestly reported untested (UNRESOLVED G-5).

---

## E-05 — Derived-consumer-only replay context pack builder

SOURCE: /home/nolan/worktrees/constitutional-convergence-authority-law, commit
0d3cddd4a ("feat(contextpack): Phase 20 safe harvest, replay-context pack
builder (derived consumer only)"). New files
ping-runtime/context/replay_context_pack_builder.js (259 lines) +
phase20_replay_context_pack.js test (286 lines).

VERSION: branch-experimental, 2026-09-19.

PRIMITIVE: provenance envelope with constitutional separation BY CONSTRUCTION:
reads ONLY through `runtime.replay()` (certified ORDER BY sequence ASC over
committed ping_events rows); builds deterministic content-bound pack
(`pack_id`, per-event content hashes, window cursors, source metadata, version
labels); marks every pack DERIVED with explicit completeness state
(COMPLETE/INCOMPLETE per W-2 truncation semantics); never fabricates version
labels (absent = null); single dependency (`crypto`); "may never become an
authority" — header-level boundary.

CURRENT CRX EQUIVALENT: none — current unified_event_runtime.js has NO
`replay()` method and NO sequence column (OBSERVED FACT via grep); current
ping-runtime/context/ has only context_compiler.js.

DELTA: whole primitive absent; its required foundation (E-03b) absent.

ADOPT-ADAPT-REJECT: ADAPT after the replay()/sequence foundation lands. The
harvestable pattern is the boundary discipline (derived-consumer-only,
single-dependency, explicit completeness states) as much as the code.

WHY: Context assembly for replay is currently ad hoc; a fail-closed,
deterministic, explicitly-derived pack is exactly the "harvest, don't invent"
shape. Deterministic: recursive key-sorted JSON, content-bound pack_id.

DEPENDENCY COST: requires E-03(b) (sequence + replay()).

MIGRATION RISK: low once foundation exists (read-only consumer, no writes).

SECURITY EFFECT: positive — read-only by construction, no new authority.

OBSERVABILITY EFFECT: positive — COMPLETE/INCOMPLETE is typed truncation
honesty.

MEMORY EFFECT: positive — replay-derived context packs are recall inputs.

MCP EFFECT: none.

---

## E-06 — Tenant-scoped, bounded, evidence-verified context compilation

SOURCE: /home/nolan/worktrees/ping-codex-convergence, branch
`codex/context-workorder-convergence`, HEAD 08c3036d9767bb750bb8f2ce21f0978960baa935,
commit f20f6b9c4 ("feat(context): verify tenant-scoped canonical evidence").
Files: ping-runtime/context/context_compiler.js (+102), context_integration.js,
context_compiler.test.js (+73), context_compiler.adversarial.test.js (+45),
context_authority_filtering.test.js, context_workorder_binding.test.js,
unified_event_runtime.js (+11).

VERSION: branch-experimental, 2026-09-17.

PRIMITIVE: `ContextCompiler.compile` hardening — namespace REQUIRED and
validated against `NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_.-]+$/`
(fail-closed throw); `MAX_CONTEXT_EVENTS = 100` bound (fail-closed throw);
requires EvidenceAuthority with `accumulate()`; `_validateLineage(events)`;
`_verifyEvidenceBacking(events, namespace, correlationId)` per event;
tenant-scoped correlation-group retrieval.

CURRENT CRX EQUIVALENT: ping-runtime/context/context_compiler.js
`compile({missionId, query, correlationId})` — no namespace parameter, no event
bound, no evidence verification, no lineage validation (OBSERVED FACT via
grep: zero hits for MAX_CONTEXT/NAMESPACE_RE/_verifyEvidenceBacking/
evidenceAuthority).

DELTA: bounded-payload handling, namespace gating, and evidence-backing
verification all absent in current.

ADOPT-ADAPT-REJECT: ADOPT the bound + namespace gating (surgical, fail-closed);
ADAPT the evidence-verification half (needs EvidenceAuthority.accumulate wired
in the boot path — verify wiring exists before adopting, grill G-7).

WHY: Problem real — unbounded context assembly is a cost/correctness risk and
cross-tenant leakage is a security boundary; the vertical trace's
REQUEST->MEMORY->DECISION step currently assembles context with no provenance
check. Tested: +73 unit, +45 adversarial test lines. Deterministic: bound and
namespace checks are pure.

DEPENDENCY COST: bound/namespace — zero; evidence half — EvidenceAuthority
wiring.

MIGRATION RISK: low for bound/namespace (fail-closed throws surface misconfig,
not silent changes); medium for evidence half (new required dependency).

SECURITY EFFECT: positive — tenant namespace isolation at the context layer.

OBSERVABILITY EFFECT: positive — fail-closed errors name the violated bound.

MEMORY EFFECT: positive — evidence-backed context packs improve recall
quality.

MCP EFFECT: none.

---

## E-07 — llhttp runtime-identity era fix (stable execution identity)

SOURCE: /home/nolan/worktrees/constitutional-convergence, branch
`constitutional-convergence-v2`, HEAD 5aa33dcca934d6dddba585c7545677a7f23d6607,
commit a9cad2663 ("fix(runtime-identity): resolve http_parser fingerprint on
Node >= 20 via llhttp era rule (FL-20260920-009/004)").
Files: runtime/kernel/authorities/runtime_identity_authority.js (+9/-1),
test_runtime_identity_fl004_2026-09-20.js (189 lines, new).

VERSION: branch-experimental, 2026-09-20.

PRIMITIVE: `http_parser: process.versions.http_parser ?? process.versions.llhttp`
— Node >= 20 removed process.versions.http_parser; llhttp is the bundled parser
since. Both build-determined, never machine-specific, never a silent UNKNOWN
fallback; Node <= 18 fingerprints byte-identical to before.

CURRENT CRX EQUIVALENT: runtime/kernel/authorities/runtime_identity_authority.js
exists in current but WITHOUT the fix (OBSERVED FACT via diff: current line 131
`http_parser: process.versions.http_parser` only; test file ABSENT in current).

DELTA: 9-line fix + 189-line test.

ADOPT-ADAPT-REJECT: ADOPT.

WHY: Stable execution identity is a named harvest target; on Node >= 20 the
fingerprint field is undefined (identity instability across runtimes).
Surgical, tested, zero dependencies, preserves old fingerprints exactly.
Deterministic where it matters (build-determined version, not machine).

DEPENDENCY COST: zero. MIGRATION RISK: negligible.

SECURITY EFFECT: neutral-positive (identity stability). OBSERVABILITY EFFECT:
neutral. MEMORY EFFECT: neutral. MCP EFFECT: none.

---

## E-08 — EventRepository write-anchoring gate (verification tooling)

SOURCE: /home/nolan/worktrees/constitutional-convergence, commits 10d152442
("docs(lane-d): dead-caller classification for 14 unanchored EventRepository
write sites") and the test file runtime/kernel/test_event_repository_gate_2026-09-19.js
("fail-before" acceptance gate).

VERSION: DOCUMENTED_ONLY (164-line classification doc) + branch-experimental
test.

PRIMITIVE: fail-before tests (DEM-REPO-1/3/4 fail pre-gate, pass post-gate;
DEM-REPO-2/5 mechanism-preservation pins) proving EventRepository's independent
write path must reference an already-accepted canonical event (proof of prior
UER acceptance) or fail closed with a typed error; historical rows preserved,
no deletion/migration/ID rewrites. Plus a 14-site dead-caller classification.

CURRENT CRX EQUIVALENT: none located (no such gate test in current).

ADOPT-ADAPT-REJECT: ADAPT as verification tooling for the convergence sprint
(run the gate against the current branch to find unanchored writers); not
runtime code.

WHY: Directly serves the standing rule that EventRepository is a derived
audit/projection adapter (orca ae55b77ff established this direction). Evidence,
not architecture.

DEPENDENCY/MIGRATION: zero (test-only). SECURITY/OBSERVABILITY: positive
(audit). MEMORY/MCP: none.

---

## REJECTED / NOT-HARVESTED (with reason)

- **Dead-letter queue**: gateway/dead_letter_authority.js (294+ lines,
  repository_dead_letters) is ALREADY canonical in current. agent-smoke's
  uncommitted delta is minor (correlation_id grouping in DLQ stats).
  prod/dlq_authority.cjs is a Phase-8 test-sprint artifact ("test_run:
  'sprint-2026-09-16'") — ARCHAEOLOGICAL. No harvest.
- **Checkpoint authority** (gateway/checkpoint_authority.js,
  lifecycle_checkpoint.sql, checkpoint_repository.js, test_trace_propagation.js):
  ALREADY canonical in current. constitutional-compiler/packages/postgres/
  checkpoint_store.ts and constitutional-integration-lab/extracted/ are dead
  subsystems — ARCHAEOLOGICAL, shadow architecture, REJECT.
- **Logical-id idempotency in emit** (orca 479d310d6): already ABSORBED into
  current identity material — do not re-harvest.
- **VerifyReplay worktree**: marker only (worktree.json: "replay-required") —
  no primitive.
- **agent-exec / oracle-assembly / playbook / python-prod** stale worktrees:
  agent-exec clean (no unique content); oracle-assembly = compose/env infra +
  multiruntime-proof/ (experimental oracle proofs, ARCHAEOLOGICAL); playbook/ =
  test-harness spec + scripts (DOCUMENTED_ONLY/EXPERIMENTAL); python-prod/prod/
  = phase-7/8 test artifacts (ARCHAEOLOGICAL). No harvestable primitives.
- **ping-oracle-deploy**: UI fabrication-removal commits are truth-layer
  hygiene (DOCUMENTED_ONLY value), no primitives.
- **MCP interceptor layer**: MISSING everywhere (only mcp/ping_mcp_server.py
  in all trees) — no candidate exists to harvest.
- **Redaction module / structured-logging module**: MISSING everywhere — no
  candidate (only console.* and one redact-mentioning test file in current).

---

## TOP-5 INTERNAL HARVEST CANDIDATES (ranked)

1. **E-01 duplicate-suppression early return + integration trace enrichment**
   (ping-event-runtime). Fixes a live double-dispatch bug on the boot path;
   same-file, tested, zero dependencies. Highest value/effort.
2. **E-03a/e collision witness + canonical minting** (authority-law, phased).
   The 16-hex truncation without a witness is the scariest latent bug found;
   canonical minting fixes a live determinism gap (JSON.stringify order).
   Phase it: minting, then witness, then sequence.
3. **E-07 llhttp runtime-identity fix** (constitutional-convergence). 9 lines,
   tested, zero risk. Just take it.
4. **E-06 bound + namespace gating for ContextCompiler** (codex-convergence).
   Bounded payloads and tenant gating are missing guardrails on the
   REQUEST->MEMORY->DECISION step; fail-closed and tested.
5. **E-04 durable objective identity + dedicated-client advisory lock**
   (orca-autonomy, patterns only). Crash-safe execution identity is the
   missing primitive for the AUTHORIZATION->MCP->RESULT leg; adopt the
   identity functions and the lock discipline, not the orca loop.

(E-02 lineage propagation and E-05 pack builder are strong #6/#7 — E-02 pending
a re-run of its drive on the convergence branch; E-05 pending E-03b's
sequence/replay() foundation.)

---

## UNRESOLVED QUESTIONS (grill candidates)

- G-1: `gateway/advisory_lock.js` takes a POOL for session-level pg advisory
  locks — the orca module documents this exact unsoundness (acquire and release
  can land on different pooled connections) and zero callers were found in the
  current tree. Dead trap or used off-tree? Remove, or fix to dedicated-client?
- G-2: current `emit()` mints event_id via `JSON.stringify(identity)` —
  insertion-order dependent. Is any caller or stored data relying on current
  key order? (Blocks E-03e adoption shape.)
- G-3: does any downstream system depend on duplicate events re-dispatching
  handlers/integrations? (Blocks E-01 adoption.)
- G-4: E-02's "Drive 7/7 pass" is commit-message-claimed; no standalone test
  file was located. Re-run the lineage drive on the convergence branch before
  adopting?
- G-5: E-04's fix has assert-driver evidence but no post-fix live
  crash-restart proof (only the pre-fix A6 FAIL). Is assert-level evidence
  sufficient to adopt the identity functions?
- G-6: E-03's identity era change (64-hex -> `event_<16hex>`) and the sequence
  backfill (classified LEGACY BACKFILL ORDER, not proven order) — who owns the
  migration, and is the era change acceptable for stored-ID consumers?
- G-7: E-06's evidence half requires EvidenceAuthority.accumulate wired into
  the ContextCompiler boot path — is that wiring present anywhere currently?
- G-8: `ping-runtime/context/context_compiler.js.backup` exists in current —
  stale backup or load-bearing? (Hygiene; not a grill-stopper.)
