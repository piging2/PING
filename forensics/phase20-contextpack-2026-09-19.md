# Phase 20 ContextPack Harvest (2026-09-19)

Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`
Pre-unit HEAD: `a2c2626ce` (verified before any mutation; matched expectation)
Post-unit HEAD: `0d3cddd4a` ("feat(contextpack): Phase 20 safe harvest, replay-context pack builder (derived consumer only)")
Worktree: clean after commit. Explicit staging of exactly 2 files
(1 new product module, 1 new test harness). No add -A, no reset, no clean,
no history rewrite, no deletions. No em dashes in new content.

Governing law: REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING.
PROVE BEFORE PROMOTION.
Standing: ContextPack may NEVER become an event authority, a witness
authority, or a mission authority. It is a derived consumer only.
Rule followed: FORENSICS -> DECISION -> MINIMAL PATCH -> TARGETED TEST ->
REGRESSION -> EVIDENCE.

## 1. Survey: ContextPack implementations in the converged tree

Re-verified live on the converged tree (HEAD a2c2626ce), not taken from
reports. Method: `git ls-tree -r HEAD`, `git branch -a`, source grep,
reachability checks.

`git ls-tree -r HEAD --name-only | grep -c "^ping-runtime/context/"` = **0**.
The convergence line still carries no ContextPack implementation.

| Impl | Canonical location | In converged tree? | Proof-ladder classification | Change vs prior finding |
|---|---|---|---|---|
| I1 `codex/context-workorder-convergence` @ 08c3036d9 | other branch only | ABSENT | ABSENT FROM CONVERGED TREE (never merged onto this line) | none |
| I2 `sprint/harvest-12h` @ 8fe3b8060 (strongest) | other branch only | ABSENT | DORMANT/STAGED: branch still exists (`git branch -a` lists `sprint/harvest-12h`); zero `ping-runtime/context/` files in this worktree; the merge that would make the stack reachable never happened | none |
| I3 `feature/context-compilation` @ 3ddb03404 | other branch only | ABSENT | ABSENT (superseded by harvest line) | none |
| I5 `runtime/cognitive/context_pack.py` (+ cache, root builder) | in tree | PRESENT | EXISTENCE: source file exists; legacy Python schema (question/authority_chain/lineage/citations/confidence); no live execution path in the certified event pipeline | none |
| I6 `ping-runtime/orchestration/generate_context_packets.js` + `ContextPackets.json` | in tree | PRESENT | EXISTENCE: script + static JSON; the only loader (`ConstitutionalQueryAPI.js:12`) reads a hardcoded Windows path (`c:\Users\nolan\PING\...`), dead on WSL | none |
| WorkOrder `context_pack_id` stubs | `ping-runtime/external-agent/external_agent_adapter.js`, `WORKORDER_SCHEMA.json`, `RESULT_SCHEMA.json`, `BOUNDARY.md` | PRESENT | EXISTENCE: the adapter accepts a caller-supplied `contextPackId` and echoes it in the result envelope; **no producer exists on this line** (no ContextCompiler), so the field can never be populated with a real pack here | none |

### Survey verdict (one line)

No change: the proposition "an EFFECTIVE ContextPack implementation exists"
remains **FALSIFIED**; the strongest implementation I2 remains
dormant/staged on `sprint/harvest-12h`, never merged onto the convergence
line; the converged tree still has zero `ping-runtime/context/` files.

## 2. What was harvested

One safe harvest, and only that harvest:

**`ping-runtime/context/replay_context_pack_builder.js`** (new, +218 lines):
a replay-context pack builder that is a pure derived consumer.

- (a) Reads ONLY through the read-only replay reader. Its only data access
  is `runtime.replay({afterSequence, limit})`, the certified ORDER BY
  sequence ASC delivery over committed `ping_events` rows
  (`UnifiedEventRuntime.replay`). There is no direct table scan, no SQL
  anywhere in the module, and the module cannot bypass the certified
  ordering because it never touches storage at all. Closure is proven by a
  second `replay()` probe at `lastSequence` (one row); if the probe finds
  rows, the window is marked not-closed.
- (b) Emits no events, triggers no missions, writes no authority records.
  Fail-closed by construction: the module's only `require` is the Node
  built-in `crypto`. No pg, no pool, no UnifiedEventRuntime import, no
  mission scheduler, no emit path. The runtime is injected by the caller
  and the module's only use of it is `runtime.replay()` (proven by Proxy
  test P2).
- (c) Binds the same version labels as W-2 for traceability:
  `replay_engine_version`, `witness_algorithm_version`,
  `witness_input_schema_version`. W-2 null-safe convention: absent versions
  are recorded as null, never fabricated (the builder source contains no
  version literals; proven by P6).
- (d) Marks every pack DERIVED with an explicit completeness state
  following W-2 truncation semantics: `COMPLETE` only when the closure
  probe found no further rows AND zero inputs were skipped; otherwise
  `INCOMPLETE` with explicit `incomplete_reasons` (`window_not_closed`,
  `inputs_skipped`). A malformed row is counted in `inputs_skipped` and
  never bound into the pack.
- Identity: `replay_context_pack_id = 'rcp_' + sha256(stable(window cursors,
  event set, completeness, versions))[0:16]`; per-event `content_hash =
  sha256` over the certified-order projection of each row (sequence is the
  ordering axis and is recorded separately, not hashed into content). Same
  replay window + same versions always yields the same pack_id (proven P3);
  one changed content byte changes the id (proven P4).

No safe harvest exists beyond this. Everything else in the ContextPack
space would require promoting unverified machinery or touching an
authority surface. See exclusions.

## 3. What was deliberately NOT built (with authority rationale)

1. **ContextCompiler / I2 import.** The effective implementation is
   FALSIFIED on this line; I2 lives on a dormant branch. Landing it would
   require the operator-scoped merge (compiler + integration + scheduler
   wiring), the missing version pins (`compiler_version`,
   `canonicalization_version`), the camelCase identity-key fix, principal
   binding, and the RAG-bypass gate. None are proven. Rationale: promoting
   it now would make ContextPack a de-facto mission-authority adjunct
   (scheduler wiring) before its inputs are authority-clean.
2. **WorkOrder binding of real pack ids.** Binding pack identity into
   `external_agent_adapter` WorkOrders would wire a derived consumer into
   mission execution. Rationale: mission authority boundary; the builder
   emits nothing and binds nothing into work orders.
3. **knowledge_refs / Qdrant retrieval.** The RAG bypass is still open
   (`gateway/knowledge_retrieval.js` answers with no pack, no namespace, no
   witness). Harvesting retrieval into packs would launder the bypass into
   derived truth. Rationale: knowledge authority is unresolved; excluded
   until the bypass is gated or quarantined.
4. **Pack persistence / cache / store.** A durable pack store would create
   a second truth alongside `ping_events`. Rationale: event authority
   singularity; derived projections must stay rebuildable from the
   authoritative journal, never canonical themselves.
5. **Witness binding.** Stamping pack ids into WITNESS_CREATED or deriving
   witness roots from packs would give ContextPack a witness-authority
   role. Rationale: witness is a DERIVED replay attestation owned by the
   W-1A/W-2 path; ContextPack may never be a witness authority.
6. **Scheduler wiring (`MissionScheduler._compileContextPack`).** Rationale:
   mission authority boundary; see exclusion 1.
7. **RAG-bypass fix.** Out of Phase 20 scope; carried as the first-class
   open item for the writer unit, unchanged.

## 4. Test evidence

Harness: `tests/event-authority-convergence/phase20_replay_context_pack.js`
(39 checks). P1-P7 use deterministic mocks; P8 runs a live
UnifiedEventRuntime on the scratch container.

| Check | Result |
|---|---|
| P1 module requires only `crypto`; no write tokens (INSERT/UPDATE/DELETE/SELECT on ping_events, Pool, emit, mission, schedule) in source | PASS |
| P2 Proxy runtime: only `replay()` touched (exactly 2 calls); bad runtime / bad afterSequence / bad limit / replay error / probe error / bad window all fail closed with status `error` | PASS |
| P3 determinism: same window twice => same pack_id, byte-identical pack, id matches `rcp_[0-9a-f]{16}` | PASS |
| P4 identity sensitivity: one changed content byte => different id; certified-order delivery dominates (sorted reads hash identically) | PASS |
| P5 INCOMPLETE marking: truncated window => INCOMPLETE + `window_not_closed`; one malformed row => INCOMPLETE + `inputs_skipped`, row not bound; clean closed window => COMPLETE, empty reasons | PASS |
| P6 version null-safety: absent versions => null (no fabrication; no version literal in builder source); provided versions bound | PASS |
| P7 DERIVED marking: `kind: DERIVED`, explicit no-authority decision, all three write flags false, certified-order claim true | PASS |
| P8 live integration (scratch PG, 7 seeded events): window covers all 7 in certified order, COMPLETE; limit=3 => INCOMPLETE; cursor window (afterSequence=seq3) yields 4 events | PASS |

**Phase 20 harness: 39/39 pass.**

## 5. Regression tally (Phase 20 tree, commit 0d3cddd4a content)

Scratch PostgreSQL `w1a-scratch-pg` on 127.0.0.1:15439; credentials resolved
at runtime from the container environment (never printed or persisted).
Harnesses that hardcode a foreign tree path ran as repointed temp copies in
`/home/nolan/p20bat/` (Pig home dir; `/tmp` on the Pig proved ephemeral
between calls); the product tree was never mutated. EVAL-010 ran via its
exported `run()`. The sequence cert needed `PGADMIN_PASSWORD` (its own env
name, not PGPASSWORD) and `PGPORT=15439` (the w1a scratch container; the
`p0-cert-postgres` container on 5434 is absent, hence the T5 block).

| Suite | Result |
|---|---|
| Phase 20 replay-context-pack (new) | 39 pass, 0 fail |
| W-1A invariant harness (repointed temp copy) | 18 pass, 0 fail |
| convergence invariants | 67 pass, 0 fail |
| phase 7 producer migration | 50 pass, 0 fail |
| phase 9 model-B proof | 32 pass, 0 fail |
| phase 12 collision/duplicate law | 54 pass, 0 fail |
| phase 13 fanout exactly-once | 31 pass, 0 fail |
| phase 14 ordering | 21 pass, 0 fail |
| W-2 witness versioning + root semantics | 8 pass, 0 fail |
| witness negative-path | 9 pass, 0 fail |
| constitutional eval (EVAL-001..009, mock) | 82 pass, 3 fail (pre-existing EVAL-006 1/4: mission is running / mission completed / result not overwritten; repair is uncommitted WIP in the dirty worktree, untouched) |
| EVAL-010 witness failure honesty (via run()) | 34 pass, 0 fail |
| sequence/replay cert (repointed temp copy) | 70 pass, 0 fail, 1 blocked (T5: `docker restart p0-cert-postgres` -> No such container; environmental, verbatim as Phases 15/16) |

Total: 484 pass, 3 pre-existing fails (EVAL-006, unchanged), 1 environmental
block. No new failures introduced by Phase 20.

## Commits

- `0d3cddd4a` "feat(contextpack): Phase 20 safe harvest, replay-context
  pack builder (derived consumer only)". Explicit staging of exactly 2
  files: `ping-runtime/context/replay_context_pack_builder.js` (+259, new)
  and `tests/event-authority-convergence/phase20_replay_context_pack.js`
  (+286, new). No add -A, no reset, no clean, no history rewrite, no
  deletions. Worktree clean after commit.

## Carryovers (unchanged, not Phase 20 scope)

- The writer-unit ContextPack merge spec from lane-c2 (I2 land + version
  pins + camelCase key fix + principal binding + RAG-bypass gate) remains
  open; it requires operator-grade decisions and is explicitly NOT
  pre-approved by this harvest.
- EVAL-006 3 failures: pre-existing; repair lives as uncommitted WIP in the
  dirty worktree, untouched per instructions.
- MissionRuntime.create() content-drift decision: open follow-up from
  Phase 12.
- The TS `runtime/kernel/replay/*` 13-leaf design story remains open
  (Phase 16 carryover).

## PHASE 20 VERDICT

PHASE 20 GO. The survey re-verifies the standing finding with zero drift:
no EFFECTIVE ContextPack implementation exists on the convergence line and
the strongest (I2) remains dormant/staged on its branch. The single safe
harvest, a replay-context pack builder, is implemented as a pure derived
consumer: read-only through the certified replay reader, zero write
surface (proven by static scan + Proxy test), W-2 version labels bound
null-safe, DERIVED marking with explicit COMPLETE/INCOMPLETE states under
W-2 truncation semantics. Everything else in the ContextPack space was
deliberately excluded with an authority rationale per item. Full battery
green: 484 pass, only the 3 pre-existing EVAL-006 failures and the
environmental T5 block, both unchanged.
