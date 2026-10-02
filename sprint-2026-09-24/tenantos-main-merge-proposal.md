# TenantOS Main-Merge Proposal — REVIEW REQUIRED (not a merge)

Date: 2026-09-24 ~19:30 MDT. Author: Pigi (FYD sprint execution worker).
Status: PROPOSAL ONLY. Nothing was merged into main/master. Nothing was pushed.

## 1. What is proposed

Branch `fyd/tenantos-integration-2026-09-24` in `/home/nolan/ping`, tip `e0d2868e2`.
It contains exactly two cherry-picked commits on top of `refactor/runtime-authority-convergence @ cc6856c3b`:

| # | Cherry-pick (new SHA <- lane SHA) | Subject | Rationale |
|---|---|---|---|
| 1 | `1d5493f8e` <- `c99e1ff36` | security(p1): reject unbound tenant namespace overrides at the canonical ingress | The ingress-layer piece of TenantOS. Closes the proven 2026-09-23 spoof hole: any caller of POST /ingest could emit into any `tenant::<victim>` namespace with only a format check. Adds `ping-runtime/canonicalization/namespace_binding.js` (single allow/deny authority; "requested wins iff bound"), rewires `CanonicalizationService.resolveNamespace/authorizeNamespace` to delegate to it, adds hostile suite `gateway/test_tenant_spoof_ingress.js` (16 tests), updates `gateway/test_ingest_boundary.js`. |
| 2 | `e0d2868e2` <- `db9f34588` | security(p1): route all runtime Qdrant construction through ProjectionAuthority | Consolidates the 5 Python runtime worker construction sites (`runtime/kernel/workers/qdrant_projection_worker.py`, `runtime/projection_worker/constitutional_projection_worker.py`, `create_constitutional_memory_collection.py`, `rebuild_certification.py`, `runtime/retrieval/retrieval_service.py`) behind `ProjectionAuthority.get_client()` — one owned construction site instead of five ad-hoc clients. |

Both diffs were read in full before picking (no blind cherry-pick). Both applied with zero conflicts.
Deliberately excluded: `tools/fyd-site-projection/emit-overlay.py` (+77, FYD-037) — the lane left it as a separate unit; it stays on its own branch.

## 2. Base deviation (evidence, not preference)

The brief said "off the runtime repo's canonical branch." I based the branch on
`refactor/runtime-authority-convergence @ cc6856c3b` instead of `main @ 5b102c66`, because
`main` cannot host these commits:

- `main` (2026-09-15) contains NONE of the touched files: `gateway/test_ingest_boundary.js`,
  `ping-runtime/canonicalization/canonicalization_service.js`, `gateway/routes/ingest.js`,
  `runtime/authorities/projection_authority.py`, and all five Python worker files are absent
  from `main`'s tree ("exists on disk, but not in 'main'").
- `git merge-base p1/tenant-spoof-ingress-fix main` returns NOTHING (disconnected histories,
  as the lane reported: 281 commits on the branch vs 9 on origin/main).
- `refactor/runtime-authority-convergence` IS the p1 branch's merge-base; the p1 lane is
  exactly 16 commits on top of it; every touched file's blob SHA on that base is
  byte-identical to the cherry-picks' parents (e.g. canonicalization_service.js
  `9cbaa7bd2f...` on both). The picks applied cleanly.

Consequence: a main-merge of this branch is structurally the same problem as the lane's
blocked merge — it needs your call on strategy (rebase/port vs long-lived integration
branch), not a fast-forward.

## 3. Test evidence (run on the integration branch, worktree /home/nolan/tenanos-int-tree)

- HOSTILE tenant-spoof `gateway/test_tenant_spoof_ingress.js`: **15/15 PASS**,
  `VERDICT: SECURE - Tenant B never selected from untrusted material`. Covers body,
  query string, header, `tenant_id` field, and mission-payload smuggling, plus
  byte-identical legitimate behavior. This is the enforcement bar's core requirement
  (Tenant A principal + tenant_id=B NEVER selects B): GREEN.
- `gateway/test_ingest_boundary.js`: 22/27. The 5 failures are PRE-EXISTING on the
  pristine base (A/B verified: identical 5 fail at `cc6856c3b` without my picks, so
  zero regressions). Root cause is environmental, not tenant logic:
  `{"status":"error","error":"No persistence available: event not durably stored"}` —
  the harness has no database; canonicalization itself succeeds (namespace resolves,
  envelope builds, hash verifies). All namespace/authorization assertions pass.
- `test_phase_d_namespace.js` 7/7, `test_lease_renewal.js` 7/7, `test_lease_reaping.js` 4/4.
- Python: all 5 changed files `py_compile` clean. JS: `node --check` clean on all
  changed/new files.

## 4. Seven-gate assessment (honest)

| Gate | Verdict | Evidence |
|---|---|---|
| INGRESS | GREEN | Hostile 15/15 on the branch. |
| MISSION | UNCHANGED | Picks touch no mission code. Single mission authority proven by AGENT 09 on this base. Not re-tested here. |
| WORKER | PARTIAL | Python worker Qdrant construction consolidated. Worker runtime tests need qdrant/embedding deps not present here. |
| CAPABILITY | PARTIAL | The binder is the ingress guard. Capability-decision units (093 etc.) live on the companion wave branch. |
| POSTGRES | UNTESTED | No Postgres in this environment (wave-noted). Fencing SQL (103) is on the companion branch. |
| QDRANT | PARTIAL | Python `runtime/*` consolidated via ProjectionAuthority (verified: 5/5 call sites). OPEN gaps below. |
| EVENT PRIVACY | PARTIAL | Namespace bound at ingress, carried on envelope. No cross-tenant read path exercised. |

## 5. Open tenant-isolation gaps (from unit 2's 22-dimension review — in scope, verified live on the branch)

1. **OPEN — no per-tenant parameterization at the vector layer.** `ProjectionAuthority.get_client()`
   reads one global qdrant config (single url + single api_key) and builds one client for
   every caller. There is no tenant -> collection/namespace mapping anywhere in the tree.
2. **OPEN — no authz check at client creation.** Qdrant ACLs are whatever the single api_key
   grants; any holder of the client can read/write any collection.
3. **CLOSED — hostile-green runtime test.** Covered by the c99 suite (15/15, both spoof
   directions exercise the same binding-table code path; `tenant::victim-b` and
   `tenant::other-corp` variants).

Additional finding (mine): direct `QdrantClient`/`new QdrantClient` constructions remain
outside the Python runtime set — the live JS path uses `QdrantAdapter` (thin REST, same
single global key, outside any authority), and `brainos/`, `tools/`, dev scripts, plus
three gateway modules reachable only via the dormant `wiring.js` bootstrap (never called
by `gateway_runtime` per AGENT 09) still construct directly. Not live vulnerabilities,
but any re-activation of a dormant path bypasses the authority. Recorded as residual risk.

Gaps 1 and 2 are NOT safe mechanical fixes: per-tenant vector tenancy (collection-per-tenant
vs payload-filter isolation vs per-tenant keys) is product design with cost and migration
consequences. Per the grill-20 rule I did not invent it; it needs your design call.

## 6. Companion branches (wave units — already integrated by INT-FINAL, 2026-09-24 ~06:30 MDT)

The 10 wave units were integrated before this task started; they were NOT re-applied here
(they live in a different repo tree, `src/tenanos/**` in `/home/nolan/projects/ping` —
porting them across repos would be the mass-port this order forbids):

| Unit | Writer commit | Purpose | Files | State |
|---|---|---|---|---|
| P-20260923-001 | `10ed47b7` | scoped ts-jest config for substrate tests | `src/tenanos/jest.config.cjs` | integrated `56d5f5ab` |
| P-20260923-012 | `eec54a76` | sandbox execution profile registry | `src/tenanos/sandbox/profiles.ts` | integrated `cc90f2ba` |
| P-20260923-089 | `04e420e2` | MemoryCandidate proposal-surface schema | `src/tenanos/memory/MemoryCandidate.schema.json` | integrated `45361109` |
| P-20260923-091 | `b49c9e19` | decision-budget taxonomy + auto-resolvers | 6 files `src/tenanos/decision-budget/` | integrated `beafca12` |
| P-20260923-092 | `6cbd64af` | tenant boundary kit | 5 files `src/tenanos/tenant/` + test | integrated `49b7abf7` |
| P-20260923-095 | `82ed23e6` | run-state authority vocabulary + classifier | 3 files `src/tenanos/run/` | integrated `db80f142` |
| P-20260923-098 | `13f21b59` | memory context-pack assembler | 2 files `src/tenanos/memory/` | integrated `4b183f8e` |
| P-20260923-100 | `3a578131` | gateway bootstrap substrate record | 2 files `src/tenanos/bootstrap/` | integrated `d3821556` |
| P-20260923-103 | `a9d1c9d8` | attempt fencing mechanics | 3 files `src/tenanos/run/` | integrated `218db490` |
| P-20260923-104-105 | `9ca7d043`, `1df0f98c` | Kit webhook HMAC + resource-download auth | 5 files, website repo | WRITTEN only, Nolan-reserved |

Branches: `tenanos-wave/integration @ 51d4a187` (`/home/nolan/projects/ping`),
`tenanos-wave-gateway/integration @ 63ad28388` (`/home/nolan/ping`,
units 082-087, 088, 096, 097, 099, 102, 109, 110).
Relationships: 001 is the test foundation for all; 095/103 are layered on the same
`run/` seam (095 owns vocabulary/transitions, 103 adds fencing — compatible per the
coordinator's 002/095 seam decision); 092 (TS tenant kit) and the p1 `namespace_binding.js`
are complementary across repos/layers, not duplicates (different languages, different repos;
the wave's wrong-repo architectural finding still awaits your adjudication).
No conflicts among the 10 (the wave already rejected 010 as a non-conforming duplicate of
090 and 081 as out-of-scope; neither is in this set).

## 7. Locked boundary: PASS

TenantOS absorbs none of identity / missions / objects / FYD / events / capabilities /
social / agents. All 9 integrated wave units are confined to `src/tenanos/**`; the new
`namespace_binding.js` carries an explicit scope comment ("TenantOS answers only 'whose
isolated execution/resource context is this'. This module carries no identity, mission,
object, FYD, event, or capability semantics."); P0A FYD journal identity stays in PING
mission execution, untouched. 089/098 are tenant-scoped memory surfaces (additive schemas),
not absorption of PING memory authority.

## 8. 22-dimension checklist (tenant-isolation class — checked all 22, patched only reached)

Reached and patched: input (untrusted namespace material denied), contract
(authorize/resolve semantics + tests), authority (single binder, no competitor),
identity (operator-map-derived, never caller-derived), persistence (fail-closed on no
persistence), authorization (guard decision), tenant (hostile green), privacy
(namespace on envelope, no PII), observability (400 + reason surfaced), test (new
hostile suite), deployment (nothing live — documented), rollback (revertible picks),
projection (Python construction consolidated), restart (stateless binder; runtime
bindSource registrations are process-memory — operator map is the durable source),
search/vector (gap documented, NOT patched — needs design).
Checked, not reached: transaction, retry, replay, cache, serialization, UI.
Mandatory classes: privacy-hide ok, unknown-effect (5 pre-existing env failures
characterized), secret-leak (no secrets in picks), object-identity (deterministic
logical identity untouched), edge-object (falsy namespace tested byte-identical),
tenant-isolation (core — green), git-ingestion n/a.

## 9. Decisions needed from Nolan (genuine, not routine)

1. **Base/merge strategy.** This branch cannot fast-forward to `main` (disconnected
   histories). Options: (a) hold as the TenantOS integration branch and converge the
   companion wave branches into it later; (b) a deliberate rebase/port program onto a
   modernized main. Your call.
2. **Vector-layer tenancy design** (gaps 1-2): collection-per-tenant vs payload-filter
   isolation vs per-tenant keys. I did not invent this.
3. **104/105** (Kit webhook HMAC, resource-download auth): merge decision is yours —
   they sit in your FYD work area, untouched.
4. **Live proof**: zero live tenants; enforcement is harness-proven only. First live
   tenant + Postgres-backed run is the proof that flips INCOMPLETE to COMPLETE.

## 10. Terminal verdict

**TENANTOS INCOMPLETE** (evidence: ingress hostile gate green 15/15 on
`fyd/tenantos-integration-2026-09-24 @ e0d2868e2`; wave units integrated on companion
branches; but QDRANT/POSTGRES/EVENT-PRIVACY gates not fully green, gaps 1-2 open,
zero live tenants, nothing deployed).
**First remaining gap:** per-tenant parameterization at the vector layer —
`ProjectionAuthority.get_client()` serves one global Qdrant config to all tenants,
so a second tenant's vectors would land in shared collections with no isolation.

---
No pushes made. No main/master commits. p1 lane branch and worktree untouched.
Worktree for this branch: `/home/nolan/tenanos-int-tree` (Pig).
