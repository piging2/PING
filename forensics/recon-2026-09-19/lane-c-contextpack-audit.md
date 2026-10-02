# LANE-C: ContextPack Convergence Audit (READ-ONLY)
**Date:** 2026-09-19 | **Lane:** C (ContextPack) | **Mode:** read-only audit, no mutations
**Source repo:** /home/nolan/ping via Pig WSL (observational git only: show/log/ls-tree/diff/grep)
**Backlog falsified premises consulted first:** AcquisitionManager PHANTOM, ConstitutionalEventStore PHANTOM, EventRepository LEGACY_UNREACHABLE, IEventAuthority DORMANT. None were re-traced; none appear in the ContextPack code paths examined.

## Scope and method
- Target commits: 902f40f44 (fix(context): make ContextPack selection replayable), b30790f3f (feat(workorder): bind authorized ContextPack identity), f20f6b9c4 (feat(context): verify tenant-scoped canonical evidence), all authored 2026-09-17 by Trish Nikitha (Codex).
- Descendants found via `git log --all --ancestry-path` and `--contains`: all three live on LOCAL_BRANCH `codex/context-workorder-convergence` (tip 08c3036d9), whose ancestry path continues 902f40f44 -> ... -> b30790f3f -> f20f6b9c4 -> 2191cc644 -> 08c3036d9 (the last two are temporal lifecycle fixes, context-adjacent only). A second, divergent ContextPack line exists on `sprint/harvest-12h` (tip 8fe3b8060). Common ancestor of both lines: 808363f91 (feat(context): add ContextCompiler for deterministic mission context).
- Nothing below mutates the repo. SHAs and branch names are copied verbatim from `git` output.

## Implementation inventory

### I1: Codex line — the audited line (LOCAL_BRANCH + PUBLIC_GITHUB, partial)
- PATH: `ping-runtime/context/context_compiler.js` (314 lines at tip), `context_integration.js`, tests `context_compiler.test.js`, `context_compiler.adversarial.test.js`, `context_authority_filtering.test.js`, `context_workorder_binding.test.js`; WorkOrder binding in `ping-runtime/external-agent/external_agent_adapter.js` + `WORKORDER_SCHEMA.json` + `RESULT_SCHEMA.json` + `BOUNDARY.md`; `ping-runtime/events/unified_event_runtime.js` (namespace param on getCorrelationGroup, added by f20f6b9c4).
- BRANCH: `codex/context-workorder-convergence`, tip **08c3036d9** (local). Pushed remote `origin/codex/context-workorder-convergence` is **stale at f20f6b9c4** (the last pushed context commit); the two temporal commits above it are local-only. So: PUBLIC_GITHUB = up to f20f6b9c4; LOCAL_BRANCH = up to 08c3036d9.
- LOCAL_WORKTREE: /home/nolan/worktrees/ping-codex-convergence at 08c3036d9.
- LAST CHANGE: 08c3036d9 "fix(temporal): correct worker lifecycle ownership" (not context; context last changed at f20f6b9c4, 2026-09-17 17:46).
- Commit chain on this line: 808363f91 -> 22e0ef5ac (determinism proof tests) -> 3ddb03404 (canonicalize event sets) -> 69f41de5f (hardened WorkOrder boundary) -> a97e6a97f (test: reject ContextPack result substitution) -> b30790f3f (bind authorized ContextPack identity) -> 67daa5b15 (test: authority-backed tenant filtering) -> 902f40f44 (replayable selection) -> f20f6b9c4 (tenant-scoped evidence verification) -> 2191cc644 -> 08c3036d9.
- Semantics harvested (read from the code):
  - Namespace gate: local `NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_.-]+$/`; compile throws without canonical namespace. Note: `external_agent_adapter.js` on this same line uses a DIFFERENT local regex `/^(core|tenant)::[a-z0-9_.-]+$/` (lowercase only). Two regexes, one line: a real inconsistency.
  - Bounded selection: MAX_CONTEXT_EVENTS = 100, fail-closed (throws, never truncates silently). Requested MAX+1 rows so over-selection is detectable.
  - `_canonicalizeEvents`: requires event_id/event_type/source non-empty strings; timestamp parsed and re-emitted ISO; payload/metadata must be objects; namespace and metadata.correlation_id must match expected (throw on mismatch); per-event `CanonicalAuthority.hash` content hash; dedup by event_id (identical content deduped silently, conflicting content under one event_id throws); output sorted by event_id, each stamped `content_hash`.
  - `_validateLineage`: causation_id closure over the selected set; dangling causation throws.
  - `_verifyEvidenceBacking`: `evidenceAuthority.accumulate(eventIds)` re-canonicalized and re-lineage-validated; compares `CanonicalAuthority.hash` of [(event_id, content_hash)] pairs selected vs backed; mismatch throws.
  - Ref extraction: canonical_object_refs, artifact_refs, relationship_refs as sorted unique arrays; source_metadata with sorted sources/authorities, earliest/latest timestamps, event_count. Note: `_extractCanonicalObjectRefs` contains duplicated `if` lines (project_id, lead_id, invoice_id, artifact_id checked twice); harmless because of the Set, but sloppy.
  - Selected-event manifest: `retrieval_manifest` = { version: 1, hash, inputs: {mission_id, query, namespace, correlation_id}, selected_events: [{event_id, content_hash}] }; hash = CanonicalAuthority.hash({version:1, inputs, selected_events}).
  - `context_pack_id = 'ctx_' + sha( { mission_id, query, namespace, correlationId, retrieval_hash } ).slice(0,16)`. Note: the key is camelCase `correlationId` inside an otherwise snake_case identity object. Pack identity therefore does NOT cover knowledge refs, compiled_at, or the manifest's own wrapper.
  - `ContextIntegration.issueWorkOrderWithContext`: compiles, then issues a WorkOrder whose input carries `context_pack_id` + `context_refs` (canonical objects, artifacts, evidence, relationships) + `task_input`.
  - `external_agent_adapter.issueWorkOrder`: requires non-empty taskId/missionId/correlationId/contextPackId/resultPath/deadline; stamps `context_pack_id`. `verifyResultEnvelope`: result must echo exact work_order_id and context_pack_id, agent_id must match invoked agent, capability must match, completed/failed shape checks, deadline enforcement. `resultIdentity` = sha256('external-result:' + stable binding {work_order_id, context_pack_id, agent_id, capability, status}). Note: this line's adapter ALSO carries a local `canonicalEventId` mirror function with VOLATILE_FIELDS (a second event-identity implementation: authority smell, fixed on I2).
  - f20f6b9c4's runtime change: `UnifiedEventRuntime.getCorrelationGroup(correlationId, limit, namespace)` adds `AND namespace = $n` to the ping_events correlation query.
- CALLERS: on this line, zero production callers outside `ContextIntegration` (only the 4 test files reference ContextCompiler/ContextIntegration). No scheduler wiring on this line.
- TESTS: 15/15 compiler, 6/6 workorder binding, 10/10 authority filtering, 9/9 adversarial per the 33b559133 commit message (declared, not re-run by this read-only lane). Adversarial themes: permutation invariance, immutable manifest, duplicate-delivery idempotence, identity sensitivity to set/content change, conflict fail-closed, no caller mutation.
- LIVE?: NO. `main` and `oracle/deploy-2026-09-18` contain no `ping-runtime/context/` at all. The live gateway image (ping-gateway:devin-boundary2) shows zero context/ContextPack lines per agent-e recon.
- SUPERSEDED?: Not yet, but I2 is a strict superset with two known fixes (see I2). I1's only unique artifact is the pushed remote ref at f20f6b9c4.

### I2: Harvest line — strict semantic superset (LOCAL_BRANCH + LOCAL_WORKTREE)
- PATH: same `ping-runtime/context/` tree at `sprint/harvest-12h` tip **8fe3b8060**; `context_compiler.js` is 379 lines.
- BRANCH: `sprint/harvest-12h` (LOCAL_BRANCH; no public remote ref observed for this name). LOCAL_WORKTREE: /home/nolan/worktrees/ping-harvest-12h.
- Provenance: 33b559133 "feat(context): harvest deterministic ContextCompiler stack" copied the I1 stack from `codex/context-workorder-convergence @ 08c3036d9` onto this line, replacing a regressed copy that dropped events from pack identity (commit message states the regression caused a proven identity collision; supersedes `feature/context-compilation`). The three audited commits are NOT ancestors of this branch (verified via merge-base); they arrived via the harvest copy.
- Deltas vs I1 (from direct diff of both compilers plus adapter diff):
  1. 0b946984b: `NAMESPACE_RE` owned by `ping-runtime/canonicalization/canonicalization_service.js` (single authority). Kills both local regexes of I1.
  2. e4df146ca (H69): `_retrieveKnowledgeRefs(namespace)` injects `knowledge_refs` AFTER pack ID generation: approved nodes (limit 25) + high-confidence candidates (limit 50, confidence >= 0.8), projected to deterministic sorted refs, fail-soft (any failure returns [], pack byte-identical). Pack identity does NOT cover knowledge_refs: deliberate design decision, recorded in comments.
  3. `ping-runtime/orchestration/mission_scheduler.js` (67f312761 + H77 investigation): `_compileContextPack(mission, event, workerName)` attaches `event.context_pack`; skips compilation for non-consuming workers (H77 proved only ObservationWorker reads `event.context_pack`). This is the ONLY production wiring of ContextCompiler found anywhere.
  4. Adapter (15d2d0129 "harvest hardened WorkOrder boundary with context binding"): REMOVED the local `canonicalEventId`/VOLATILE_FIELDS mirror; defers event identity to `UnifiedEventRuntime.computeEventId` (single authority); structured `blockedExternal` {reason, blockedUntil} with expiry logic.
- TESTS: adds knowledge_refs coverage (8fe3b8060) to the compiler suite; H77/H78 drive results declared 5/5.
- LIVE?: NO (same as I1; no context code on main or the deploy branch).
- STRONGEST?: YES for 10 of 12 requested semantics (see map).

### I3: feature/context-compilation (LOCAL_BRANCH, superseded)
- Tip 3ddb03404, descendant of 808363f91 and ancestor of I1's line. Contains its own event-set canonicalization hardening (delete eventCount, hashSet of canonical event fields). Per 33b559133 it is superseded by the harvest; keep for history only.

### I4: constitutional-convergence-v2 (LOCAL_BRANCH, the convergence target)
- Tip 84da2d40c. Contains NO `ping-runtime/context/` at all (zero history for the path; diverged from the context lines at 099927152, before any ContextPack work). This is the merge target the convergence proposal must land on. Merge candidate set: I2's compiler + integration + tests + schemas + adapter binding + scheduler wiring.

### I5: Python legacy ContextPack (LOCAL_BRANCH code, not live-enforced)
- `runtime/cognitive/context_pack.py` (+ `context_pack_cache.py`, root `context_pack_builder.py`): a DIFFERENT schema ({question, highest_authority, authority_chain, lineage, supporting_documents, supporting_claims, contradictions, citations, witness_roots, confidence}). Its docstring states "Rule 2: Context Pack mandatory. Every answer must originate from a Context Pack" and "Rule 1: No direct vector search answers". These stated laws are contradicted by the live JS RAG path (see RAG bypass). Legacy; candidate for archive or compatibility-adapter treatment. Not merged into I1/I2.

### I6: Orchestration ContextPackets (legacy static JSON)
- `ping-runtime/orchestration/generate_context_packets.js` + `ContextPackets.json`: static packet bundles reading hardcoded Windows paths (c:\Users\nolan\PING\...). Not a compiler, not canonical, not deterministic. Archive candidate.

## Strongest-implementation map (per requested semantic)

| Semantic | Owner | Evidence |
|---|---|---|
| Canonical event normalization | I2 (== I1) | `_canonicalizeEvents`: field/type/timestamp checks, ISO timestamps, canonical namespace+correlation matching |
| Byte-identical dedup | I2 (== I1) | byId keyed on event_id + content hash; identical content silently deduped |
| Conflicting identity rejection | I2 (== I1) | same event_id with different content hash throws; adversarial test "conflicting contents under one event identity fail closed" |
| Deterministic sorted refs | I2 (== I1) | sorted-by-event_id events; sorted ref arrays and metadata; knowledge_refs sorted by node_id |
| Selected-event manifest | I2 (== I1) | retrieval_manifest v1 with (event_id, content_hash) pairs; pack ID hashes the manifest hash |
| Namespace binding | I2 | single canonical NAMESPACE_RE owned by canonicalization service (I1 has two inconsistent local regexes) |
| Authority filtering | I2 (== I1) | evidenceAuthority.accumulate + backing hash comparison; 10/10 filtering tests; namespace clause in getCorrelationGroup (f20f6b9c4) |
| Correlation/causation validation | I2 (== I1) | per-event namespace+correlation match; causation closure; dangling causation throws |
| context_pack_id propagation | I2 | WorkOrder stamps context_pack_id; ResultEnvelope echo enforced; resultIdentity binds pack ID into result identity |
| WorkOrder/ResultEnvelope binding | I2 | verifyResultEnvelope (echo, executor, capability, deadline checks) + schemas require the field on both envelopes; I2 adapter additionally removes the duplicate event-identity mirror |
| Tenant/principal/evidence binding | PARTIAL, I2 | Tenant = namespace (f20f6b9c4 + filtering). Evidence = evidence_refs + evidence-backing verification. Principal = only implicit via `customer:`/`project:` payload refs; NO explicit principal_id/authority field anywhere. GAP. |
| Compiler versioning | GAP everywhere | retrieval_manifest carries version: 1, but the pack has NO compiler_version / schema_version / canonicalization-version field. GAP. |

## RAG bypass: verified, and NOT fixed by any candidate
- Claim (from agent-e recon): `gateway/knowledge_retrieval.js` answers questions via Question -> embed -> Qdrant topK -> Ollama -> answer with no pack, no authority resolution, no tenant scoping, no witness; registered in `gateway/bootstrap/wiring.js:110-111` as `knowledgeRetrieval`; invoked from `gateway/activities/knowledge.activity.js:24`.
- Re-verified read-only on the I1 branch: header comment "Phase A.3 — Knowledge Retrieval ... Question -> Embedding -> Qdrant Search -> Top K -> Ollama -> Answer"; `answerQuestion(question)` performs embed, Qdrant search, context build, Ollama answer, with no ContextPack involvement; wiring and activity match the claim exactly.
- Presence: the file + wiring + activity exist identically on I1, I2, and constitutional-convergence-v2. They do NOT exist on `main` or `oracle/deploy-2026-09-18` (thin gateway), and the live image `ping-gateway:devin-boundary2` shows zero ContextPack lines per agent-e, so the bypass as wired code lives in the v2-family source tree, staged behind the Oracle deployment gap.
- Fix status: `git log` on `gateway/knowledge_retrieval.js`, `gateway/activities/knowledge.activity.js`, and `gateway/bootstrap/wiring.js` on the I1 line shows only pre-existing commits (e4200f44a, e6f8e4bef, 1effdc8ad, d596aa596). NONE of 902f40f44, b30790f3f, f20f6b9c4 nor any descendant touches the bypass path. I2 does not fix it either. **Conclusion: no candidate fixes the RAG bypass; it must be a first-class item in the convergence proposal.**

## Convergence proposal (single target)

**Target:** one ContextCompiler on `constitutional-convergence-v2`, seeded from I2 (the strict superset), with the following hardened deltas. I1 is the evidence base; I2 is the starting point; neither is merged yet.

**Target ContextPack schema (canonical fields):**
```
context_pack_id, schema_version, compiler_version, canonicalization_version,
mission_id, query, namespace, tenant_id (explicit, derived from namespace),
principal_id (NEW, explicit binding; currently missing),
correlation_id, selected_events: [{event_id, content_hash}],
evidence_refs, canonical_object_refs, artifact_refs, relationship_refs,
knowledge_refs (fail-soft, identity-excluded by recorded decision),
retrieval_manifest: {version, hash, inputs, selected_events},
source_metadata, compiled_at
```
**Target compiler behavior:** namespace gate via canonicalization-service NAMESPACE_RE; MAX 100 fail-closed bound; `_canonicalizeEvents` + content-hash dedup + conflict throw; namespace+correlation match; causation closure; evidence-backing verification (accumulate, re-canonicalize, pair-hash compare); deterministic sorted outputs; pack ID = ctx_ + sha over manifest hash with snake_case keys (fix the camelCase `correlationId` key); WorkOrder/ResultEnvelope binding via the I2 adapter (no event-identity mirrors; UnifiedEventRuntime.computeEventId sole authority); scheduler `_compileContextPack` wiring from I2 (H77/H78 skip logic); knowledge_refs fail-soft AFTER identity with the exclusion decision recorded in-repo.

**Dependency order for the mutation unit (later, not this lane):**
1. Pin event identity: UnifiedEventRuntime.computeEventId as sole authority; assert no mirrors (I2 adapter already complies; I1's mirror must not be reintroduced).
2. Land compiler + integration + all 4 test suites from I2 onto constitutional-convergence-v2; add schema_version/compiler_version/canonicalization_version to pack and manifest; fix correlationId key; drop duplicated add-lines.
3. Land WorkOrder/ResultEnvelope binding + JSON schemas (I2 adapter version).
4. Land scheduler `_compileContextPack` wiring + ObservationWorker `event.context_pack` consumption contract (document the contract: which workers may read packs).
5. Add explicit principal_id binding (design decision; currently absent everywhere).
6. RAG bypass: gate `knowledge_retrieval.answerQuestion` behind pack-mandatory answering (compile pack from the question's correlation group, bind namespace, then answer) OR quarantine the module with an explicit BYPASS marker until then. This is the "no direct RAG answer bypass" P1 item.
7. Archive legacy: I3 branch history stays; I5 Python pack schema -> docs-only or compatibility adapter; I6 ContextPackets -> archive.

## Deletion/merge candidates (NOT deleted by this lane)
- `feature/context-compilation` branch: superseded by 33b559133; keep history, do not merge (I1 contains its hardening).
- `runtime/cognitive/context_pack.py`, `context_pack_cache.py`, root `context_pack_builder.py`: legacy schema contradicting the JS doctrine; archive or adapter, do not promote.
- `ping-runtime/orchestration/generate_context_packets.js` + `ContextPackets.json`: hardcoded-path legacy; archive.
- `gateway/knowledge_retrieval.js` bypass path: fix-or-quarantine, do not delete before the pack-mandatory replacement exists (blocking deletion would strand the knowledge activity).
- I1-only artifacts to NOT carry forward: local NAMESPACE_RE copies, adapter `canonicalEventId`/VOLATILE_FIELDS mirror, dead `_knowledgeGraph` wiring, camelCase `correlationId` in pack identity, duplicated add-lines.

## Classification of locations
- PUBLIC_GITHUB: `origin/codex/context-workorder-convergence` @ f20f6b9c4 (stale; 2 commits behind local tip). Remote repo: github.com/ngesk2/crx-runtime (origin).
- LOCAL_BRANCH: `codex/context-workorder-convergence` @ 08c3036d9; `sprint/harvest-12h` @ 8fe3b8060; `feature/context-compilation` @ 3ddb03404; `constitutional-convergence-v2` @ 84da2d40c.
- LOCAL_WORKTREE: /home/nolan/worktrees/ping-codex-convergence (08c3036d9); /home/nolan/worktrees/ping-harvest-12h (8fe3b8060).
- LIVE_RUNTIME: no ContextPack implementation is live. `main` (5b102c664) and `oracle/deploy-2026-09-18` have no `ping-runtime/context/`; the deployed gateway image has zero ContextPack lines. The RAG bypass code is present in the v2-family source tree but the deployed artifact predates/omits it; treat bypass as source-present, deployment-unproven.
