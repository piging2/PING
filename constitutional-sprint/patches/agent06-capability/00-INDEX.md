# Agent 06 (capability + security) — patch/proposal index

Date: 2026-09-24 UTC. Role: AGENT 06, CAPABILITY + SECURITY.
Writer-ownership rule read: ~/workspace/constitutional-sprint/WRITER-OWNERSHIP.md.

Owned paths (sprint worktree only): capabilities/, auth, gate.ts, RBAC, JWT, tenant.
- /home/nolan/ping: PROPOSE ONLY, always. Nothing applied there.
- Sprint worktree /home/nolan/projects/ping-constitutional: apply only in owned
  paths, only unambiguous-evidence corrections, smallest safe patch + regression
  test, NO commits. Nothing met the apply bar this session.

## Proposals (WHY -> EVIDENCE -> MINIMUM CHANGE -> TEST -> RESULT)

| # | File | Target | Status | Dependency |
|---|------|--------|--------|------------|
| core-01 | core-01-object_updated-controller-check.md | /home/nolan/ping gateway/social_ingest_adapter.js normalizeObjectUpdated | PROPOSED (core = propose-only) | Agent 20 conflict check; coordinator decision |
| core-02 | core-02-events-direct-branch.md | /home/nolan/ping gateway/routes/events.js direct canonical-shape branch | PROPOSED (core = propose-only) | agent01 (event append path); Agent 20 conflict check |
| adapter-01 | adapter-01-submitProposal-object_create.md | ping-constitutional src/lib/ping/ping-object-reader.ts submitProposal | EVALUATED, no patch proposed | agent01 (event append path) owns the file |
| adapter-02 | adapter-02-fyd-projection-private-visibility.md | ping-constitutional src/app/api/fyd/projection/route.ts | EVALUATED, no patch applied (ambiguous intent) | agent04 (projection/derived-data path) owns the file |

## Why no patch was applied

1. The two core findings are in /home/nolan/ping: propose-only by rule.
2. In my owned adapter paths (capabilities/, auth, gate.ts, RBAC, JWT, tenant) no
   unambiguous-evidence correction was found:
   - grants.ts: planning grants behave as documented; missing publish/message
     grants are design, not a bug.
   - fyd/owner-mode/gate.ts Host-header trust: F3, dormant-by-design; the fix is
     design-level (connection-derived host), not unambiguous.
   - fyd/identity OIDC: rigorous verifier, dormant until real credentials exist.
   - lib/ping/session.ts unsigned cookie: documented dev-only, grants nothing.
3. The two adapter findings sit in other agents' owned paths, so PROPOSE/EVALUATE
   ONLY with dependency logs, per the writer-ownership rule.

COMMITS CREATED: NONE. No worktree file was modified by Agent 06.
