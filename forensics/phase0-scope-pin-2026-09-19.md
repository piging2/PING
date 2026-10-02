# PHASE 0: Scope Pin — event authority convergence (2026-09-19)

Pinned before any mutation. This is the only worktree/branch that convergence implementation may touch.

- WORKTREE: /home/nolan/worktrees/constitutional-convergence-authority-law (isolated; created 2026-09-19 ~06:13 MDT via git worktree add)
- BRANCH: constitutional-convergence-authority-law (new branch)
- HEAD: 98ef51c9c (W-1A tip; includes 98ef51c9cd8f96e115374e81b65f049b38b62469; W-1A preserved, not discarded)
- BASELINE ANCESTORS: 84da2d40c (W-1A start HEAD), ce3f8687c5 (P0 event sequence/replay cert), main 5b102c66 (untouched, no merge target authorized)
- DIRTY FILES in scope worktree: NONE. Clean checkout. No mutations made during Phase 0 or Phase 1.

## Target files (anticipated; NOT YET MUTATED)

- ping-runtime/business/review_authority.js (migration seam)
- ping-runtime/business/project_authority.js (migration seam)
- ping-runtime/business/customer_authority.js (migration seam)
- ping-runtime/business/ai_workspace_authority.js (migration seam; currently broken as an envelope writer)
- gateway/canonical_event_envelope.js (preserve intelligently; narrower role)
- ping-runtime/events/legacy_ingress_adapter.js (preserve; remove reminting without removing the bridge)
- gateway/generated/event_registry.json (governance registry; dotted HPP types absent)
- New: durable law doc + invariant tests under tests/event-authority-convergence/

## Reference only (do not change lightly)

- ping-runtime/events/unified_event_runtime.js (certified P0 path; UER is the MAIN constitutional runtime Event Authority)
- ping-runtime/events/event_governance.js

## Unrelated WIP (preserve byte-for-byte; lives in the dirty worktree, never touch from this scope)

In /home/nolan/worktrees/constitutional-convergence @ 98ef51c9c:
- modified CERTIFICATION.md
- modified CONTRADICTIONS.md
- modified evals/constitutional-runtime/EVAL-006_double_completion_prevention.js
- untracked evidence/
- untracked tests/mc1-legacy-ingress/

## Other worktrees (do not mutate, do not clean, do not delete)

- /home/nolan/worktrees/constitutional-convergence (dirty convergence worktree @ 98ef51c9c)
- /home/nolan/ping (canonical repo; feature/approval-effect-identity @ 88c9651be)
- /home/nolan/worktrees/ping-oracle-deploy (oracle/deploy-2026-09-18; untouched without Nolan's word)

## Expected tests

New (to be written in later phases): single SQL writer per table; no reachable canonical_events -> mission/replay/witness consumer; producer migration seam contract; explicit cross-reference resolvers; idempotent convergence (retry same identity); collision fail-closed; exactly-once mission trigger.

Existing baselines that must stay green: tests/event-sequence-replay/sequence_replay_cert.js (73/73 cert; 70/0/1 explained as environmental T5 block); w1a-invariant-harness.js (18/0); constitutional eval (85/0); EVAL-010 (34/0); witness negative-path (9/0).

## Git safety (absolute)

Never git add -A, git reset --hard, git clean, git restore ., force push, or history rewrite. No deletion of historical implementations, legacy tables, or valuable history. Additive/reversible convergence only. Preserve the unrelated WIP above untouched.

## Governing laws for this scope

- Permanent PING law: "Refactor authority, preserve mechanism."
- Primary decision: UnifiedEventRuntime is the MAIN constitutional runtime Event Authority.
- Target: one decision one owner; one logical event one canonical identity; one authoritative runtime commit; many preserved representations/adapters/projections.
- Preservation law: preserve aggressively; refactor authorities; delete only proven redundant reachability, never valuable implementation history.
- Merge law: unit green is not integration green; merge -> integrated tests -> push -> remote SHA verification; fix forward or revert cleanly, never conceal.
- No naive dual write: one authoritative commit; the secondary representation is transactionally derived, durably derived with retry-same-identity, or rebuildable from authoritative history. One consistency model, tested.
