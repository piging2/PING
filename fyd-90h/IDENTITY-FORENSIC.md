# IDENTITY FORENSIC — 8-WAY CLASSIFICATION

Date: 2026-09-29. Scope: entire /home/nolan/ping tree INCLUDING worktrees.
Method: read each implementation, traced require/import callers repo-wide,
ran shadow equivalence harness on live code (read-only).

## Critical answer first

NO. These are not eight identity authorities.

- 3 share deterministic-identity semantics: #1, #4, #7 (and #7 already
  delegates to #4 via the PATCH_004 shim).
- 1 is an interface, not an implementation: #3.
- 4 are proven different kinds of identifiers: #2 (unique instance minting),
  #5 (replay session identity), #6 (machine provenance), #8 (workflow IDs).

Collapsing #2/#5/#6/#8 into an identity authority would be exactly the
semantic collapse Nolan forbade.

---

## #1 — runtime/constitutional/src/identity-authority.ts

- PATH: runtime/constitutional/src/identity-authority.ts (143 lines)
- LANGUAGE: TypeScript (compiled dist present)
- EXPORT: class IdentityAuthority (static), interface CanonicalID
  {authority, namespace, kind, version, hash}
- CALLERS (main tree): ping-object-kernel.ts, ping-identity.ts,
  ping-projector.ts, index.ts (constitutional subsystem)
- INPUTS: (namespace: string, context: string), (eventType, aggregateId)
- OUTPUT FORMAT: CanonicalID object; hash = 64-hex via HashAuthority.hashCanonical
- DETERMINISTIC: yes (harness: stable across repeats, input-sensitive)
- CRYPTOGRAPHIC: hash-based, not signing
- PERSISTED: Patch 7B comment (2026-09-21) verified zero persisted type_hash16
  IDs in repo and zero OBJECT_CREATED rows in live Oracle journal at that time
- EVENT-REFERENCED: generateEventId exists; live event refs not re-proven this turn
- PUBLIC API: yes, via constitutional index
- WORKFLOW-SCOPED: no
- TEST COVERAGE: identity-authority.test.ts ("Characterization Tests — prove
  existing ID behavior is preserved after convergence"), patch-7b-canonical.test.ts
- LIVE/DORMANT/DEAD: LIVE
- SEMANTIC PURPOSE: deterministic content-derived identity for the
  constitutional subsystem (object kernel / projector)
- SHADOW RESULT: same semantics as #4, INTENTIONALLY DIFFERENT output format
  (CanonicalID object vs type_hash16 string). DO NOT auto-normalize.

## #2 — runtime/authorities/identity_authority.py

- PATH: runtime/authorities/identity_authority.py (108 lines)
- LANGUAGE: Python
- EXPORT: class IdentityAuthority; generate_id(), generate_deterministic_id(),
  generate_short_id()
- CALLERS (main tree): runtime/workers/planner_worker.py, github_worker.py,
  retriever_worker.py, reasoner_worker.py, projection_worker.py,
  authorities/authority_router.py, authorities/repository_authority.py
  (+ worktree mirrors)
- INPUTS: none (generate_id), (namespace, name) for deterministic
- OUTPUT FORMAT: UUIDv7 string (generate_id), UUIDv5 string (deterministic),
  8-hex random (short)
- DETERMINISTIC: NO for generate_id (harness: two calls, two different UUIDs);
  yes for generate_deterministic_id (UUIDv5 stable)
- CRYPTOGRAPHIC: no (random + hash, no signing)
- PERSISTED: minted IDs flow into workers/repository; per-ID persistence not
  traced this turn
- EVENT-REFERENCED: unknown this turn
- PUBLIC API: yes (worker-facing)
- WORKFLOW-SCOPED: no
- TEST COVERAGE: not verified this turn
- LIVE/DORMANT/DEAD: LIVE (heaviest caller count of all eight)
- SEMANTIC PURPOSE: UNIQUE INSTANCE ID MINTING ("Every UUID/identity in the
  system originates from this class. No worker or tool calls uuid.uuid4()
  directly."). Its primary method mints NEW unique IDs, the opposite of
  stable identity.
- VERDICT: PROVEN DIFFERENT KIND OF IDENTIFIER. Do not converge. Document the
  boundary: generate_id() must never be used where stable identity is required.

## #3 — runtime/kernel/identity/identity-authority.ts

- PATH: runtime/kernel/identity/identity-authority.ts (30 lines)
- LANGUAGE: TypeScript
- EXPORT: interface IIdentityAuthority (generateUUIDv5, generateContextId,
  generateWitnessId, generateCertificateId, generateAuditId, generateLeaseId,
  generateSpanId, generateEventId, generateReplayId, generateEnvelopeId,
  generateMissionId, generateEpicId, generateTaskId), interface IClockAuthority
- CALLERS: interface only
- VERDICT: NOT AN IMPLEMENTATION. Keep as the contract surface; #4 already
  implements its method family.

## #4 — runtime/kernel/authorities/identity_authority.js [SURVIVOR]

- PATH: runtime/kernel/authorities/identity_authority.js (362 lines)
- LANGUAGE: JavaScript (Node)
- EXPORT: class IdentityAuthority, singleton identityAuthority
- CALLERS (main tree): ping-runtime/authorities/identity_authority.js (shim #7),
  test_patch_004.js, test_temporal_audit.js (+ worktree mirrors)
- INPUTS: (canonicalBytes: Buffer, type), (type, identityData), plus the
  generate* family (failure/tool/stream/chunk/inference/prompt/execution/
  runtime/object/snapshot/event/spine-event/worker/outbox/dead-letter)
- OUTPUT FORMAT: `${type}_${hash16}` — THIS IS type_hash16, the
  compatibility-sensitive persisted format, via CanonicalAuthority.hashBytes
- DETERMINISTIC: yes (harness: stable across repeats, input-sensitive)
- CRYPTOGRAPHIC: hash-based, not signing
- PERSISTED: type_hash16 is the persisted/event-referenced legacy format
- EVENT-REFERENCED: generateEventId / generateSpineEventId
- PUBLIC API: yes (via #7 shim into ping-runtime)
- WORKFLOW-SCOPED: no
- TEST COVERAGE: test_patch_004.js, test_temporal_audit.js,
  worktrees/agent-exec/tests/determinism.test.js
- LIVE/DORMANT/DEAD: LIVE
- SEMANTIC PURPOSE: THE canonical-hash deterministic ID minter; the codebase's
  own convergence pattern (PATCH_004) already delegates #7 to it
- SHADOW RESULT: PASS (deterministic, stable); format intentionally differs
  from #1 — that difference is the legacy contract to preserve.

## #5 — runtime/kernel/authorities/replay_identity_authority.js

- PATH: runtime/kernel/authorities/replay_identity_authority.js (245 lines)
- LANGUAGE: JavaScript
- EXPORT: class ReplayIdentityAuthority
- CALLERS (main tree): runtime/kernel/authorities/standard_event_schema.js,
  gateway/replay_certificate_authority.js (+ worktree mirrors)
- INPUTS: replay config
- OUTPUT FORMAT: replay session identity (canonical graphs, reducer graph,
  authority graph, replay transcript)
- DETERMINISTIC: session-scoped
- SEMANTIC PURPOSE: REPLAY SESSION identity. Its own header: "Only
  ReplayIdentity may influence ReplayHash / CanonicalHash / WitnessHash /
  CanonicalEventHash."
- VERDICT: PROVEN DIFFERENT KIND OF IDENTIFIER. Explicitly separated by design
  ("Priority 3: Runtime Identity Separation"). Keep.

## #6 — runtime/kernel/authorities/runtime_identity_authority.js

- PATH: runtime/kernel/authorities/runtime_identity_authority.js (198 lines)
- LANGUAGE: JavaScript
- EXPORT: class RuntimeIdentityAuthority, singleton runtimeIdentityAuthority
- CALLERS (main tree): runtime/kernel/event_repository.js,
  runtime/kernel/authorities/reducer_authority.js,
  runtime/kernel/authorities/standard_event_schema.js,
  runtime/kernel/omni_router_bootstrap.js,
  gateway/replay_certificate_authority.js; gateway/runtime_identity_authority.js
  is a shim delegating to it (same PATCH pattern as #7)
- INPUTS: runtime config
- OUTPUT FORMAT: machine fingerprint (platform, arch, hostname, node version,
  uptime, CPU model/count, memory)
- DETERMINISTIC: no (machine/time-dependent by design)
- SEMANTIC PURPOSE: MACHINE PROVENANCE. Its own header: "RuntimeIdentity is
  provenance only. It does NOT influence replay hashes."
- VERDICT: PROVEN DIFFERENT KIND OF IDENTIFIER. Keep.

## #7 — ping-runtime/authorities/identity_authority.js

- PATH: ping-runtime/authorities/identity_authority.js (42 lines)
- LANGUAGE: JavaScript
- EXPORT: class IdentityAuthority extends KernelIdentityAuthority, singleton
- CALLERS: ping-runtime consumers (via this path)
- VERDICT: ALREADY CONVERGED. "PATCH_004: Moved to runtime/kernel/authorities/.
  This file is now a gateway shim that re-exports from kernel." Pure
  delegation to #4. No action needed.

## #8 — ping-runtime/authorities/workflow_identity_authority.js

- PATH: ping-runtime/authorities/workflow_identity_authority.js (64 lines)
- LANGUAGE: JavaScript
- EXPORT: class WorkflowIdentityAuthority, singleton workflowIdentityAuthority
- CALLERS: test_patch_011.js, test_authority_migrations.js,
  test_temporal_audit.js (no non-test live caller confirmed this turn)
- INPUTS: job {type, payload, timestamp}
- OUTPUT FORMAT: via deterministic_id_authority.generateIdFromObject
  (a related but separate utility, not one of the 8)
- SEMANTIC PURPOSE: WORKFLOW-SCOPED IDs. Its own header: "Owns workflow ID
  generation. Provider never generates IDs."
- VERDICT: WORKFLOW-SCOPED IDENTIFIER. Per the order: workflow-scoped
  identifiers remain workflow identifiers. Do not route through
  IdentityAuthority. Keep; document boundary.

## Dormant classification

- ping-runtime/orchestration/dormant_classifications/
  runtime_constitutional_dist_identity-authority.json — a dormant
  classification record, not an implementation.

---

# THE ONE CONTRACT

PING IDENTITY = "what is the STABLE PING IDENTITY of this entity?"
- Canonical minter: #4 (runtime/kernel/authorities/identity_authority.js).
- Canonical persisted format: type_hash16 (`${type}_${hash16}`), preserved exactly.
- Contract surface: IIdentityAuthority (#3).

EXPLICITLY OUTSIDE this namespace (separate, documented, guarded):
- Unique instance minting: #2 generate_id() (UUIDv7) — "mint me a NEW id"
- Replay session identity: #5
- Machine provenance: #6
- Workflow IDs: #8
- Provider/external identities: IdentityClaim objects, never competing mints
- Key IDs / cryptographic identity: separate concern; reuse Ed25519/JWK machinery

# SURVIVOR: #4 — WHY (call graph, not aesthetics)

1. Owns type_hash16, the compatibility-sensitive persisted/event-referenced
   format Nolan ordered preserved. #1's CanonicalID shape is not the persisted
   legacy format.
2. Its generate* family implements the IIdentityAuthority interface (#3).
3. The codebase's own prior convergence (PATCH_004) already chose it: #7 is a
   shim delegating to #4, and gateway/runtime_identity_authority.js follows the
   same pattern.
4. Test coverage on the determinism path (test_patch_004, temporal audit,
   agent-exec determinism tests).

# CONVERGENCE PLAN (no big-bang; one caller family at a time)

1. #7: done (shim). Verify no logic remains; keep as the ping-runtime boundary.
2. #1 → COMPATIBILITY ADAPTER over #4 for the constitutional subsystem.
   Constraint: #1's CanonicalID output shape and HashAuthority.hashCanonical
   derivation are PRESERVED inside the adapter. No reminting, no format change
   for ping-object-kernel / ping-projector / ping-identity callers. The
   "one authority" property is established by shared canonicalization rules,
   not by byte-identical outputs across formats.
3. #2: no convergence. Document the semantic boundary in code + add a guard
   test: feature code must not call generate_id() where stable identity is
   required.
4. #5/#6: no convergence. Already follow the shim pattern; document that they
   are not PING identity authorities.
5. #8: no convergence. Document workflow-scope boundary.
6. Authority rule: add test_identity_authority_boundary (JS + Python) that
   scans require/import statements and fails on any new direct dependency on a
   non-canonical identity implementation. The eight must not become nine.
7. Per-duplicate execution follows Nolan's 10-step sequence (prove semantics,
   prove callers, shadow-compare, characterization test, redirect, targeted
   tests, canonical gate, replay/projection proof, deprecate, delete on proof).
8. Product proof after each stage: FYD two-website regression (same
   identity/object IDs), SiteSpecs unchanged, renderer green, Ask FYD identity
   semantics unchanged, events/replay unchanged.

# STOP CONDITIONS (escalate with exact evidence, do not bulldoze)

- Full #1→#4 derivation unification (single hash pipeline) is NOT authorized
  in this plan: it would change #1's 64-hex hash outputs. That migration needs
  the FYD two-website regression + replay proof FIRST, then Nolan's explicit call.
- Any step requiring reminted persisted IDs, rewritten canonical history,
  production DB migration, changed event identity semantics, broken replay,
  changed signature ownership, unknown key custody, or overwriting another
  lane's dirty work: STOP and escalate.

# SHADOW EQUIVALENCE HARNESS

- Node harness: ~/workspace/fyd-90h/hidden_files/shadow-harness-node.js
- Python probe: ~/workspace/fyd-90h/hidden_files/shadow-harness-py.py
- Result: #4 stable + deterministic (type_hash16); #1 stable + deterministic
  (CanonicalID object, 64-hex); #2 generate_id unique per call (UUIDv7),
  generate_deterministic_id stable (UUIDv5), generate_short_id unique.
- Verdict: #1 vs #4 = SAME SEMANTICS, INTENTIONAL FORMAT DIFFERENCE (legacy
  contract — do not normalize). #2 primary = DIFFERENT SEMANTICS (proven).
