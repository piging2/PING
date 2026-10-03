# Tenant / Identity Semantic-Boundary Falsification Report

Date: 2026-10-02 ~18:05 MDT
Lane: tenant/identity semantic-boundary falsifier (read-only)
Directive: ~/workspace/directives/2026-10-02-ping-ping2-owner-hold-authority.md
Constitutional rule under test: NEVER let `tenant == identity == user == account == organization` become an accidental invariant.

## 1. Roots actually searched

- `~/workspace` (the operational PING tree; 504 top-level entries; git repo at 64cfc9c). PRIMARY.
- `~/worktrees/*` (audit-beyond-backlog-2026-09-19, fyd-write-boundary, gap1-F2-absorb-floats, mc-budget-repair, mc-pass-migration-proof, phase1-approval-door, refalsify-budget, track-b): spot-checked; they are clones of the same tree or small task trees, no separate PING source.
- `~/workspace/harvest/`: exists; it is a dedup-candidate tracker, not source. No identity code.
- Candidate dirs `runtime/`, `ping-runtime/`, `CascadeProjects/`, `gateway/`, `database/`: DO NOT EXIST as top-level dirs in this tree. (The 8-way identity forensic at commit 701f217 references `runtime/...` paths from an earlier tree state; surviving code lives under `transfer/7b/build`, `ce002`, `tenanos-wave`, `fyd-lane`, `constitutional-sprint`, `fyd/`.)
- `/home/nolan/projects/piging2-harvest`: DOES NOT EXIST in this sandbox (Pig-side repo, not mounted).
- Git history: `git log --grep=identity` reviewed; commit 701f217 (8-way identity forensic + IDENTITY-FORENSIC.md) read in full.
- NOT checked (honest gap): full walk of all old branches; Pig-local repos. Verdicts below rest on the checked-in tree only.

## 2. Per concept-pair verdicts

### tenant vs identity: SEPARATE (with one documented OVERLAPPING-STORAGE-ONLY zone)

The falsifier could NOT prove a constitutional equation of tenant and identity. Every layer that carries both keeps them as distinct fields:

- `fyd-lane/builder/staging/tenant/tenant-context.ts` (TenantContext interface): `tenantId: string` + `actorId?: string` as separate fields. Comment: "In the FYD composition runtime today the tenant id IS the site id (one site per business)" and "The authenticated actor the context was issued to, when known. Audit only: authentication alone never grants mutation."
- `tenanos-wave/swarm-01/kit-ts/tenant/tenant-context.ts:46-48`: `tenantId` + `actorId: string | null` separate; `resolveTenantContext` returns `{ tenantId, namespace, actorId }` as three values.
- `constitutional-sprint/repo-mirror/.../overrides/owner-context.ts` (OwnerContext seam): `tenantId` ("The tenant this context acts for (server-verified)") + `actor: OwnerActor` ("The acting owner actor, future-neutral") as separate readonly fields.
- `tenanos-wave/impl/P-20260923-003/src/tenanos/claim/claim.ts:31-40` (ClaimRequest): `tenant_id` (scope) vs `holder` ("This claimant's holder label (worker/scheduler identity)") vs `fencingToken` — three separate params/columns; PRIMARY KEY is `(tenant_id, key)`, holder is not part of identity of the row.
- `tenanos-wave/impl/P-20260923-004/src/tenanos/leases/lease.ts:83`: params `$1 tenant_id, $2 kind, $3 subject_id, $4 holder, $5 fencing_token` — tenant, subject, holder are three distinct columns.
- `transfer/7b/build/runtime/constitutional/src/` (the constitutional identity/event layer): ZERO tenant references. Identity = Ed25519 key-bound (`ping-identity.ts`: "the identity ID binds the display name AND the Ed25519 public key"); objects carry `controller` (actor ID), transitions carry `actor_id`. Tenant does not exist at this layer.
- `ce002/src/mission_scheduler.js` (450 lines): no tenant, no user/actor identity; only "deterministic completion identity" (event-ID determinism).
- Smoking-gun search for `actorId: tenantId` / `viewerId: tenantId` / `actor = tenantId` across all PING-owned dirs: ZERO hits.

OVERLAPPING-STORAGE-ONLY zone (the one place the overlap is load-bearing): the FYD composition runtime uses tenant == siteId == objectId as its storage/routing key. `fyd-lane/builder/tenant-boundary/TENANT-BOUNDARY.md`: "Tenant key today = `siteId` everywhere (one site per business). There is no separate tenant id; no store carries a tenant column or namespaced row set." And `fyd/product-lane/.../overrides/route.ts:22`: "G4 (tenant from the trusted path): the object id IS the site id." This is documented as a "today" convention, explicitly future-neutral in the TenantContext contract ("the contract does not care whether it later becomes a distinct id"), and the actor remains a separate field everywhere including the bound approval record ("tenant + actor + base digest + patch digest + approval metadata + result digest", route.ts:19). Classification: STORAGE-ONLY, not yet SEMANTIC — but it is the boundary most likely to calcify, hence the recommended fix.

### identity vs user: UNPROVEN (no user model exists)

Searched `transfer/7b/build`, `tenanos-wave/impl`, `constitutional-sprint`, `fyd-lane/builder`, `ce001`, `ce002` for `class User`, `interface User`, `user_id`: ZERO hits. There is no user model to conflate with identity. The closest concepts are `viewerId` (grants.ts, nullable, can be anonymous), `actorId`, `controllerId`, `agentId` — all identity-flavored, none user-flavored. Checked: no equation found; nothing to falsify against.

### user vs account: UNPROVEN (neither model exists)

Zero hits for `account_id`, `Account` model in PING-owned code. The only "account" is `providerAccountId` in the FYD identity binding store (`fyd/product-lane/.../src/fyd/identity/file-store.ts:34-80`) — a per-provider-account key with ZERO tenant references in the file. It is an external-provider namespace, not a SaaS account model, and it is not equated with user (no user model) or tenant (no tenant column; TENANT-BOUNDARY.md store #6 notes "nothing structurally binds a binding to a tenant" — a gap, not a conflation).

### account vs organization: UNPROVEN (organization is an object, not an identity)

`organization` appears in PING-owned code only as an OBJECT SCHEMA: `constitutional-sprint/capability/raw/grants.ts:19` (`isSiteCapableSchema`: `"ping.social.business@1" || "ping.social.organization@1"`) and `ping-object-reader.ts:941` (object kind switch: person/business/organization/agent). Organization is a node in the object graph, not an identity/account primitive. This is the CORRECT shape per the directive (richer future identities compose from existing primitives). No equation exists to falsify.

### identity vs device/agent: SEPARATE

- Agent identity is distinct from tenant everywhere: `tenanos-wave/impl/P-20260923-007/src/tenanos/auth_boundary.ts:27-33` — `AuthContext { agentId: string; roles: readonly string[]; credentialPresent: boolean }`; "Agent identity the grant is resolved for." No tenant field.
- `claim.ts` holder = "worker/scheduler identity", separate column from tenant_id.
- `fyd/product-lane/.../src/fyd/owner-mode/capability.ts`: `DemoActor { id: "demo-owner", label: "Demo Owner (seeded, unverified)" }` — "A demo actor: a label, not an identity." `resolveDemoRelationship(siteId, actor)` maps actor to relationship; `evaluateCapability` answers "may this actor perform this operation on this site?" The WHO is the actor, the scope is the siteId. Separate parameters, separate semantics.
- demo-chain.ts:74-75: "the actor recorded on events is the seeded demo actor. The session identity grants nothing" — session, actor, and tenant are three distinct things; the code says so explicitly.
- Device identity: no device model found in PING-owned code (UNPROVEN/absent, not conflated).

## 3. Exact assumptions found

| # | Location | Assumption (plain words) | Class |
|---|----------|--------------------------|-------|
| 1 | `fyd-lane/builder/tenant-boundary/TENANT-BOUNDARY.md` (section 1) | Tenant key today = siteId everywhere (one site per business); no separate tenant id exists in the composition runtime | STORAGE-ONLY (documented "today" convention) |
| 2 | `fyd/product-lane/.../overrides/route.ts:22-27` | The object id IS the site id IS the tenant; tenant comes from the trusted route path; body-supplied tenant claims that disagree are refused | STORAGE-ONLY (routing trust rule, not identity semantics) |
| 3 | `fyd-lane/builder/staging/tenant/tenant-context.ts` (TenantContext) | tenantId and actorId are separate fields; tenant is a scoping key, actor is audit-only and never grants mutation alone | SEPARATE (boundary holds) |
| 4 | `tenanos-wave/swarm-01/kit-ts/tenant/tenant-context.ts:4-11` | Two parallel tenant mechanisms (tenant_id columns; `tenant::<id>` namespaces) with a canonical mapping rule; `core::*` is a valid non-tenant scope | STORAGE-ONLY (namespace normalization) |
| 5 | `tenanos-wave/impl/P-20260923-003/src/tenanos/claim/claim.ts:31-40` | Claim = tenant scope + key + holder (worker/scheduler identity) + fencing token; holder is never the tenant | SEPARATE (boundary holds) |
| 6 | `tenanos-wave/impl/P-20260923-004/src/tenanos/leases/lease.ts:37-48,83` | Lease PK = (tenant_id, kind, subject_id); holder and fencing_token are separate columns | SEPARATE (boundary holds) |
| 7 | `transfer/7b/build/runtime/constitutional/src/ping-identity.ts:14-17` | Identity = controller of an Ed25519 keypair; identity_id binds display_name + public_key; same name + new key = distinct identity | SEPARATE (no tenant concept at this layer at all) |
| 8 | `transfer/7b/build/runtime/constitutional/src/schemas/ping-objects.ts` (PingObject, PingTransition) | Objects have `controller` (actor ID); transitions have `actor_id` ("Who performed the operation"); no tenant/user/account fields | SEPARATE (boundary holds) |
| 9 | `constitutional-sprint/capability/raw/grants.ts:30-52` | Grant subject = viewerId + controllerId + isSite; maintain_site bundle iff viewer == controller of a site-capable object; agents NEVER get publish/message/purchase/advertise/provider/mutate | SEPARATE (WHO is identity IDs; no SaaS roles; user-facing grants explicitly distinguished from executor CapabilityAuthority) |
| 10 | `tenanos-wave/impl/P-20260923-007/src/tenanos/auth_boundary.ts:27-33` | Tool-call authz WHO = agentId + asserted roles/scopes + credential presence; roles are opaque asserted strings, not admin/member | SEPARATE, with note: `roles` is an open-ended string array — the shape permits future SaaS-role collapse if a lane ever fills it with admin/member. No lane does today. |
| 11 | `fyd/product-lane/.../src/fyd/identity/file-store.ts:34-80` | Identity bindings keyed by providerAccountId only; zero tenant references; "nothing structurally binds a binding to a tenant" (TENANT-BOUNDARY.md store #6) | SEPARATE namespaces; GAP (not conflation): a binding is not structurally bound to any tenant |
| 12 | `fyd/product-lane/.../src/fyd/owner-mode/capability.ts:50,74-79` | Demo actor is a constant label, not an identity; session identity grants nothing; capability verdict = actor + relationship + operation | SEPARATE (demo honesty is structural) |
| 13 | `fyd-90h/IDENTITY-FORENSIC.md` (commit 701f217) | The 8 "identity" implementations are NOT 8 identity authorities: deterministic minting (#1/#4/#7), UUIDv7 unique minting (#2), replay session (#5), machine provenance (#6), workflow IDs (#8); provider/external identities live in IdentityClaim objects, "never competing mints" | SEPARATE (namespace discipline proven; none of the 8 is a tenant/user/account identity) |
| 14 | `ce002/src/mission_scheduler.js` | Missions carry no tenant and no user identity; identity at this layer = deterministic completion/event identity only | SEPARATE by absence |

## 4. Capabilities lens: does the WHO stay open?

Against the directive's question (WHO may do WHAT to WHICH OBJECT under WHAT CONSTRAINTS for HOW LONG with WHAT APPROVAL):

- **FYD user-facing grants** (`grants.ts`): WHO = viewerId/controllerId (identity IDs, nullable for anonymous). WHAT = granular grants (`site.read`, `site.propose`, `object.reference`). WHICH OBJECT = target object. CONSTRAINTS = site-capable check, attenuation by default. FOR HOW LONG = NOT ANSWERED (grants are pure functions of viewer+target; no expiry/TTL). APPROVAL = separate propose/approve digest-bound loop (route.ts). No SaaS roles. **Verdict: WHO is open; time-bounding is the missing answer.**
- **Tool-call auth boundary** (`auth_boundary.ts`): WHO = agentId. WHAT = toolId. CONSTRAINTS = live grant re-resolution at call time (TOCTOU-closed). FOR HOW LONG = NOT ANSWERED (no grant TTL in the interface). APPROVAL = n/a (tool calls, not owner actions). **Choke point: `roles: readonly string[]` is the one open-ended field where a future lane could smuggle SaaS roles; nothing constrains its vocabulary today.**
- **Owner capability** (`capability.ts` + `owner-context.ts` seam): WHO = actor (future: verified owner identity). WHAT = OwnerCapability (`owner.correct-fact`, etc.). WHICH OBJECT = siteId/objectId. CONSTRAINTS = relationship kind (controller/none). FOR HOW LONG = NOT ANSWERED. APPROVAL = the propose/approve loop with digest binding; "Approval never confers capability: the capability gate runs on every approve call regardless of tier." **The seam interface is future-neutral by design; the demo implementation binds actor per-tenant 1:1 (`DemoOwnerContext.forTenant`), which is demo scaffolding, not a constitutional equation — but it is the exact shape a lazy production wiring would copy.**
- **Executor CapabilityAuthority** (`tenanos-wave/swarm-10/evidence/...capability-authority.ts`): this is a DIFFERENT capability concept (which worker may run X: inputs/outputs/latency/cost/determinism). grants.ts explicitly warns confusing the two "would be an architectural error." Not an authz WHO at all.

**Summary: the WHO is open everywhere (identity IDs, agent IDs, actor IDs — never admin/member, never tenant-as-subject). The systematic gap is FOR HOW LONG: no capability verdict in any lane carries an expiry, TTL, or delegation window.** That is the missing column for "temporary capability holder" and delegation futures.

## 5. What the falsifier could NOT prove

- No constitutional equation of tenant == identity exists in the checked-in tree. Actively attempted via: field-equality searches, smoking-gun assignment searches (`actorId: tenantId` et al — zero hits), interface reviews, and the 8-way identity forensic.
- No user, account, team, or device identity models exist to be conflated. Their absence is verified, not assumed.
- NOT checked: old branches, full git history walk, Pig-local repos (`/home/nolan/projects/piging2-harvest` not mounted). A pre-convergence branch could contain a conflation this tree no longer has; that is UNPROVEN, not absent.

## 6. HIGHEST-LEVERAGE NEXT FIX (one item)

**Sever the tenant-from-URL derivation at the OwnerContext seam: carry tenant as an explicit session-bound value instead of deriving it from objectId/siteId, and add a boundary test asserting the tenant source and the actor source are never the same value.**

Why this one: assumptions #1 and #2 (tenant == siteId == objectId) are the ONLY load-bearing overlap in the tree. Everything else already keeps tenant and identity separate. Today the overlap is honest STORAGE-ONLY scaffolding, but `createOwnerContext(tenantId)` is called with the route's objectId, and the demo binds the actor per-tenant 1:1 — so the single most likely calcification path is a production wiring that keeps "tenant = whatever the URL says" and "actor = that tenant's owner," quietly turning a routing convenience into `tenant == identity`. TENANT-BOUNDARY.md already names the intended carrier ("sessions are the future carrier of the tenant context, not tenant state themselves" — store #8). Making the seam take tenant from the session (server-verified, independent of the URL) plus a guard test (`tenantId` source != `actorId` source, and a body/URL tenant claim can never become the actor) converts the last structural overlap into an explicit, tested separation — without touching identity semantics, which this lane is forbidden to invent.
