# Tenant Boundary: Inventory, Contract, and Sizing Verdict

**Lane:** T (tenant-boundary) | **task_id:** lane-t-tenant-boundary | **tenant_id:** fyd-platform
**Input digest:** contract v0.3 @ repo HEAD 0842872e (Pig branch `fyd/builder-composition`; the task envelope named `fyd/sitespec-generator`, but HEAD matches the digest, so the digest is authoritative)
**Repo access:** read-only via `pigwsl-run.sh` bridge. Nothing written to the repo.

## Self-grade: SUCCEEDED

Inventory covers every tenant-keyed store found in the FYD composition runtime (8 stores plus 2 privileged seams). The contract module and 4 adversarial test files are repo-ready in `tests/` (landing: copy `tests/*` into `src/fyd/tenant/`, run `npx jest --config src/fyd/tenant/jest.config.cjs`). The sizing verdict is honest about what is file-based.

## 1. Inventory: every store the composition system reads or writes

Tenant key today = `siteId` everywhere (one site per business). There is no separate tenant id; no store carries a tenant column or namespaced row set.

| # | Store | Code | Physical backend | Tenant key today | Enforcement today | Cross-tenant risk |
|---|-------|------|------------------|------------------|-------------------|-------------------|
| 1 | Projection read seam | `src/fyd/data/ping-object-source.ts` | File: `FYD_PROJECTION_DIR/<siteId>.json` | `siteId` (filename) | Path-level filename + crypto: `meta.siteId` must match request, sha256 `graphDigest` verified, missing/tampered fails closed | LOW for integrity, MEDIUM for isolation: any caller can request any known siteId. The ask API and `/sites/[siteId]` routes take siteId from the request. Public-object reads are by design; the risk is an agent working for A being handed B's siteId. |
| 2 | Owner overrides | `src/fyd/object/owner-store.ts` + `owner-events.ts` | File: `data/fyd-owner/<objectId>.json` (append-only event log) | `objectId`, which at the owner layer IS the siteId (`applyOwnerFieldCorrections(graph, siteId)` calls `readOverrides(siteId)`; `loadObjectView(slug)` calls `readOverrides(slug)`) | Path-level only: regex `^[a-z0-9-]+$` kills traversal, nothing binds caller to tenant | HIGH: `POST /api/fyd/objects/[objectId]/overrides` takes objectId from the URL. No auth on the route (documented DEMO/DEV). Any caller can read or mutate any tenant's owner state today. |
| 3 | Claim store | `src/fyd/claim/store.ts` | File: `data/fyd-claims/<resourceId>.json` (atomic tmp+rename writes) | `resourceId` (validated `^[a-z0-9-]{1,64}$`, `kind: "fyd-site"`) | Path-level only; reads fail honest (null on missing/invalid) | MEDIUM: resourceId carries no tenant component; nothing stops A from reading/writing B's claim record. |
| 4 | Follows | `src/fyd/object/follows.ts` | File: `data/fyd-follows/local.json` (ONE shared file) | NONE | Absent. Single global file keyed by siteId, single demo viewer "local" | HIGH (by design for demo): all tenants' follows coexist in one file with no tenant keying at all. Reads/writes are only gated on "id is a known site". |
| 5 | Likes | `src/fyd/object/likes.ts` | File: `data/fyd-likes/local.json` (ONE shared file) | NONE | Absent, same as follows | HIGH (by design for demo), same as follows. |
| 6 | Identity bindings | `src/fyd/identity/file-store.ts` | File: `data/fyd-identity/accounts/*.json` | `providerAccountId` (per-provider-account, no tenant) | Path-level (`accountFileKey`); self-check `parsed.providerAccountId === requested` | MEDIUM: bindings are keyed by provider account, not tenant. Cross-tenant confusion requires the caller to know another account id, but nothing structurally binds a binding to a tenant. |
| 7 | Dev key custody | `src/fyd/social/key-custody.ts` | File: `FYD_DEV_KEY_DIR/<identityId>/private.pem` | `identityId` (`^identity_[0-9a-f]{16}$`) | Filesystem: dir 0700, key 0600, `safeIdentityDir` rejects traversal | LOW: the strongest seam in the runtime. Per-identity dirs, strict id validation, private key never leaves the server. This is the model for "privileged-column protection" in a file world. |
| 8 | Session | `src/fyd/identity/session.ts` | Signed cookie (`FYD_SESSION_SECRET`) | session-bound, not tenant-keyed | Crypto (HMAC via secret) | LOW for the boundary: sessions are the future carrier of the tenant context, not tenant state themselves. |
| 9 | Ask API | `src/app/api/fyd/ask/route.ts` -> `answerAskFyd` -> `getSiteBundle(siteId)` | siteId from POST body | `siteId` (request-supplied) | Path-level + digest via the projection seam; mode "visitor" = public objects only | MEDIUM: stateless and siteId-keyed, so leakage is caller mixing siteIds, not store-level. The boundary must live at the entry point. |
| 10 | Customize writes | `FYD_CUSTOMIZE_GATEWAY_URL` | Remote gateway (not local files) | gateway-owned | Out of this runtime's scope | UNKNOWN: the write authority for customize lives behind the gateway; the tenant boundary there must be audited in the gateway lane, not here. |

Also checked and found nothing tenant-keyed: `src/app/build/[siteId]/page.tsx` (build-time generator), the two demo site pages, `src/fyd/media/site-bundle.ts` (derived from the seam), `src/fyd/object/view.ts` (derived). No background workers or cron paths exist in the FYD composition runtime (the one "worker" grep hit is a doc reference to PING canonical workers). No Postgres, `pg`, or Prisma anywhere in the FYD runtime (`package.json` has none).

## 2. The tenant-context contract

Delivered as `tests/tenant-context.ts` (repo-ready; land at `src/fyd/tenant/tenant-context.ts`).

- `TenantContext = { tenantId, actorId? }`. tenantId matches the siteId convention today; the contract does not care whether it later becomes a distinct id.
- `requireTenantContext(ctx)`: every read/write path calls this first. Absent/malformed context throws `TenantContextError(TENANT_CONTEXT_MISSING)`. Nothing executes without it.
- `assertTenantKey(ctx, key)`: the key being read/written MUST equal the acting tenant's id, else `TenantContextError(CROSS_TENANT_REFERENCE)`. This is the REJECTED-never-empty rule: the caller gets a typed exception, never null, never `[]`, never a silent fallback.
- `tenantScopedDir(baseDir, tenantId)`: tenant-scoped path construction with id validation (also kills traversal). Stores with one file per tenant must build paths through here.
- `withTenantContext(ctx, fn)`: binds context to one execution scope; `fn` never runs when the context is missing. This is what makes worker paths fail closed.

The contract is deliberately the file-system analog of Nolan's five patterns: tenant_id in every key, refuse-before-I/O as the RLS-force analog, `withTenantContext` as the transaction-local analog, `safeIdentityDir`/`tenantScopedDir` as privileged-column protection, and context-or-no-run as service-role separation.

**What the contract does NOT yet do (named honestly):** it is a boundary module plus test-pinned wrappers, not yet wired into the store signatures. The follow-up work is mechanical: thread `TenantContext` through `readOverrides`/`applyOwnerCommand`/`getPingObjectGraph(Sync)`/`getSiteBundle`/`answerAskFyd` call sites (routes pass the context derived from the session), and move `fyd-follows`/`fyd-likes` to per-tenant files (`<tenantId>.json` instead of one shared `local.json`).

## 3. Adversarial tests

In `tests/__tests__/` (repo-ready; land with the tree into `src/fyd/tenant/__tests__/`). Run: `npx jest --config src/fyd/tenant/jest.config.cjs` from the repo root. All tests use temp dirs via the `FYD_*_DIR` env overrides the stores already support; no repo files are touched.

| Test file | Bar from the task | What it proves |
|-----------|-------------------|----------------|
| `a-owner.test.ts` | (a) A cannot read/write B's owner overrides | BASELINE GAP pinned: unscoped `readOverrides("site-b")` succeeds today (the gap the contract closes). Scoped wrappers refuse A's read AND write of B with typed `CROSS_TENANT_REFERENCE`; the refusal message leaks none of B's data; B's value is untouched; no file is created for the refused key. Same-tenant read/write round-trips. Null context fails closed. |
| `b-projection.test.ts` | (b) seam keyed A cannot serve B's graph | Scoped load refuses B before any file I/O. Seam integrity checks documented: `meta.siteId` mismatch refused, tampered `graphDigest` refused, missing projection throws (fails closed, never null/empty). Same-tenant load works. |
| `c-ask.test.ts` | (c) ask with siteId=A cannot receive B's context | Scoped ask refuses B and the bundle loader is NEVER invoked (no B context loaded, composed, or handed to the answerer). Same-tenant request forwards exactly A's siteId. Null context fails closed. |
| `d-worker.test.ts` | (d) context-less worker path fails closed | `withTenantContext` never executes the wrapped path on undefined/null/empty/malformed context (spy not called, typed `TENANT_CONTEXT_MISSING`). A simulated worker job over the real owner store refuses context-less runs and writes nothing. `tenantScopedDir` refuses traversal and bad ids. |

## 4. HONEST SIZING VERDICT

**The composition system's runtime stores are file-based, not Postgres.** Verified: `package.json` has no `pg`/Prisma/postgres dependency; every FYD store under `src/fyd` is JSON files under `data/`; the PING journal's Postgres is a different plane (the dump writes projections to files, and the website runtime never touches the database).

**What "database-level enforcement" means in this file-based runtime (the honest reading):**

1. Explicit tenant-context plumbing: every store function takes a `TenantContext` (or is wrapped), enforced by `requireTenantContext` before I/O. This is the deliverable of this lane.
2. Path namespacing: one subdirectory or file per tenant (`data/fyd-owner/<tenantId>.json` already behaves this way since objectId == siteId; `fyd-follows`/`fyd-likes` must move from one shared `local.json` to per-tenant files; claim `resourceId` should gain a tenant prefix or a `tenantId` field verified on read).
3. Per-record tenant attestation: every tenant-owned file carries its tenant id inside the JSON and the reader verifies it matches the context (the projection seam already does this with `meta.siteId`; extend the pattern to owner logs, claims, follows/likes).
4. Privileged-path protection: key material stays in 0700/0600 per-identity dirs (already true); all path construction goes through validated join helpers.
5. The adversarial tests above run in CI, so the boundary is executable evidence, not a comment.

That is the complete, non-hand-waved meaning of the requirement against today's architecture. It closes the real attack surface: a caller or agent acting for A cannot read, write, or be handed B's state, and a context-less worker cannot run.

**What a real Postgres RLS migration would cost:** new Postgres instance for the FYD runtime (none exists); schema design for 8 stores (tenant_id on every tenant-owned table, RLS policies with FORCE, `SET LOCAL app.tenant_id` per transaction, service-role vs app-role separation, privileged columns with column-level grants); data migration from JSON files including the append-only owner event logs; backup/restore and per-tenant export/delete semantics (the FYD product law requires customer data separable/exportable/deletable, which RLS alone does not give you); rewriting every store module plus the digest-verification seam; deployment and secret management. Realistic cost: a dedicated lane-sprint (multiple days), touching every store and the deploy plane, with genuine collision risk against Builder-1's concurrent composition work.

**Recommendation: NOT in this sprint.** Do the file-system analog now (contract + per-tenant path namespacing + record attestation + these adversarial tests in CI). Gate the Postgres RLS migration behind two preconditions: (1) a real multi-tenant production deployment where file-per-tenant stops being sufficient (concurrent writers, per-tenant backup/restore, or row counts that make file I/O the bottleneck), and (2) a Postgres instance provisioned for the FYD runtime plane. Migrating to RLS before either precondition is met buys process theater, not security: the actual boundary violations possible today are caller-level, and the contract closes them.

## 5. Unknowns and open follow-ups

- **Customize gateway tenant boundary (UNKNOWN):** owner writes through `FYD_CUSTOMIZE_GATEWAY_URL` leave this runtime; the gateway's tenant enforcement was not audited here and must be, in the gateway lane.
- **Follows/likes are demo-shaped:** the single shared `local.json` with one global "local" viewer is documented demo scaffolding. Per-tenant files are the minimal fix; real per-user identity is a separate gate (the store headers say so themselves).
- **tenantId == siteId is an assumption:** the contract treats them as the same string today. If tenants later own multiple sites, the key comparison in `assertTenantKey` needs a tenant-to-sites mapping instead of string equality. The contract is written so that change is localized.
- **Tests not executed:** the suite is written repo-ready but was not run against the repo (read-only lane, zero collision tolerance with Builder-1). First run after landing should be witnessed; any assertion that fails against the real modules must be fixed in the modules, not by weakening the test.
- **Branch note:** the envelope named branch `fyd/sitespec-generator`; the Pig checkout is `fyd/builder-composition` at the digest-matching HEAD `0842872e`. Inventory was taken against the digest-authoritative state.
