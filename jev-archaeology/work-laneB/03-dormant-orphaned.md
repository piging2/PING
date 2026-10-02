# Lane B — Dormant/Legacy + Orphaned-but-Valuable (2026-09-22)

Corroboration: the authority-law worktree already runs its own triage —
`ping-runtime/orchestration/dormant_classifications/`: 455 files classified
(165 migrate / 250 needs_review / 39 keep_dormant, 0 high-confidence deletions,
63 resurrection candidates). My independent importer-tracing agrees with its
"dependent_modules: 0" findings where I checked (e.g. approval_authority).

## DORMANT / LEGACY systems

- **Mem0** — vendored under constitutional-compiler/dist/vendor/mem0 in the OLDER family only
  (187 refs); ABSENT from primary. Dormant/legacy dependency surface.
- **Older-family runtime** (constitutional-compiler/, workers/canonical/*) — superseded in the
  newer family by ping-runtime/ + runtime/kernel/. Still alive in 5 worktrees on the 5b102c66 line.
- **calm-garden branch** (origin/opencode/calm-garden et al., frozen 2026-07-05) — superseded ancestor; see 04-calm-garden.md.
- **Root `replay_worker.py` / `witness_worker.py`** — legacy duplicates of workers/*.py (no importers).
- **`gateway/artifact_authority.js`** (pure-contract variant) — superseded by execution/artifact_authorities.js.
- **PatchAuthority v1** — superseded by v2 (both currently unwired).
- **ObservationAuthority (JS)** — implemented in older family (gateway/observation_authority.js),
  GONE from primary (only doc/log mentions). The py lane has workers/observation_worker.py (live).
- **`ping-runtime/orchestration/worker_registry.js`** (LLM persona catalog) — zero code importers; dormant.
- **`runtime/kernel/workers/worker-registry.ts`** — zero TS importers; dormant.

## ORPHANED BUT VALUABLE (architecturally useful, disconnected)

1. **ApprovalAuthority** (gateway/approval_authority.js, 379 lines) — ORPHANED BUT VALUABLE.
   Human approval gates are a real, unmet need in the current live path (nothing in the
   ExecutionEngine chain gates on human approval). authority-law triage: authority_score 80,
   recommendation "migrate". → CONVERGENCE CANDIDATE: wire into mission execution.
2. **runtime/kernel/workers/worker-registry.ts** (74 lines) — ORPHANED BUT VALUABLE.
   Cleanest worker-registry design of the three (Map + capability index + CanonicalClock).
   → CONVERGENCE CANDIDATE: adopt as THE WorkerRegistry, retire the other two.
3. **runtime/constitutional/src/* (Patch 7B layer)** — CONVERGENCE CANDIDATE (newest, intended future):
   hash-authority.ts, identity-authority.ts, time-authority.ts, ping-canonical-envelope.ts,
   ping-object-kernel.ts, ping-projector.ts, ping-feed-projection.ts. Implemented, tested
   (identity-authority.test.ts, patch-7b-canonical.test.ts...), but only wired to index.ts + tests.
   This is where the team is already converging — do not reinvent.
4. **CommitAuthority** (gateway/commit_authority.js, 307) — ORPHANED (dormant); commit-gating
   logic may be valuable if merge/commit flows need it. Classify: keep-dormant / review.
5. **PatchAuthority v2** (781) — ORPHANED (dormant); patch application is core to FYD's future
   (typed SiteSpec patches). → CONVERGENCE CANDIDATE for the FYD lane, not dead code.
6. **CapabilityAuthority (TS)** — ORPHANED/UNWIRED; newest-layer piece, keep as convergence target.
7. **FilesystemAuthority** — semi-live (harness only); file-object compilation is needed by
   repo archaeology. Keep.

## SUPERSEDED (do not resurrect)

- calm-garden content (ancestor of current orchestration tree; all its concepts survive in evolved form)
- Mem0 vendored tree, older-family constitutional-compiler runtime, root py worker copies,
  gateway/artifact_authority.js, PatchAuthority v1.

## DANGEROUS (active harm if left)

- **D2 WorkerRegistry naming collision** — three different things, one name; a future importer
  will grab the wrong one. Rename (2) to PersonaCatalog/AuditorPersonas or delete.
- **D1 OllamaAdapter ×4** — provider behavior divergence risk; pin the live one (ollama_provider).
- **113 gateway/*_authority.js files** — authority sprawl is the underlying disease; the
  dormant_classifications triage (165 migrate / 250 needs_review) is the treatment in progress.
- **SignatureAuthority** — claimed in docs, zero implementation. Either implement or stop claiming.

## DEAD (no value)

- /tmp/bisect-eval006 worktree entry (prunable, gitdir dangling).
- `Codex` / `Hermes` as capabilities — never existed (doc string / User-Agent only).
- AcquisitionManager, HumanDecision, WorkspaceRegistry, ProjectMem — never existed in any worktree.

## Components another worktree may be about to reinvent — CALL-OUTS

1. **Another lane is converging identity** — runtime/constitutional/src/identity-authority.ts
   (+ hash-authority.ts, Patch 7B, 2026-09-21) already exists. Any new "canonical identity"
   work should build on it, not start over.
2. **Worker registry** — runtime/kernel/workers/worker-registry.ts already IS the clean design;
   do not write a fourth.
3. **Projection** — runtime/constitutional/src/ping-projector.ts + ping-feed-projection.ts exist
   (unwired); the py projection_worker.py is live. A new projection system would be the third.
4. **Patch application** — gateway/patch_authority_v2.js exists (dormant); FYD's typed-patch
   future should evaluate it before building new.
5. **Human approval gates** — gateway/approval_authority.js exists (dormant); wire it instead
   of building new.
6. **Temporal durable execution** — ping-runtime/temporal/ (activities + workflows) exists;
   calm-garden's gateway/temporal_authority.js did NOT survive — check whether anything the
   old authority did is still needed before reinventing.
7. **calm-garden-only files absent from primary**: gateway/mcp_registry.js,
   gateway/capability_scheduler.js — verify the needs are covered elsewhere (MCP registry
   especially) before rebuilding.
