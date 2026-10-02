# PING 12-Hour Harvest Sprint: Final Report
## Section-90 Style | 2026-09-18 08:00 MDT (14:00 UTC)

**Sprint:** Autonomous PING harvest, convergence, UI, knowledge-plane, social-media, and strategic-expansion
**Duration:** ~2026-09-17 20:03 MDT to ~2026-09-18 08:00 MDT (12 hours)
**Branch:** `sprint/harvest-12h` (worktree: `/home/nolan/worktrees/ping-harvest-12h`)
**Base:** `88c9651be` | **Final HEAD:** `8fe3b8060`
**Core question:** "WHAT STRONG WORK DOES PING ALREADY HAVE THAT IS NOT YET COMPOUNDING?"
**Status:** Complete. No pushes (per sprint directive). All work local.

---

## 1. Authority

**One authority per semantic decision** was enforced throughout. No new authorities were created. The sprint harvested existing behavior and closed loops within existing authority boundaries:

- **ContextCompiler** remains the sole mission-context authority. H69 gave it its first real consumer (the KnowledgeGraph); H78 made the scheduler respect its consumption contract.
- **KnowledgeGraph** (Postgres-backed) remains the sole knowledge-store authority. H68-H69 closed its write→read loop.
- **SystemAuthority** remains the sole system-state authority. H70 fixed the /system/state route to use the wired instance instead of constructing a competing one.
- **Social draft projection** remains draft-only by construction at three levels (projector, DDL CHECK, publish-adapter stub). H66-H67 activated the trigger without touching the safety boundary.
- **No pushes, no main-branch commits, no production mutations, no credential use.** All changes are local to `sprint/harvest-12h`.

---

## 2. Harvested Behavior and Provenance

### 2.1 Context-pack lineage pipeline (H65 → H74 → H76)

**What was harvested:** The ContextCompiler was producing rich context packs (with retrieval manifests, evidence refs, and correlation IDs) that died at the mission boundary. No downstream component read them.

**What was built:**
- **H65** (`04204c528`): ObservationWorker now fail-soft extracts `context_pack_id` and `evidence_refs` from `event.context_pack` and propagates them to the observation and `OBSERVATION_CREATED` payload. First downstream reader of compiled packs.
- **H69** (`e4df146ca`): ContextCompiler now queries the KnowledgeGraph for approved nodes plus high-confidence candidates (≥0.8) and injects them as `pack.knowledge_refs`. Byte-identical pack when graph is absent/fails.
- **H74** (`404e789aa`): ObservationWorker now also propagates `pack.knowledge_refs` as `context_knowledge_refs`. Closed the pack-boundary death.
- **H76** (`014891f88`): ClaimWorker now fail-soft propagates all three lineage fields (`context_pack_id`, `context_evidence_refs`, `context_knowledge_refs`) from observation to claim and `CLAIM_CREATED` payload. Closed the first-hop drop.

**Provenance:** Lineage now survives event → observation → claim. Every hop is fail-soft: absent/malformed packs leave output key-for-key identical to baseline. The `retrieval_manifest` (up to 100 full events) is never attached, preserving the bounded-context design.

**What was NOT built:** Pack reuse (H77 investigated and rejected). The pack ID binds `mission_id`, `query`, and `retrieval_hash`; reuse would falsify provenance. Recompilation is correct.

### 2.2 KnowledgeGraph write→read loop (H68 → H69)

**What was harvested:** The KnowledgeGraph had a live write loop (19 event types → candidate nodes in Postgres) but nothing read the graph back to change system behavior. ContextCompiler held the graph as a dependency and never queried it.

**What was built:** H69 made ContextCompiler query the graph for approved knowledge (with high-confidence candidate fallback, since the approval tier is theoretical). This closes: business events → candidate nodes → KnowledgeGraph → mission context packs.

**Provenance:** The graph projection writes nodes only (never edges); the edge table stays empty on live data. The read is namespace-scoped and fail-soft.

### 2.3 SystemAuthority wiring truth (H68 → H70)

**What was harvested:** H68 found that `GET /system/state` constructed its own `SystemAuthority` with no `knowledgeGraph`, reporting `knowledge_objects: null` despite the H34 fix.

**What was built:** H70 (`72804fcf2`) changed the route factory to receive the H34-wired instance from the services bag. The handler now returns the real count.

### 2.4 Scheduler efficiency (H77 → H78)

**What was harvested:** H77 proved the scheduler compiled a full context pack for EVERY mission, but only ObservationWorker reads `event.context_pack`.

**What was built:** H78 (`67f312761`) skips compilation when the resolved worker is not `observation`. Caller-supplied packs are preserved. The fail-soft contract is unchanged. The `MISSION_WORKER_MAP` contract comment was updated to reflect the third consumption.

---

## 3. Tests

### 3.1 New tests added (15 total, all passing)

- **H67** (`test/test_social_draft_trigger.js`): 8 tests pinning the draft-only contract. **8/8 pass.**
  - Allowlisted types yield drafts; every row `status='DRAFT'`; projector never emits canonical events; non-allowlisted types yield zero rows; re-run idempotent; fail-closed on Postgres failure; defensive row mapping; structural pins (no `executeEvent`, no gateway wiring).
- **H80** (`ping-runtime/context/context_compiler.test.js`): 7 tests for H69 behavior. **7/7 pass** (suite: 22/22).
  - Approved injection with ref shape validation; high-confidence candidates (0.9, boundary 0.8); low-confidence exclusion (0.79, 0.3); null/missing confidence exclusion; empty graph → byte-identical; throwing graph → fail-soft; 30 nodes → sorted, capped at 25.

### 3.2 Regression sweep (H79)

**Zero new failures** vs the H61 baseline:
- Syntax: 7/7 `node --check` pass
- `context_compiler.test.js`: 22/22 pass (15 pre-existing + 7 new)
- Social draft projection: 23/23 pass (H61 baseline reproduced)
- Social draft review: 13/13 pass (H61 baseline reproduced)
- Adversarial suites: 0 failures
- Throwaway smokes (deleted): H78 skip 5/5, worker lineage 10/10, H69 injection 6/6

**Pre-existing failures (unchanged):**
- `gateway/tests/ingest.test.js`: `CanonicalBytes.serialize()` Buffer issue (M3 migration, not H65-H80)
- `gateway/tests/adapter.test.js`: requires live inference service
- Missing `express`/`pg` on Pig (environmental, matches H61)

### 3.3 Drives (not committed, verified on Pig)

- H65: 5/5 (well-formed, null, missing, malformed, throwing getter)
- H69: 4/4 (approved, candidates-only, throwing, null graph)
- H70: Handler returns wired count (42), not null
- H74: 6/6 (propagation, baseline-identical, malformed, throwing)
- H76: 7/7 (full lineage, obs-only, top-only, no-lineage, malformed, primitive, throwing)
- H78: 5/5 (observation compiles, claim skips, caller pack preserved, end-to-end both types)

---

## 4. Multi-Runtime Execution

**Single runtime.** All work was executed on the Pig (WSL) via `~/workspace/pig/pigwsl-run.sh`. No multi-runtime orchestration was required; the changes are runtime-agnostic JavaScript.

**Transfer lessons captured in AGENTS.md:**
- H67: `while read` drops final newline-less lines; guard with `|| [ -n "$chunk" ]` and always sha256-verify.
- H69: `pigwsl-run.sh` strips single quotes in heredocs (use chunked base64); ssh eats piped stdin in loops (redirect `< /dev/null`).

---

## 5. Knowledge Compounding

### 5.1 Loops closed

1. **Context-pack lineage** (H65/H74/H76): Packs now flow event → observation → claim with full provenance. The lineage is **write-only** (H75): zero downstream code reads the fields to make decisions. The "act" side is pending.
2. **KnowledgeGraph** (H68/H69): Write loop (events → nodes) now has a read loop (graph → mission packs). The approval tier is theoretical; the ≥0.8 candidate fallback makes it real.
3. **System state** (H70): `/system/state` now reports the true knowledge count.

### 5.2 What compounds now

- Every business event that flows through the spine becomes a candidate knowledge node (19 types, live).
- Every mission dispatch for observation workers includes approved + high-confidence knowledge in the context pack.
- Every observation and claim carries the lineage of which pack, evidence, and knowledge produced it.
- The scheduler no longer wastes compilation on workers that can't consume packs.

### 5.3 What does NOT yet compound

- **Lineage is not acted upon.** No code reads `context_pack_id`, `context_evidence_refs`, or `context_knowledge_refs` to make a decision. It's provenance for audit/replay, not input to behavior.
- **Approval is theoretical.** `KnowledgePromoter` is wired but fires only on human-approval events with no traced producer. Nodes may stay `candidate` forever.
- **Edges are never projected.** The live graph accumulates nodes with an empty edge table; `getNeighborhood()` returns edgeless neighborhoods.

---

## 6. Social-Media Work

**Focus area per Nolan's directive.** All social work remained **draft-only and hard-disabled for publishing** throughout.

### 6.1 The seam (H66)

**Discovery:** The social-draft projection was implemented, tested, and registered in the kernel adapter, but had no trigger. The dormancy was **accident-by-omission**, not deliberate safety.

**Critical finding:** `test_patch_001` does NOT bless the dormancy; it **condemns the missing wiring** (currently fails because `gateway_runtime.js` never calls `executeEvent`). The test pins the original intent.

**Safety architecture (deliberate, three levels):**
1. Projector produces drafts only (deterministic templates, no LLM/clock/randomness)
2. `social_drafts.sql` enforces `CHECK (status = 'DRAFT')`
3. `SocialPublishAdapter.execute()` hard-returns `{published:false, reason:'draft-only'}`; no platform connector exists

**Architectural constraint:** `kernelAdapter.executeEvent()` persists a new canonical event (not just "run projections"). Calling it merely to trigger drafts would inject source truth. The activation must drive the projector directly.

### 6.2 The trigger (H67)

**Built:** `scripts/project-social-drafts.js` (276 lines). Operator-invoked, not HTTP-triggered, not scheduled.

**Flow:**
1. Connects via `PostgresApprovalStore.fromEnv()` (pool only, never `initializeSchema()`)
2. Reads already-drafted event IDs (idempotency)
3. Selects allowlisted events (`CLAIM_CREATED`, `REPLAY_COMPLETED`, `PROJECTION_CREATED`) with bounded limit
4. For each: dedicated transaction client, `BEGIN`, `socialDraftProjector(event, null, {client})`, `COMMIT`; `ROLLBACK` + exit 1 on failure
5. Prints JSON report. Fail-closed on Postgres failure.

**What it produces:** Per allowlisted event, 5 deterministic draft rows (x/announcement, x/insight, facebook/announcement, facebook/story, facebook/cta). All `DRAFT`. Idempotent via `ON CONFLICT DO NOTHING`.

**Tests:** 8/8 pass. Pins: only allowlisted types yield rows; every row `DRAFT`; never emits canonical events; non-allowlisted yield zero; re-run idempotent.

**What was NOT done:** The trigger has **never run against live Postgres**. The `social_drafts` table may not exist on any live DB. The DDL must be applied first. Automatic/scheduled triggering is an unmade product decision.

### 6.3 Publishing status

**HARD-DISABLED.** Throughout the entire sprint:
- No platform connector was built
- No credentials were touched
- No publish path was modified
- `SocialPublishAdapter` remains a stub returning `{published:false}`
- The review surface and CLI remain read-only
- Every draft row is constrained to `DRAFT` by DDL

---

## 7. UI Convergence

### 7.1 Phantom widgets unmounted (12 total)

The command center now renders only **KnowledgeGalaxy**, **TimeMachine**, and **CockpitDashboard** (separate tab). All have real backends.

**H73 unmounted the 12th and final phantom: MissionCards.**
- Called `/api/v1/missions/cards` which exists on **neither tier** (wrong prefix: gateway mounts at `/missions`; no `/cards` endpoint even with correct prefix)
- Permanent red error state, no retry, no recovery
- Removed import + full-width row (7 deletions); component preserved on disk as design reference (H57 pattern)

**Previous 11 (H49-H62):** ConstitutionalMixer, NightShift, SemanticMemory, ReasoningPuppetStrings, OrganizationalHealth, OllamaControlRoom, MCPOrchestration, LivingRepository, ConstitutionalObjects, ConstitutionalLifecycle, DecisionEngine.

### 7.2 Repairs (not removals)

- **H58:** TimeMachine throughput divide-by-zero fixed (shows absolute delta on zero baseline, not `+Infinity%`)
- **H59:** TimeMachine scrubber divide-by-zero on single snapshot fixed (pins at 0%)
- **H60:** Dead Ollama status polling removed from header
- **H62:** Stale row comments renumbered

### 7.3 Verification (H79)

Zero references to any of the 12 phantoms in the command-center page. Every grid row sums to 12. JSX balanced.

---

## 8. Oracle Readiness

**NOT READY.** No change during this sprint. No Oracle deployment or mutation was authorized or attempted.

**Open blockers (unchanged):**
- Hardcoded main-compose Postgres password
- Schema not mounted or applied
- Linux-incompatible Ollama defaults and GPU assumptions
- Stale bootstrap branch default
- Qdrant pinning
- Health checks
- ARM64 CI
- systemd
- `.env.example`

---

## 9. Commits

**16 commits, one per wave H65-H80.** All local, no pushes.

| Hash | Wave | Type | Summary |
|------|------|------|---------|
| `04204c528` | H65 | feat | ObservationWorker propagates event.context_pack lineage |
| `2801c0839` | H66 | docs | Social draft seam investigation |
| `f52c1dd23` | H67 | feat | Draft-only projection trigger script with contract tests |
| `1e51cac57` | H68 | docs | KnowledgeGraph producer/consumer audit |
| `e4df146ca` | H69 | feat | ContextCompiler injects KnowledgeGraph refs into mission packs |
| `72804fcf2` | H70 | fix | /system/state uses the wired SystemAuthority |
| `5ff7ee941` | H71 | docs | Timeline data pipeline audit |
| `e1129283e` | H72 | docs | MissionCards investigation (12th phantom) |
| `c889c025c` | H73 | fix | Unmount phantom MissionCards from command-center |
| `404e789aa` | H74 | feat | ObservationWorker propagates event.knowledge_refs lineage |
| `46355213a` | H75 | docs | Observation consumer audit (write-only provenance) |
| `014891f88` | H76 | feat | ClaimWorker propagates observation lineage to claims |
| `44ba910aa` | H77 | docs | MissionScheduler pack reuse investigation (rejected) |
| `67f312761` | H78 | perf | Skip context-pack compilation for non-consuming workers |
| `a44eca5e4` | H79 | docs | Broad regression sweep, zero new failures |
| `8fe3b8060` | H80 | test | Add knowledge_refs coverage to compiler suite |

**Diff stats (H65-H80):** 10 files changed, +1397 / -22.

**Files:**
- `ping-runtime/workers/canonical_workers.js` (H65, H74, H76)
- `ping-runtime/context/context_compiler.js` (H69)
- `ping-runtime/context/context_compiler.test.js` (H80)
- `ping-runtime/orchestration/mission_scheduler.js` (H78)
- `gateway/routes/system.js` (H70)
- `gateway/bootstrap/gateway_runtime.js` (H70)
- `scripts/project-social-drafts.js` (H67, new)
- `test/test_social_draft_trigger.js` (H67, new)
- `CascadeProjects/infra/ui-next/src/app/command-center/page.tsx` (H73)
- `SPRINT-HARVEST-12H.md` (all waves)

---

## 10. Verified Items

1. **Context packs have a downstream reader.** ObservationWorker reads `event.context_pack` (H65). Previously zero readers.
2. **Knowledge refs flow end-to-end.** Pack → observation → claim, all three lineage fields, fail-soft at every hop (H69/H74/H76).
3. **KnowledgeGraph is read by the compiler.** The dead dependency is now live (H69).
4. **System state reports true counts.** The unwired instance bug is fixed (H70).
5. **Social trigger is safe.** Draft-only at three levels; 8/8 contract tests; never touches `executeEvent` or publish (H67).
6. **Scheduler doesn't waste work.** Packs compiled only for observation missions (H78).
7. **UI is honest.** 12 phantoms removed; remaining widgets have real backends (H73/H79).
8. **Timeline pipeline is complete.** Live writers → operational tables → route → widget; no broken link (H71).
9. **Zero regressions.** H79 sweep: all suites pass, no new failures vs H61.

---

## 11. Partial Items

1. **Lineage propagation without consumption.** The lineage fields are now carried through observation → claim, but no code reads them to make decisions. It's provenance, not input. (H75/H76)
2. **KnowledgeGraph read loop.** The compiler queries the graph, but the approval tier is theoretical and the 0.8 threshold is uncalibrated. The loop is real but the "approved" tier may never populate. (H68/H69)
3. **Social trigger.** Built and tested, but never run against live Postgres. The table may not exist. (H67)
4. **Test coverage.** The new tests use stubs; no live-Postgres verification for any H65-H80 change. (H79/H80)

---

## 12. Blocked Items

1. **Approval authority.** No authorized emitter for approval decisions. No approver identity, rejection/expiry/batch semantics defined. **Product decisions required.** Do not invent. (H28/H37, reaffirmed H63)
2. **Social automatic triggering.** The trigger is operator-invoked by design. Scheduling it (cron, event-driven) is an **unmade product decision**. (H67)
3. **Authority drift instrumentation.** `authority_drift` is honestly disclosed as `uninstrumented`. Semantics undefined. **Nolan must define it first.** (H71)
4. **Witness signing.** The signer seam exists, default-off, fail-closed. **Do not enable in production during sprint** per Nolan's directive. Remaining: dual-emission soak, legacy field retirement, downstream verification, secret management. (H63)
5. **Pack ID staleness.** `context_pack_id` does not cover `knowledge_refs`. If packs are ever cached by ID, this is a staleness hazard. **Needs a follow-up decision.** (H69)

---

## 13. Falsified Claims

1. **"The test blesses the dormancy."** FALSE. `test_patch_001` **condemns** the missing social wiring; it currently fails. The dormancy is accident-by-omission, not design. (H66)
2. **"ContextCompiler has no consumer."** FALSE (as of H65). ObservationWorker is the first downstream reader. (Supersedes H63)
3. **"The KnowledgeGraph has no reader."** FALSE (as of H69). ContextCompiler queries it. (Supersedes H68's "zero consumer" framing)
4. **"MissionCards is a real widget with a backend gap."** FALSE. It's the 12th phantom; the route exists on neither tier. (H72)
5. **"Pack reuse would be an optimization."** FALSE. It would falsify provenance (pack ID binds mission_id/query). Recompilation is correct. (H77)
6. **"CockpitDashboard consumes the SystemAuthority knowledge count."** FALSE. It has no knowledge-field reader. The count goes to `/ops/*` and (now) `/system/state`. (H63 correction, H70 fix)

---

## 14. Unknowns

1. Whether `social_drafts` DDL has been applied to any live Postgres. (H66/H67)
2. Whether the live `events` table schema matches the trigger's `ORDER BY id` assumption. (H67)
3. Live data volumes in `knowledge_nodes`, `ping_events`, `ping_missions` (no live DB queried). (H68/H71)
4. Whether human-approval events (`SNIPPET_APPROVED`, etc.) have any producer. If not, nodes stay `candidate` forever. (H68)
5. The correct 0.8 confidence threshold (uncalibrated, no live distribution observed). (H69)
6. Whether `/api/v1/missions/cards` was ever specified or was purely a UI-side mistake. (H72)
7. Compile cost savings from H78 (structural, not profiled). (H77/H78)
8. Whether any UI consumer reads `event.context_pack` out-of-band. (H77)

---

## 15. Standing Constraints Honored

- No em dashes in any Nolan-facing material.
- No pushes, no main-branch commits.
- No production mutations, no irreversible deletions.
- No credential use, no secret inspection.
- No speculative databases, queues, stores, or frameworks.
- Social publishing hard-disabled throughout.
- HPP untouched. `/home/nolan/projects/ping` untouched.
- Oracle runtime untouched.

---

## 16. What Compounds Now (Answer to the Core Question)

**PING's strong work that now compounds:**

1. **The context pack.** Previously compiled and discarded. Now: enriched with knowledge refs (H69), read by ObservationWorker (H65), propagated through claims (H76), and compiled only when consumed (H78). The pack is no longer a dead artifact; it's the lineage backbone.

2. **The KnowledgeGraph.** Previously a write-only store. Now: queried by the compiler to inject approved knowledge into mission context. Business events → candidate nodes → mission packs. The loop is closed.

3. **The social draft pipeline.** Previously a registered projection with no trigger. Now: an operator-invoked, tested, draft-only trigger that safely materializes drafts from committed events without touching canonical event emission or publishing.

4. **The UI.** Previously 12 phantom widgets implying capabilities that didn't exist. Now: three widgets with real backends, zero phantoms, honest error states.

**What still doesn't compound:** The lineage is provenance, not input (nothing acts on it). The approval tier is theoretical. Social drafts are created but never reviewed/published (by design, pending Nolan's decisions).

---

**End of report.** All work is local on `sprint/harvest-12h` at `8fe3b8060`. No pushes. Awaiting Nolan's review.
