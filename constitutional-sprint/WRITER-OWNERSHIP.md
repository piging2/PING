# WRITER OWNERSHIP REGISTRY — one writer per mutable semantic unit
Enforced by the coordinator; watched by Agent 20 (competing-proposal detection).

## Rules
1. Only the owning numbered agent may APPLY a patch to files in its paths, and only in /home/nolan/projects/ping-constitutional (isolated sprint worktree, NO commits).
2. Before applying: proposal (diff + WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT) must exist under patches/<agent>/, and this registry + Agent 20's competing-proposals must show no conflict.
3. /home/nolan/ping (live runtime): NO agent applies. Propose-only, always.
4. Fleet workers (semantic/object-graph/security/observability): PROPOSE ONLY, never apply.
5. Never create a second canonical authority/database/replay authority/execution router, or an EventAuthorityV2.

## Ownership map (sprint worktree paths)
- agent01-event-authority: event ingest/append/read paths (adapter src/lib/events*, src/app/api/**/event*, core gateway/event*, ping-runtime/events/*)
- agent02-witness-evidence: witness/attestation/verification paths (core witness*, adapter *attest*, *claims*/verify)
- agent03-replay: replay/lineage paths (core replay*, lineage*, adapter replay consumers)
- agent04-projection-retrieval: projection/derived-data paths (dump-projection, projectors, Qdrant writers, materialized views)
- agent05-identity: identity/hash/canonicalization paths (fyd/identity, gateway identities, canonicalization)
- agent06-capability: capability/auth/principal paths (capabilities/, auth, gate.ts, RBAC, JWT, tenant)
- agent07-workspace: filesystem/path/workspace-registry paths
- agent08-git: patch/commit pipeline — AUDIT ONLY, never self-applies
- agent12-observability: health/stats/queue/recovery paths
- agent13-postgres: migrations/SQL/schema (live DB: propose-only)
- agent14-semantic: embedding/index/retrieval paths
- transition/execution-core/execution-adapter/schema/seams/fyd-path investigators: own their finding domains; patch only owned paths above that intersect, else propose.
