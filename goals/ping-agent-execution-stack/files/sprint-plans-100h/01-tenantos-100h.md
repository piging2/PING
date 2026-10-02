# TenantOS 100-Hour Sprint Plan
## Revised 2026-09-30 ~18:55 MDT under CEO-ORDER-600H-MASTER-DIRECTIVE (binding): READ-ONLY PLANNER, NO CODE

**Status:** plan only. Nothing in this file authorizes a write, a commit, an install, or an execution. Every deliverable below names its semantic owner and the exact mutation surfaces; a writer may only touch those surfaces after the pre-sprint authority-overlap search (AGENTS.md standing law: search the ENTIRE repo INCLUDING ALL WORKTREES for a similar semantic capability overlapping an authority capability, from first principles, before any new sprint work). Nolan forbids em dashes; this plan uses none.

**Program context:** one of six 100-hour verticals over ONE PING semantic/control plane, ordered 2026-09-30 ~18:46 MDT. TenantOS is ONE vertical: it establishes the tenant operating boundary. It is NOT another dashboard, NOT another object store, NOT a parallel tenant model. The other five plans are: Mission Control, ORCA, Website building (FYD), JEV, Tests. The seventh deliverable is the integrated proof; TenantOS contributes its tenant owner, tenant-bound missions, capability-scoped execution, and isolation guarantee to that flow.

**Lifecycle position:** this sprint advances the SOURCE/HUMAN INTENT to OBSERVATION to EVIDENCE to OBJECTS+RELATIONSHIPS segment's tenant boundary and the MISSION/PLAN to ROUTING to EXECUTION to RESULT segment's tenant-scoped authorization. Every other sprint consumes TenantOS's boundary as the trust envelope around the same lifecycle.

---

## 1. PRODUCT ARROW

TenantOS advances the arrow: A TENANT OWNS ITS MEANING AND OPERATES PING SAFELY INSIDE A PROVABLE BOUNDARY. Concretely: one tenant's identity, object graph, evidence, private context, capabilities, missions, and agents are addressable, operable, delegable, and projectable as a coherent tenant world, and that world is provably unreachable from any other tenant's world on the same runtime, while public objects remain publicly projectable exactly per the tenant's visibility policy. The readability-routing insight rides inside this arrow as a constraint, not a feature: every projection (human HTML, agent Markdown/JSON, MCP/WebMCP tools, search documents, social representations) is derived from governed tenant-scoped semantic state, and an agent being able to read a projection never implies permission to act on it.

---

## 2. CURRENT VERIFIED STATE

Grounded in a read-only recon of the Pig-side PING estate on 2026-09-30 (~18:40 MDT). Lane tree: `/home/nolan/projects/ping` at f94bba39. Claims are graded; pig-local evidence outranks remote claims; remote state is UNVERIFIED per Nolan's 2026-09-30 evening recheck (GitHub PING still 81b3248 on main, FYD unavailable through the connected GitHub account, CRX main still 6c4b531).

**Tenant enforcement primitives [PROVEN by direct read in the lane tree]:**
- `src/fyd/tenant/tenant-context.ts`: the TenantContext contract. Typed `TenantContextError` (TENANT_CONTEXT_MISSING / CROSS_TENANT_REFERENCE, thrown never returned), refuse-before-I/O, `withTenantContext`, `tenantScopedDir` / `safeIdentityDir` (privileged paths never raw-interpolated), `TENANT_ID_PATTERN`.
- `src/fyd/tenant/scoped-stores.ts`: sanctioned consumption wrappers over the REAL stores (owner store, PingProjection, Ask FYD visitor-answer, customize overlay). Assert-tenant-key-before-I/O. The underlying stores themselves remain unscoped; these wrappers are the only sanctioned consumption path.
- `src/fyd/tenant/__tests__/`: eight hostile suites (a-owner, b-projection, c-ask, d-worker context-less fail-closed, e-scoped-stores, f-journal-privacy, g-route-isolation, h-crash-window). The d-worker suite proves background paths never execute without context; the f-journal-privacy suite attacks the REAL gateway binary in both directions.
- `tools/fyd-journal-gateway/server.mjs`: real journal gateway. tenant_id REQUIRED and immutable on append, write-side tenant-smuggling fix (body tenant never journaled without the caller proving it; bearer write token), read requires `?tenant=`, `request_id` dedup with `request_id_tenant_conflict` that discloses nothing about the original event, legacy records backfilled in memory only (store file never rewritten).

**Capability / approval / identity [PROVEN by direct read in the lane tree]:**
- `mc-approval/` (`approval_request.py`, `proposal_record.py`, `approval_cli.py` with `--tenant` flag, `tests/test_approval_tenant.py` with 14 hermetic tests): tenant-on-proposal landed in f94bba39. Tenant bound at creation, immutable record field, tenant-scoped dedup and id minting, WAITING-to-APPROVED refuses tenant-less records (typed `tenant_unknown`, no state change), tenant on MC_APPROVAL_REQUESTED. No TenantAuthority was created; the tenant string is carried immutably from the existing operator-provisioned caller registry.
- `src/app/api/mc/_lib/mc-dispatch-identity.ts`: operator-provisioned caller registry at `/home/nolan/workspace/mission-control/dispatch-identities.json` (outside the repo, no secrets in git). Dispatch tenant DERIVED server-side from the `x-mc-caller-key`, never from the body. Registry read per request, so rotation needs no rebuild. Read/parse failure refuses the dispatch fail-closed.
- `src/app/api/mc/_lib/mc-tenant-gate.ts`: read-route tenant gate on the `x-mc-tenant` header (operator view vs tenant view, 400 on malformed with never a fallback to unscoped, 403 `cross_tenant_denied` carrying the requested mission_id ONLY, zero disclosure). Documented in code as anti-accident, NOT anti-deliberate-attacker.
- `src/app/api/mc/dispatch/route.ts:315-316`: server-minted `tenant::<tenant>` namespace with fail-closed `NAMESPACE_RE`.

**Portability / visibility [PROVEN by direct read]:**
- `src/fyd/boundary/data-boundary.ts`: WE OWN ALL INFRASTRUCTURE / THEY OWN THEIR DATA. Customer-owned (identity, facts, media, content, objectGraph, siteSpec, ownerOverrides, evidenceHistory) vs FYD-owned (design system, component registry, pipeline, renderer, derivative cache). `CustomerDataPackage` export/drop, enforced by `data-boundary.test.ts`.
- `src/fyd/object/types.ts`: owner field-level visibility as persistent assertions (`set-address-visibility`, `set-service-visibility`, hide/show/default). Owner intent and visibility policy are separate truths from evidence.

**Capability system, reached [REPORTED by harvest lane 4, which reached the Pig directly via pigwsl-exec and verified against live code; the strongest first-party verification in the harvest sweep]:**
- Operator caller registry (identities 1-4 live, rest denied), digest-bound proposals (exact canonical bytes + sha256), typed approval/denial with event evidence, tenant boundary refusing before I/O with typed REJECTED, v0 credential boundary (agents hold capabilities, executors hold secrets; P0-SECRET-01: 139/139 falsifier, 234/234 selftests). Lane 4's verdict: one proven gap, attenuated delegation (no delegation with attenuation, no operator round trip, no ambient authority).

**Known unknowns and conflicts [graded]:**
- The v0 credential boundary implementation file: [UNKNOWN]. The recon did not locate a `credential-boundary` file under `src/`, `tools/`, or `mc-approval/` in the lane tree. Locate it (likely gateway container or Pig-side broker) before any attenuated-token executor path runs.
- Where the 2026-09-30 P0 capability registry artifact lives: [UNKNOWN]. Harvest Q7; lane 4 searched the Pig and did not find it as a distinct artifact.
- Tenant representations across worktrees: [CONFLICTING]. The lane tree at f94bba39 carries the enforcement code above; sibling worktrees (ping-fyd-converged at 300c9c91, ping-fyd-harvest-wt, ping-askfyd-gold, fyd-family-converge) carry divergent tenant files. The canonical tree per surface is NOT yet established in writing. This is exactly why the directive's first task is archaeology.
- Remote repo state: [UNKNOWN] per Nolan's binding recheck. Never conflate GitHub-visible state with Pig-local evidence.

---

## 3. FIRST BROKEN EDGE

**The two-tenant isolation proof will pass the accidental-violation model and fail the deliberate-attacker model, because `x-mc-tenant` is assert-not-authorize.** `mc-tenant-gate.ts` is explicit in its own comments: it stops accidental cross-tenant reads and fails closed on malformed input, but it is not authorization against a deliberate loopback caller. The sprint's first isolation drill, run against the CURRENT system as a falsifier (hour block 0-10, before any wiring), is expected to show: accidental cases (missing tenant, malformed header, cross-tenant mission fetch with an honest caller) fail closed and journal typed denials, while a deliberate loopback attacker who can set the header reads across the boundary. That failure is the plan working as designed: it converts a prose caveat into a measured invariant gap, and the P0 wiring that closes it (key-authenticated read scopes derived from the operator caller registry, never from a self-asserted header; namespace entitlement checks at ingest, harvest D3) is scoped by the drill's own evidence. Secondary candidates from the prior revision remain live and are folded into section 14: a hop trusting the previous hop's verified flag in the delegation chain (no-transit violation), the CustomerDataPackage carrying dangling evidence references or leaking private values in its public half, and writers patching a non-canonical worktree.

---

## 4. SEMANTIC OWNER

This sprint extends EXISTING authorities and primitives; it invents none.

- **The namespace privacy boundary** (server-minted `tenant::<tenant>` namespace, fail-closed `NAMESPACE_RE` in the dispatch route): the privacy plane the tenant boundary rides on.
- **The operator-provisioned caller registry** (`mc-dispatch-identity.ts`, identities file outside the repo): the identity source tenant strings are carried from. No TenantAuthority, ever.
- **The 403 capability posture** (exact-minimal provisioning, typed denials): the decision point the capability test matrix attacks and the attenuation port extends.
- **Tenant-on-proposal** (landed f94bba39): the immutability contract (tenant bound at creation, never re-derivable from an untrusted source) that the identity chain proof verifies end to end.
- **The existing tenant enforcement code** (`src/fyd/tenant/` contract + scoped wrappers + eight hostile suites, the journal gateway): the sanctioned consumption paths the isolation proof exercises.
- **The UnifiedEventRuntime single writer** (ping_events): the only writer for any new grant/denial vocabulary. No second event spine, no new event table, no new writer.
- **The CustomerDataPackage** (`data-boundary.ts`): the portability seam the tenant-world round-trip extends.

If a needed primitive does not exist among these, the sprint files a written proposal to the owning lane; it does not mint a parallel one.

---

## 5. MUTATION OWNER

**TenantOS OWNS the TENANT CONTRACT.** No other lane mutates it. The tenant contract covers: tenant identity semantics, tenant ownership, the human decision authority mapping (CG-001 machine-observable where appropriate), tenant-scoped object/capability/mission/agent/private-context/projection/evidence/secret-reference scoping rules, the visibility policy seam (FIELD + DEFAULT VISIBILITY + OWNER OVERRIDE), and resource/quota boundary vocabulary.

**READ-ONLY on the other nine shared contracts.** TenantOS reads and proposes; the designated writer merges. Proposals this sprint is likely to file: to the capability contract (attenuation envelope and delegation-chain shape, IF the P0 test matrix confirms the gap; the RFC 8693 chain shape and the no-transit rule), to the mission contract (tenant-carrying fields stay frozen; any TenantOS need the contract cannot express becomes a written request to the Mission Control sprint, not a local patch), to the event transition contract (grant/denial vocabulary IF existing vocabulary cannot express it), to the judgment contract (none expected; JEV reads isolation evidence), to the route/brief/result-finding/SiteSpec/verification-outcome contracts (read-only consumers). The Phase A writer map names the capability-contract writer; until it does, TenantOS merges nothing on that surface.

**Writer law:** max 3-4 writers, one mutation owner per surface. On collision the lower-priority writer stops.

- **W1. Tenant-boundary writer.** Owns `src/fyd/tenant/` (tenant-context.ts, scoped-stores.ts, __tests__/) and `tools/fyd-journal-gateway/`. Delivers the isolation-proof wiring, namespace entitlements at the gateway, the identity chain proof, and the enforcement side of the projection boundary. Must not touch the dispatch identity/registry files (W2) or the data-boundary package (W3).
- **W2. Capability/grant writer.** Owns `mc-approval/` (Python: approval_request.py, proposal_record.py, approval_cli.py, tests/), `src/app/api/mc/_lib/mc-dispatch-identity.ts`, `src/app/api/mc/_lib/mc-tenant-gate.ts`, and the namespace/tenant lines of `src/app/api/mc/dispatch/route.ts`. Delivers the capability test matrix execution, the attenuation port IF the matrix confirms the gap (harvest experiment E2 as designed, not redesigned), namespace entitlements at dispatch (harvest D3), and the grant vocabulary IF the existing vocabulary fails. Additive only on the landed P0 lines; no behavior change to tenant-on-proposal semantics without Nolan.
- **W3. Portability/projection writer.** Owns `src/fyd/boundary/data-boundary.ts` and its tests, the CustomerDataPackage round-trip harness (new files under one clearly named directory, not scattered), and the Mission Control tenant-status cards (projection code only). Must not touch `src/fyd/sitespec`, the renderer, or acquisition.
- **W4. Falsifier (test files only, plus replay runs).** Owns the hostile suites under the existing test trees, the clean-checkout replay runs, and the regression-knowledge records. Read-only on all product code; on a failed proof, W4 files the defect with the owning writer, never patches around them.

**Must not collide with:** the INTELLIGENCE_RESEARCH P0 worker-contract surfaces (mission/worker contract files are read-only); the testing ladder `tests/` + workflows (TenantOS does not redefine test truth and does not add test packages without the inventory check); the FYD worktree (regeneration-path audit is observation plus test files; defects go to the FYD lane as written findings); the other five sprints' active surfaces (TenantOS reads their state for status cards; it does not edit their code).

---

## 6. INPUT CONTRACT

The sprint may start when ALL of the following are true and recorded:

1. **Phase A archaeology is published.** The tenant-representation map (tenant_id, customer_id, owner, actor, workspace, organization, namespace, scope across all repos and worktrees) classifies every representation as canonical, projection, legacy, alias, or accidental duplication. DO NOT MIGRATE UNTIL THIS IS KNOWN. The worktree conflict (lane tree f94bba39 vs ping-fyd-converged 300c9c91 and others) is resolved in writing: one canonical tree per surface.
2. **The pre-sprint authority-overlap search is complete** per AGENTS.md standing law (entire repo including all worktrees, from first principles). The writer map in section 5 is confirmed against its findings.
3. **The tenant contract draft is frozen** and the acceptance tests (section 13) are frozen. No acceptance criterion moves after hour 20.
4. **The capability vocabulary archaeology** (directive Phase A item 5) has named the real capability primitives (`site.read`, `site.propose_change`, `mission.create`, `agent.execute` and their actual restriction axes) so the P0 test matrix tests the REAL system, not assumed names.
5. **The mission contract's tenant-carrying fields are frozen** (INTELLIGENCE_RESEARCH P0). Read-only dependency: TenantOS consumes the contract, never edits it. If the P0 is still converging, work proceeds against the frozen draft and re-verifies at P0 close.
6. **The testing ladder's canonical gate location is known and its baseline is green** on the canonical SHA/environment. New hostile suites measure deltas against truth, not noise.
7. **CG-001's hold list is current** and no tenant-affecting hold is active. Outreach and engagement holds are a separate lane; this sprint starts no external effect.
8. **The v0 credential boundary implementation file is located** (or recorded UNKNOWN with the gap filed to the parent). The P0 capability matrix must know which boundary the executor path sits behind before it mints test grants.

---

## 7. OUTPUT CONTRACT

Good-form statements, each falsifiable. These are what the other five sprints may rely on.

- **To Mission Control:** "Mission Control renders tenant-scoped mission, execution, finding, judgment, proposal, approval, verification, and outcome state for exactly the acting tenant; UNKNOWN renders as UNKNOWN; a projection read never grants an action."
- **To ORCA:** "Every mission ORCA receives carries an immutable tenant field and executes inside a tenant-scoped capability context; a worker launched without tenant context refuses to start; a finding set is attributable to exactly one tenant."
- **To FYD:** "Every public projection FYD renders carries only values the tenant's visibility policy authorizes; a private-context value never reaches a public projection through any path, including SiteSpec regeneration; the export boundary of a tenant world carries no private values in its public half."
- **To JEV:** "JEV can read grant, denial, and isolation evidence for its judgments without receiving execution or mutation authority; judgment never alters a tenant boundary."
- **To Tests:** "Every tenant-isolation invariant has a regression ID with invariant, seed, minimal counterexample, and owning primitive; every minimized failure becomes permanent regression knowledge."
- **To the seventh integrated proof:** "A tenant owner can authorize an ORCA mission, watch it execute inside its tenant boundary, approve its SiteSpec proposal, and see the verified outcome, with Tenant B provably unable to observe or affect any step."

---

## 8. DEPENDENCIES

**On the current program, named with acceptance conditions.**

- **P0 worker-contract seam (INTELLIGENCE_RESEARCH P0).** HARD GATE: the mission contract's tenant-carrying fields frozen and documented (section 6 item 5). The identity chain proof (D4) tests against a stable mission shape; a moving target invalidates the chain proof. Read-only dependency.
- **Testing ladder (T0-T9).** HARD GATE: canonical gate location known, baseline green before hostile suites are written (section 6 item 6). D9's suites graduate into the ladder's higher tiers where they fit; the sprint does not block on T5-T9.
- **FYD compiler.** COORDINATION, not a gate: the hour-100 external-owner test is mandatory and keeps its writers. TenantOS writers do not touch FYD mutation surfaces (`src/fyd/sitespec`, renderer, acquisition); the regeneration-path audit is read-only plus test files.
- **Pig-side runtime reachability.** SUPPORTED (harvest lane 4 precedent via pigwsl-exec). The isolation drill and the E2 experiment run against the real gateway and routes, never against mocks.

---

## 9. HARVEST CANDIDATES

Cited from `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/harvest-map-2026-09-30.md`.

- **Lane 4, attenuated capability tokens (macaroon construction):** ADAPT. Chained-HMAC caveat construction (~200 lines, owned) ported into the capability registry as the grant envelope. Closes the one proven gap in the reached capability system. Do not adopt a macaroon library (fragmented, unmaintained). The P0 test matrix is the trigger: implement only if a concrete matrix case fails on the existing system.
- **Lane 4, RFC 8693 delegation chains:** ADAPT. Optional `delegation: [{principal, capability, at, attenuated_from}]` on the work order; the dispatcher appends its hop; the 403 gate rejects chains with revoked links. Under 100 lines. The audit half of the macaroon grant.
- **Lane 4, MCP 2026-07-28 authorization mechanics:** REFERENCE. Mirror at PING's own boundary: audience binding (every grant names its exact resource), the no-transit rule (no hop trusts a previous hop's verified flag; the 403 gate re-validates the full caveat chain from the grant event every time), machine-readable denial guidance on the 403 gate, a protected-resource-metadata analog (machine-readable capability surface document).
- **Lane 4, CRX `feature/namespace-entitlements` @ 49d25df (UNWIRED GOLD):** ADAPT. `authorizeNamespace()`: explicit namespace claims validated against a per-principal entitlement map; ingest routes authorize against the authenticated principal, never `body.source`. The strongest line in the harvest: "body.source is provenance, never authority." This is the D3 wiring the first-broken-edge drill will demand.
- **Lane 7, ATProto Lexicons + granular scopes:** ADAPT the scope grammar (resource:positional?params) and progressive consent into the capability layer; generated validators from published, content-pinned schemas. This directly repairs the two documented defects (weak custom validators, fail-open permission checks). Explicitly excluded: DIDs as identity authority, Sync as an event spine.
- **Lane 3, typed approval requests:** ADAPT for the P1 decision-authority work. An approval request is a canonical event with a request_id; the approval response is a canonical event referencing that request_id and carrying the authenticated approver principal. CG-001 becomes machine-observable through this shape.
- **Lane 3, durable interrupt (`awaiting_approval`):** REFERENCE only. The interrupt machinery belongs to the ORCA/MissionRuntime lane; TenantOS consumes mission states, never mints them.
- **Lane 10, CloudEvents envelope discipline:** ADAPT for grant/denial vocabulary versioning. Type-versioning rule (additive keeps the type; breaking mints a new type; never rewrite stored events); formalize the existing `schema_version` key.
- **Lane 10, TracePort/MetricsPort abstract seams (UNWIRED GOLD):** WRAP point for observability (section 16). Spans are a side channel, never truth.
- **Lane 4, v0 credential boundary residual:** LOCATE and CONFIRM. The SECRET REFERENCE to AUTHORIZED BROKER direction and retiring the dormant `explicitToken` valve; the D2 executor path must sit behind the proven boundary before the E2 experiment runs.
- **Lane 4, open question Q7:** RESOLVE. Where the 2026-09-30 P0 capability registry artifact lives is UNVERIFIED; TenantOS records the location or records UNKNOWN, never assumes.

---

## 10. OWN / RENT / WRAP / ISOLATE / REJECT DECISIONS

- **OWN (compounds; the differentiating substrate):** tenant identity semantics; tenant ownership; owner intent; visibility policy (FIELD + DEFAULT VISIBILITY + OWNER OVERRIDE); capability binding and attenuation; authorization (the 403 gate); grant/denial event vocabulary; governed tenant transitions; outcome history of isolation drills; placement/routing policy (D1 reconciler). Per the directive: OWN only what compounds.
- **RENT (commodity machinery):** container runtime for the second-runtime portability proof; the search engine internals exercised by the cross-tenant search hostile cases; document parsing (none needed in this sprint); any observability backend (none deployed; spans project from ping_events).
- **WRAP (protocols, behind our interface):** OTel trace context behind the TracePort seam; the official MCP SDK v2 only if a reached product arrow needs an external agent perimeter (none in this sprint; no writer time spent).
- **ISOLATE (experiments, quarantined):** the attenuated-token construction (owned code, isolated from unmaintained libraries); novel delegation-chain semantics; any new agent-browser standard (none in this sprint).
- **REJECT (with the standing ledger entries):** a TenantAuthority as a new authority (tenant strings are carried from the operator registry; ledger-consistent); external auth engines as decision points (OpenFGA/SpiceDB/Cedar/OPA; ledger entry 5; harvest: tuples replicate what the tenant namespace already decides); macaroon/Biscuit libraries (own the construction; ledger entry 14); a second event spine, event table, or writer of any kind (ledger entry 6; exception bar is Nolan's explicit word only); CRDT/sync infrastructure (ledger entry 3; the SitePatch seam stays the only edit channel); the capability-pack provisioning engine and installer (D10 is schema and validator only); multi-hop cross-tenant relationship authorization (the OpenFGA revisit trigger; explicitly out of scope for this sprint).

---

## 11. P0 / P1 / P2

Ordered exactly per the directive. First broken edge overrides the schedule inside every block.

**P0. Two-tenant isolation proof + capability test matrix on the EXISTING system.**
- **P0a. The isolation proof.** Two tenants exist on the same PING runtime. Tenant A cannot read, search, project, execute, delegate, or retrieve private context belonging exclusively to Tenant B, across every read path: MC API, Ask FYD, journal gateway, dispatch artifacts, worker context, search, and every projection surface. Public objects remain publicly projectable exactly per visibility policy. The drill runs against the CURRENT system first as a falsifier (hour block 0-10), then again after wiring, then from a clean checkout.
- **P0b. The capability test matrix on the existing system.** The owner attempts to delegate `site.read`, `site.propose_change`, `mission.create`, `agent.execute` with restrictions on tenant, object, action, expiration, provider, resource/site, and to revoke each grant. Every case runs against the EXISTING registry, 403 gate, and operator caller registry; every result is recorded with evidence. Do not invent attenuation machinery until a concrete test fails. The harvest says the proven gap is attenuated delegation; the matrix is the test that either confirms it or falsifies the harvest. IF the gap is confirmed, the smallest delta lands: the ~200-line chained-HMAC construction plus the <100-line RFC 8693 chain, executed as harvest experiment E2 (one attenuated token for a real bounded effect; four exceedances, wrong object, wrong tenant, after expiry, widened caveat, each failing closed with structured machine-readable denial while the legitimate effect executes with full evidence). If the matrix passes on the existing system, E2 never runs and the port is deleted from the plan.
- **P0 wiring the drill will require:** namespace entitlement checks at ingest and dispatch (D3, "body.source is provenance, never authority"); the tenant identity chain proof (D4: tenant string byte-identical across event, mission, worker, evidence hops; mission_id carried in event metadata to fix correlation_id fragmentation); the private/public projection boundary hardening (D5: FIELD + DEFAULT VISIBILITY + OWNER OVERRIDE across the sanctioned read paths, with the regeneration path audited so a private-context value never reaches a public projection).

**P1. CG-001 machine-observable decision authority.**
- Define exactly: who can approve what (typed approval request carries request_id; approval response references it and carries the AUTHENTICATED approver principal, never a self-asserted identity), who can delegate, who can revoke, what defaults to the tenant owner, what belongs to system/constitutional authority. CG-001 (Nolan) is the default human decision authority; system/constitutional authority covers the lanes Nolan never delegated (identity authority, event admission, the 403 gate's deny semantics).
- Grant vocabulary (D6), conditional: canonical ping_events vocabulary for grants (WHO, CAPABILITY, SCOPE, TENANT, ISSUER, VALID FROM, EXPIRATION, CONSTRAINTS, REVOCATION) ONLY if existing events cannot represent it. First step is a read of the current vocabulary; if a grant is already expressible, D6 closes with a documentation pointer and zero new event types. Grant changes must be observable and replayable through the single writer.

**P2. Quota/policy boundaries.**
- **Placement reconciler (D1):** REQUIRED CAPABILITY to ELIGIBLE TARGETS to POLICY to HEALTH to COST to PLACEMENT as a pure deterministic function plus a typed policy record, reading only from the existing caller registry and the existing capability gate. The reconciler advises; the existing approval/capability gate authorizes. Placement is not identity, provider is not capability, host is not owner.
- **Capability-pack manifest schema (D10):** JSON schema plus validator for the installable capability-pack declaration shape (OBJECTS CONSUMED, OBJECTS PRODUCED, READ PERMISSIONS, WRITE/EFFECT PERMISSIONS, PROVIDER CONNECTIONS, COMPUTE REQUIREMENTS, STORAGE REQUIREMENTS, SCHEDULES, COST MODEL, SIDE EFFECTS, REVOCATION/UNINSTALL BEHAVIOR). Declarative only. No provisioning engine, no installer, no runtime. Packs enter the system only as digest-bound proposals.
- **CustomerDataPackage portability proof (D7):** extend the existing package to a full export to import round-trip of one synthetic tenant world (objects, relationships, evidence, capabilities, private context) into a second runtime; run all four operational tests against the import; the public half of the package carries zero private-context values (gated by the D5 probe). The package format is evidence-first: every public value carries its evidence basis or is excluded.
- **Four operational tests as live Mission Control cards (D8):** ISOLATION / IDENTITY / CAPABILITY / PRIVATE-PUBLIC status cards fed by real state (drill results, caller registry, grant vocabulary), each answering WHERE DID THIS COME FROM, WHO OWNS IT, HOW CERTAIN IS IT. Projection only; UNKNOWN renders as UNKNOWN; no mock numbers.

**Hour blocks:** 0-10 ARCHAEOLOGY + FALSIFICATION (the tenant-representation map; the P0a drill as falsifier against the current system; the capability matrix designed). 10-20 CONTRACT + ACCEPTANCE TEST FREEZE (tenant contract frozen, acceptance tests frozen, writer surfaces named). 20-60 HIGHEST-LEVERAGE WIRING (P0 wiring: D3, D4, D5, matrix execution, E2 if the gap confirms). 60-80 INTEGRATION WITH ADJACENT DOMAINS (P1 decision authority, D6 vocabulary, P2 quota/policy, D7 portability, D8 cards, ORCA tenant-bound execution context, FYD regeneration audit). 80-95 HOSTILE TEST / REPLAY / FAILURE RECOVERY (D9 ladder, hostile classes in section 14, replay/recovery in section 15). 95-100 DEMO / EVIDENCE / DELETE DEAD WORK / HANDOFF (the runnable isolation proof, evidence packaged, section 19 executed).

---

## 12. EXPLICIT NON-GOALS

- No TenantAuthority. No parallel tenant model. No new store, no new event spine, no new event table, no new writer.
- No external authorization or policy engine as a decision point.
- No macaroon/Biscuit library; no CRDT; no capability-pack provisioning engine or installer.
- No migration of any tenant representation until the archaeology (section 6 item 1) is published and the canonical tree per surface is named.
- No jev-shadow mission release. The 29 CLASSIFICATION_CREATE missions are terminally failed, BLOCKED_OWNER_REQUIRED; release authority is CG-001 alone.
- No re-planning landed P0s (tenant-on-proposal f94bba39, the approval invariant, exact-minimal 403 provisioning, gateway image promotion). Deltas are additive and compatibility-aware only.
- No readability-routing ownership. MISSION is not ROUTE is not BRIEF stays in the Mission Control sprint. TenantOS consumes capability requirements from missions; it does not route intelligence.
- No mock tenant data in Mission Control. No readability grant implying actuation: a projection read never authorizes an effect.
- No multi-hop cross-tenant sharing design (the documented revisit trigger for relationship-based authorization; a future sprint's problem if a reached arrow demands it).
- No per-tenant billing or metering. Quota boundaries are policy, not invoices.
- No new TenantOS object store, dashboard product, or second platform inside PING.

---

## 13. ACCEPTANCE TESTS

Integration-truth terms: OWNER REQUEST to REACHED to DURABLE to EXECUTED to VERIFIED to EXPLAINABLE to RESTART-PROVEN. A headline is not done at "tests pass."

**H1. Isolation holds under attack (P0a).** OWNER REQUEST: Nolan (or the standing operator authority) asks for a cross-tenant attack drill on synthetic tenants A and B. REACHED: the drill runs against the served routes and the real journal gateway. DURABLE: every attempt journals a typed denial event. EXECUTED: all cross-tenant reads (MC API, Ask FYD, journal gateway, dispatch artifacts, worker context, search, every projection) fail closed; public objects remain projectable per visibility. VERIFIED: an independent replay from a clean checkout reproduces every denial. EXPLAINABLE: the Mission Control ISOLATION card shows the drill, the denials, and their evidence links. RESTART-PROVEN: the gateway and routes restart, the drill re-runs green with no state carried over except the journal.

**H2. Tenant identity survives the chain (D4).** A mission for tenant A executes end to end; the tenant string is byte-identical at event, mission, worker, and evidence hops; mission lifecycle grouping is unbroken via mission_id in event metadata. Restart-proven: after a full runtime restart, the chain replays from ping_events and the tenant lineage is unchanged.

**H3. The capability matrix is answered (P0b).** Every matrix case (delegate site.read, site.propose_change, mission.create, agent.execute with restrictions on tenant, object, action, expiration, provider, resource/site; revoke each) has a recorded verdict on the EXISTING system. If a case fails, E2 runs: the legitimate attenuated effect executes once with full evidence, and the four exceedances each produce a structured 403 denial naming the violated caveat; grant, effect, and denials are all journaled; the proof replays from a clean checkout. If every case passes, the matrix result stands with zero new machinery and the attenuation port is deleted from scope.

**H4. A tenant world moves (D7).** The CustomerDataPackage export of tenant A's world imports into a second runtime; all four operational tests pass on the import; the public half of the package contains zero private-context values (D5 probe as gate); restart-proven: re-export after restart produces an equivalent package (digests compared).

**H5. Private stays private through regeneration (D5).** The hostile leak probe (private values seeded in the owner store, pushed through every public projection path including a full SiteSpec regeneration) reports zero appearances in public output, green from a clean checkout.

**Falsifiability questionnaire (per major claim):**

**Claim: "Tenant A's objects, evidence, and capabilities are unreachable from tenant B's context."**
- WHAT INVARIANT? Every read/write path asserts the acting tenant before I/O; a cross-tenant reference is refused with a typed denial, never answered with an empty result. Failure is never ambiguity.
- WHO OWNS IT? W1 (tenant-context/scoped-stores/gateway) and W2 (dispatch identity/tenant gate). The invariant is owned by code, not prose.
- HOW CAN IT FAIL? A read path that bypasses the sanctioned wrappers (unscoped store access); the loopback `x-mc-tenant` assert-header trusted against a deliberate attacker; a worker launched without tenant context; a client-side post-retrieval namespace filter (harvest T4) letting cross-namespace candidates leave the store.
- WHAT ATTACK DISPROVES IT? The D9 hostile ladder: spoofed tenant_id on journal append, missing tenant on read, cross-tenant mission fetch, body-claimed tenant on dispatch, context-less worker invocation, cross-tenant search query. One success disproves the claim.
- WHAT EVIDENCE PROVES IT? The full denial journal plus the clean-checkout replay, both linked from the Mission Control ISOLATION card.
- CAN IT BE REPLAYED? Yes: the drill is a scripted scenario against the real gateway and routes, deterministic seeds.
- DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes: D9 records every minimized failure as a regression ID with invariant, seed, counterexample, and owning primitive.

**Claim: "An attenuated capability cannot be widened or replayed outside its caveats."**
- WHAT INVARIANT? Every hop re-validates the full caveat chain (object, tenant, expiry, attenuation monotonicity); no hop trusts a previous hop's verified flag (no-transit rule); expiry is checked against a non-mutable time source at the gate.
- WHO OWNS IT? W2, at the 403 gate. Deterministic software; no judgment plane in the deny path.
- HOW CAN IT FAIL? Non-constant-time HMAC comparison; expiry checked against a mutable clock; a delegation link appended by an unauthorized dispatcher; the gate reading the grant from a forgeable field; a caveat-stripped token re-signed by a non-issuer.
- WHAT ATTACK DISPROVES IT? The four E2 exceedances plus a fifth: a token with a caveat removed and re-signed by a non-issuer. Any execution disproves the claim.
- WHAT EVIDENCE PROVES IT? Journaled grant + effect + structured denials; the E2 experiment record.
- CAN IT BE REPLAYED? Yes, from a clean checkout with recorded token fixtures (expired-token fixture uses a fixed past timestamp, not wall clock).
- DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes, via D9.

**Claim: "A tenant's world is portable without leaking private context or breaking evidence integrity."**
- WHAT INVARIANT? The CustomerDataPackage carries the tenant's objects, relationships, evidence, capabilities, and private context as one unit; the public projection of the imported world contains no private-context values; evidence references in the package resolve in the target runtime.
- WHO OWNS IT? W3 (package + round-trip), W1 (the enforcement seams the import path must satisfy).
- HOW CAN IT FAIL? Dangling evidence references (event IDs/content hashes that do not exist in the target log); private values traveling in the public half of the package; tenant_id rewritten or dropped on import; the import path bypassing the tenant-context assertion.
- WHAT ATTACK DISPROVES IT? Import tenant A's package and read it as tenant B; diff the public render against the private seed list; resolve every evidence reference in the target runtime. One leak or one dangling reference disproves the claim.
- WHAT EVIDENCE PROVES IT? The four operational tests green on the import, the leak probe green, the package digest recorded.
- CAN IT BE REPLAYED? Yes: export, restart, re-import, re-test; package digests compared.
- DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes, via D9.

---

## 14. HOSTILE TESTS

The D9 hostile ladder over the four operational tests (ISOLATION / IDENTITY / CAPABILITY / PRIVATE-PUBLIC). Every case names its attacker model (accidental vs deliberate loopback vs external); H1 is not met until the deliberate cases fail closed too. Every minimized failure becomes a regression ID.

- **Tenant leakage:** spoofed tenant_id on journal append; missing tenant on read; cross-tenant mission fetch; body-claimed tenant on dispatch; context-less worker invocation (must refuse to start); cross-tenant dispatch artifact read.
- **Visibility bypass:** private-context value seeded in the owner store pushed through every public projection path including a full SiteSpec regeneration; unscoped store access bypassing the sanctioned wrappers; export-boundary leak (private value in the package's public half).
- **Capability bypass:** expired, widened, wrong-object, and wrong-tenant token attempts; caveat-stripped token re-signed by a non-issuer; delegation chain with a revoked link; a hop accepting a previous hop's verified flag (no-transit violation); grant read from a forgeable field.
- **Search/context/projection cross-tenant reads:** cross-tenant search query (server-side namespace filters, never client-side post-retrieval; harvest T4); agent context assembled for tenant A containing tenant B's private values; projection path reading across the boundary.
- **Crash windows:** context lost mid-operation (the h-crash-window suite's class); gateway restart mid-append; lease expiry mid-delegation.
- **SECONDARY FIRST-BROKEN-EDGE WATCH LIST** (from the prior revision, kept as named risks): the loopback assert-header confusion (section 3, primary); no-transit violations in the delegation chain; dangling evidence or leaking private values in the CustomerDataPackage; writers patching a non-canonical worktree.

---

## 15. REPLAY/RECOVERY TEST

- Replay one full isolation drill from ping_events through current worker code on a clean checkout; diff the reconstructed denials against the originals. Settles whether the log is reconstructive or archival for the tenant boundary (harvest E1's question, scoped to this sprint).
- Restart the gateway and routes mid-program; re-run the drill green with no carried state except the journal.
- Export tenant A's world, restart both runtimes, re-import, re-run the four operational tests; package digests compared across the restart.
- Worker-code version markers are recorded in history so replay branches explicitly instead of diverging silently (harvest lane 3/10 determinism discipline).

---

## 16. OBSERVABILITY

OTel is observability only, never truth. Trace context WRAPs behind the existing TracePort/MetricsPort abstract seams (harvest lane 10, UNWIRED GOLD). Spans are a side channel: the typed denial journal in ping_events is the truth; spans carry correlation only. Tenant attributes on spans are server-derived from the caller registry, never body-claimed. No OTel backend stack is deployed (harvest REJECT: spans project from ping_events when a backend is ever needed). The isolation drill emits one span per attempt linked to its denial event; the Mission Control ISOLATION card renders from the journal, never from spans.

---

## 17. DEMO

The two-tenant isolation proof, runnable by Nolan with one command and no log reading.

- One scripted scenario: synthetic tenants A and B on the same PING runtime. A seeds private objects, private context, a mission, and a delegated capability. The scenario attempts, as B and as an unauthenticated caller: read, search, project, execute, delegate, and private-context retrieval against A's world; then verifies A's public objects remain publicly projectable per visibility policy.
- Every denied attempt fails closed with a typed, journaled denial; the legitimate A-side operations succeed with full evidence.
- The Mission Control ISOLATION card shows the drill: each attempt, its denial, and the evidence link. UNKNOWN renders as UNKNOWN.
- The demo replays from a clean checkout and survives a gateway/route restart. Pass criteria are the H1 acceptance chain, not a green test count.

---

## 18. ROLLBACK

- All deltas on landed lines are additive and compatibility-aware. No migration runs until the archaeology (section 6 item 1) is published.
- New checks are fail-closed under a flag: if the new check cannot evaluate, the gate denies. Rollback is the flag, recorded per change in the sprint log with the exact revert command.
- The capability matrix runs BEFORE any attenuation code lands. If the matrix shows the existing system already attenuates, the macaroon port never lands; the branch is deleted, not parked.
- If the isolation drill invalidates the contract draft (e.g., the deliberate-attacker gap proves unfixable without a new primitive), the sprint re-freezes the contract at the pre-sprint draft, files the gap as a proposal to the parent, and does not invent the primitive locally.
- Package/import format is versioned; an import written by a newer format that the target cannot verify fails closed with a typed refusal.

---

## 19. DELETE/FREEZE LIST

**FROZEN (will not be created in this sprint, on sight):** a TenantAuthority; a parallel tenant model; a new store; a second event spine, event table, or writer; an external authorization/policy engine as a decision point; a macaroon/Biscuit library; CRDT/sync infrastructure; a capability-pack provisioning engine or installer; any migration of tenant representations before the archaeology publishes; any re-planning of the landed P0s.

**DELETE (only after deadness is proven per the constitutional rule: discover, understand, classify, consolidate, verify, archive, then delete):**
- The `pig-fb/capability-registry.json` name collision (harvest T5): rename the worker-strategy projection file so the name no longer collides with the auth capability registry.
- The dormant `explicitToken` valve in the credential boundary (harvest T5): retire in favor of secret references, once the boundary file is located and the retirement is proven safe.
- Tenant representations the archaeology rules legacy or alias: archive the determination, confirm zero writers, then remove. Duplicates across non-canonical worktrees are archived, never deleted, until the canonical tree is named and served.
- The attenuation port branch, if the P0b matrix passes on the existing system: deleted, not parked.

---

## 20. DEPENDENCIES ON OTHER FIVE SPRINTS

**Mission Control.** NEED: the mission contract's tenant-carrying fields frozen (read-only); the projection layer as the surface for the four operational-test cards (D8). GIVE: the tenant contract (owned); typed denial events for the cards to render; the guarantee that a projection read never grants an action. The P0 drill's EXPLAINABLE step is a Mission Control card, built by this sprint's W3 as projection code only.

**ORCA.** NEED: nothing new; ORCA consumes tenant-bound missions through the canonical mission system. GIVE: the tenant-scoped execution context (worker launched without tenant context refuses to start); finding sets attributable to exactly one tenant; capability-scoped execution so ORCA's bounded intelligence cannot exceed its grant. ORCA is a participant, never the tenant authority.

**Website building (FYD).** NEED: the regeneration path observable for the D5 audit (read-only plus test files); the visibility assertion seam (`set-address-visibility` and siblings) as the projection policy source. GIVE: the FIELD + DEFAULT VISIBILITY + OWNER OVERRIDE policy seam wired across sanctioned read paths; the guarantee that private-context values never reach public projections; the export boundary for the CustomerDataPackage.

**JEV.** NEED: nothing; JEV is the judgment plane, not a tenant consumer. GIVE: grant, denial, and isolation evidence readable for judgment without execution or mutation authority. JEV never alters a tenant boundary; its verdicts on tenant-scoped results are advisory until the convergence decision grants influence (directive architecture call 2).

**Tests.** NEED: the canonical gate location and a green baseline before hostile suites are written; the existing suites (`src/fyd/tenant/__tests__/` a through h, `mc-approval/tests/test_approval_tenant.py`, the journal-privacy gateway suite) as the foundation D9 extends. GIVE: the D9 hostile ladder, every minimized failure as a regression ID with invariant, seed, counterexample, and owning primitive, and the tenant-boundary replay/recovery proof.

**Contribution to the seventh integrated proof.** The integrated scenario ("Research whether my site accurately represents my current commercial services and propose improvements") runs inside ONE tenant's boundary: the owner's mission carries the immutable tenant field, ORCA executes inside the tenant-scoped capability context, JEV judges with tenant-scoped evidence, the SiteSpec proposal is tenant-bound, the owner (CG-001) approves through the typed approval shape, and the verified outcome is projectable to that tenant only. If any step leaks across the tenant boundary, the integrated proof fails at TenantOS's seam, and that failure is the queue.
