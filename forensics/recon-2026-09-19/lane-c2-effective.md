# LANE-C second pass: ContextPack EFFECTIVE-determination (READ-ONLY)
**Date:** 2026-09-18/19 | **Lane:** C2 | **Mode:** strictly read-only; no source edits, no commits, no DB writes, no restarts, no secret reads
**Repo:** /home/nolan/ping via Pig WSL (`pigwsl-run.sh`); git observational only (show/log/grep/ls-tree/rev-parse)
**Prior audit:** lane-c-contextpack-audit.md (used as starting point; key claims re-verified below, test counts and message-declared proofs not re-run)

## Verdict

**No ContextPack implementation is EFFECTIVE.** The strongest implementation, **I2** on `sprint/harvest-12h @ 8fe3b8060`, is verified to exist as source and is wired on its branch, but it is **DORMANT/staged**: it has never been merged to the convergence target, is absent from `main`, absent from `oracle/deploy-2026-09-18`, and absent from the live gateway image. The proposition "an EFFECTIVE ContextPack implementation exists" is **FALSIFIED**.

**Terminal state: FALSIFIED.** Smallest broken arrow: `sprint/harvest-12h @ 8fe3b8060` -> `constitutional-convergence-v2 @ 84da2d40c`. Verified via `git ls-tree`: the target has **zero** `ping-runtime/context/` history. The merge that would make the stack reachable never happened, so no runtime anywhere executes it.

## Strongest implementation: I2 (verified, not trusted blindly)

- Branch tip confirmed: `sprint/harvest-12h` = **8fe3b8060** (rev-parse, 2026-09-18).
- Provenance commit **33b559133** confirmed: "feat(context): harvest deterministic ContextCompiler stack", author Trish Nikitha, and `git merge-base --is-ancestor 33b559133 sprint/harvest-12h` = true. Its message declares the source (`codex/context-workorder-convergence @ 08c3036d9`), declares that it replaces a regressed copy on the harvest line "that dropped events from identity (proven identity collision)", and declares 15/15 + 6/6 + 10/10 + 9/9 test results. The message body is the only provenance for the regressed-copy collision claim; this lane did not re-prove it and did not re-run the suites.
- Deltas vs I1 re-verified in code, all four hold:
  1. Single namespace authority: compiler line 12 requires `NAMESPACE_RE` from `ping-runtime/canonicalization/canonicalization_service.js`. I1's two local regexes are gone.
  2. `knowledge_refs` injected AFTER pack ID generation (lines 85-105) with a recorded H69 comment: fail-soft, byte-identical pack when the graph yields nothing. Identity deliberately excludes knowledge_refs.
  3. Scheduler wiring exists and only here: `mission_scheduler.js:306` `_compileContextPack`, attached at line 260 (`event.context_pack = contextPack`), with the H77 comment that only the observation worker reads it.
  4. Adapter mirror removed: `external_agent_adapter.js:297` carries the comment "The former canonicalEventId mirror was removed 2026-09-17"; grep for `canonicalEventId|VOLATILE_FIELDS` in the adapter returns nothing.
- I1 (`codex/context-workorder-convergence @ 08c3036d9`) confirmed as the evidence base: pushed remote ref is stale at f20f6b9c4. I3 (`feature/context-compilation @ 3ddb03404`) confirmed superseded. I4 (`constitutional-convergence-v2 @ 84da2d40c`) confirmed as the merge target with no context code. I5/I6 legacy confirmed out of scope.

## Producer and consumer (I2, verified in code)

- **Producer:** `MissionScheduler._compileContextPack` -> `ContextCompiler.compile` (`ping-runtime/context/context_compiler.js`). A second producer exists but is unwired: `ContextIntegration.issueWorkOrderWithContext` is defined and has zero production callers (grep shows only its own definition plus test files).
- **Consumer:** `ObservationWorker` in `ping-runtime/workers/canonical_workers.js:103`. Fail-soft passthrough: extracts `context_pack_id`, `evidence_refs`, `knowledge_refs` from `event.context_pack` and stamps them into the observation and the downstream OBSERVATION payload (lines 126, 136). The `retrieval_manifest` is explicitly NOT propagated (comment: never propagate it).
- Secondary consumer path (staged, unwired in production): `external_agent_adapter.js` WorkOrder/ResultEnvelope binding stamps and echoes `context_pack_id` and binds it into `resultIdentity`.

## Identity scheme

- `context_pack_id = 'ctx_' + sha256(CanonicalBytes.serialize(identity)).substring(0, 16)`, where identity = `{mission_id, query, namespace, correlationId, retrieval_hash}` (note: the key is camelCase `correlationId` inside an otherwise snake_case object; self-consistent, so no live collision, but a future writer using `correlation_id` would silently produce a different ID for the same logical inputs).
- `retrieval_hash` = `CanonicalAuthority.hash({version: 1, inputs: {mission_id, query, namespace, correlation_id}, selected_events: sorted [{event_id, content_hash}]})`. Hash chain: KernelCanonicalAuthority.hash -> sha256 over canonical bytes. Events are sorted by event_id; per-event content bound via `content_hash`; identical content under one event_id deduped silently, conflicting content throws (fail-closed).
- **Can two different contents collide under one identity?** Under sha256, no practical collision. Three real qualifications, all verified in code:
  1. **Deliberate exclusion:** `knowledge_refs` and `compiled_at` are outside the identity by recorded H69 design decision. Two packs identical except knowledge_refs share an ID. Expected, not a bug.
  2. **64-bit truncation:** 16 hex chars = 64 bits of the sha256. Birthday bound near 2^32 packs. Fine at intended scale; weaker than the full hash the system otherwise uses.
  3. **The regressed copy** (pre-33b559133 harvest copy) dropped events from identity entirely; the harvest commit message declares this caused a proven collision and that the harvest supersedes it. Declared in the message, not independently re-proven by this lane.

## Lifecycle properties (I2)

- **What invalidates a pack?** Nothing. No cache exists on the JS side (grep for "cache" under `ping-runtime/context/` returns nothing), no invalidation API, no pack store. A pack is recomputed fresh on every `compile()`; in-flight copies held by consumers have no staleness signal.
- **Are source versions encoded?** No. `retrieval_manifest` carries `version: 1` only. `CANONICAL_VERSION = '1.0.0'` exists in the canonicalization service but is not stamped into the pack or the manifest; there is no `compiler_version` or `canonicalization_version` anywhere in the compiler. Gap confirmed (prior audit's gap stands).
- **Stale-after-mutation?** Yes, in principle. The pack is a point-in-time projection of the correlation group with no event-store version or timestamp-window binding beyond `source_metadata.earliest/latest_event`. If the group's events change after compile, the in-flight pack and its propagated id/refs are stale with no detection. Mitigating factor: the compiler treats events as immutable (conflicting content under one event_id throws).
- **Can replay reconstruct it?** Recompute only, not reconstruct. There is no durable pack record; replay = re-running `compile()` against the same event-store snapshot with the same code version (version unpinned, see above). The manifest contains everything a verifier needs to recompute and compare, but the only stored artifact to compare against is the truncated `context_pack_id` inside observation payloads.
- **Canonical or derived?** Derived. Source truth is the `ping_events` rows; the pack is a deterministic derived projection with content-bound identity.
- **Where does it persist?** The pack object itself is persisted nowhere. What persists: `context_pack_id` + `evidence_refs` + `knowledge_refs` inside downstream OBSERVATION event payloads (worker `_emit` -> `UnifiedEventRuntime.emit` -> `ping_events`). The full pack, including `retrieval_manifest`, is never persisted and never propagated past the worker.
- **Survive restart?** The pack object does not. Its ID and refs survive inside already-emitted observation events. A fresh compile after restart reproduces a byte-identical pack only if the event store and code version are unchanged.

## RAG bypass: re-verified, still fixed by no candidate

- Re-verified on `sprint/harvest-12h` tip AND on `constitutional-convergence-v2`:
  - `gateway/knowledge_retrieval.js`: `answerQuestion(question)` does Question -> embed -> Qdrant topK -> Ollama -> answer. No pack, no namespace, no tenant scoping, no witness. Confirmed by reading the module header and class.
  - `gateway/bootstrap/wiring.js:110`: registers `knowledgeRetrieval` (plus an authority declaration at line 205).
  - `gateway/activities/knowledge.activity.js:24`: `knowledgeRetrieval.answerQuestion(job.question)`.
- `git log` on all three paths shows only pre-existing commits (e4200f44a, e6f8e4bef, 1effdc8ad). None of the context commits touch the bypass path. **No candidate on any line fixes it.**
- One new observation: `ping-runtime/temporal/activities/mission_activities.js:30` contains a COMMENT referencing `input.context_pack_id` (commented-out namespace line). Dead comment, not a fix; noted as a dangling reference for the writer unit.

## Declared but not re-proven (read-only lane limits)

- Compiler/binding/filtering/adversarial suite pass counts (15/15, 6/6, 10/10, 9/9) and H77/H78 5/5: declared in commit messages and code comments; not re-run (test execution could touch DBs; out of read-only scope).
- The 33b559133 claim that the regressed copy had a proven identity collision: provenance is the commit message only.
- Agent-e recon claim that the live image `ping-gateway:devin-boundary2` shows zero ContextPack lines: not re-run; corroborated by absence on `main` and `oracle/deploy-2026-09-18` (both verified to have no `ping-runtime/context/`).

## Recommended next step (not implemented by this lane)

The prior audit's convergence proposal stands as the writer-unit specification: land the I2 stack onto `constitutional-convergence-v2` (compiler + integration + 4 test suites + adapter binding + scheduler wiring), add `schema_version`/`compiler_version`/`canonicalization_version` to pack and manifest, fix the camelCase identity key, add explicit `principal_id` binding, and gate-or-quarantine `knowledge_retrieval.answerQuestion` as the first-class RAG-bypass item. Dependency order per prior audit: pin event identity first, then compiler, then binding, then scheduler wiring, then principal binding, then the RAG gate, then archive legacy.
