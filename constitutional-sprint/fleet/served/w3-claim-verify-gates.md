# W3 — claim-verify / object-overrides gates + ingest-authority runner-up (P0, live)

Worker W3, constitutional-sprint wave. PROPOSE-ONLY. Nothing applied, no commits, no live-runtime mutations.
Served checkout under analysis: `/home/nolan/projects/ping` @ `e48ef710` (served on :3100).
Reference checkout (audited head with the intended gate shape): `repo-mirror/` (= audited head; carries the demo-owner-mode gate the served build lacks).

Consumed: F162 (claim-verify no gate; self-asserted operator-attestation), F163 (object-overrides approve no gate; seeded DemoOwnerContext), F144/CP-1 runner-up (CanonicalizationService-bypassed paths), F246 (the gap umbrella). New numbers F270–F279 only.

---

## F270 — claim-verify path map: route, handler, missing-gate seam [SECURITY] [P0]

Route: `POST /api/fyd/claims/[resourceId]/verify`.
Served handler: served `src/app/api/fyd/claims/[resourceId]/verify/route.ts:32-105`.

Call chain in the served checkout (per fleet/security/sec4-unauth-endpoints.md):

1. `POST` enters with body `{ method, basis, operatorLabel }`. **No gate of any kind** before parsing or I/O: no session check, no identity check, no CSRF, no env flag, no Host check, no capability check (sec4 rows 78-79).
2. Served `route.ts:77`: `readClaim(resourceId)` (served claim store `src/fyd/claim/store.ts:55`) — the claim must exist in CLAIMED state.
3. Served `route.ts:85-94`: `attestOperatorControl({ resourceId, operatorLabel, basis })` (`src/fyd/claim/verification-seam.ts:66-94`) — mints a `VerificationProof`.
4. Served `route.ts:95-96`: `verifyControl(current, proof)` (`src/fyd/claim/machine.ts:113-140`) → `writeClaim(next)` (`src/fyd/claim/store.ts:68`) persists the transition CLAIMED → VERIFIED-CONTROLLED.

Where the gate should sit: the audited-head copy already shows the intended seam. In the mirror (`repo-mirror/src/app/api/fyd/claims/[resourceId]/verify/route.ts`), a `demoDenied(req)` function runs as the FIRST statement of `POST`, before `ctx.params`, body parsing, or any I/O, and returns a typed 403 `{ ok:false, code:"demo_owner_mode_required" }`. The served checkout's `route.ts:32-105` has no such function — the first executable statement is body parsing, and the write path at 95-96 is unconditional on identity. The missing gate is the missing pre-parse call.

Status: PROVEN by sec4 static evidence; corroborates F162. (Served :3100 is Pig-side and unreachable from this sandbox; confirmed via the mirror diff, not a live POST.)

## F271 — what "self-asserted operator-attestation" means, concretely [SECURITY] [P0]

The minted proof is a statement the caller writes about themselves:

- `attestOperatorControl` (`src/fyd/claim/verification-seam.ts:66-94`) takes `operatorLabel` from the request body. In the served route it defaults to `body.operatorLabel.trim() || current.claimedBy?.actorLabel || "operator"` — i.e. **an arbitrary caller-supplied string**, never verified against a session, a signature, or a credential.
- The only checks are: `basis` is a string of at least 10 characters, and `operatorLabel` is non-empty. There is no check that the caller is the claimant, the operator of the resource, or any authenticated party at all.
- `verifyControl` (`src/fyd/claim/machine.ts:113-140`) then stamps state `verified-controlled`, embedding the proof's own `proofNote` ("a human operator asserts control. This is a statement, not a cryptographic proof of domain control"). Honest labeling at the data layer does NOT stop the route from presenting the claim as VERIFIED-CONTROLLED downstream, because `writeClaim` persists it with no gate before it.
- Exactly one of the six declared verification methods is implemented (`operator-attestation`, `verification-seam.ts:29-35`); the other five return 501. So the ONLY path to verified status is the self-asserted one.

Exploit chain (static): any existing CLAIMED claim + `POST { method:"operator-attestation", basis:"<10+ chars>", operatorLabel:"<anything>" }` → server mints a proof and persists VERIFIED-CONTROLLED. No human operator is involved. This is F162's "self-asserted operator-attestation persists."

Status: PROVEN by code read.

## F272 — gate-design proposal for claim-verify [SECURITY] [P0]

**Principal requirement.** The route writes claim state, so it requires a verified principal BEFORE any parsing or I/O: a real owner/operator identity (session + PING identity, with a CONTROL RELATIONSHIP to the resource's tenant). Until that lane exists, the minimum viable gate is the audited-head shape already proven: fail closed unless demo mode is explicitly opted in AND the request arrived on a localhost/private-network host. The gate must never be weaker in the served checkout than at audited head.

**Typed operations.** Split the single POST into typed, separately gated operations:
- `attest` (intent): records a proof statement — requires principal; weak-proof rejection (400) stays.
- `verify` (decision): moves CLAIMED → VERIFIED-CONTROLLED — requires principal AND an implemented verification method AND the transition guard. `operator-attestation` should never be accepted on `verify` without a principal; as a typed operation it is at most an `attest` input.

**Failure-closed semantics.** No principal → typed 403 before `readClaim`. Unknown method → 400 with the method list. Unimplemented method → 501 (already present). Transition violation → 409 (already present). Missing/weak basis → 400 (already present). All existing typed refusals are retained; the new failure mode is exactly one: 403 `principal_required`/`demo_owner_mode_required`.

**What breaks if applied.** In the served build: all unauthenticated uses of operator-attestation stop working — that is the intended breakage (F162). Legitimate demo flows continue ONLY where `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` is set AND the Host is localhost/private (mirror behavior). Public/self-hosted served deployments lose claim verification entirely until real owner auth ships; that is the correct failure-closed outcome for a P0. The Manage surface's demo UI must keep its DEV/DEMO banner unmissable (structural disclosure already exists in owner-context.ts:150-152).

Full patch sketch: `patches/served/w3-claim-verify-gate-proposal.md`.

Status: PROPOSED, not applied.

## F273 — object-overrides approve path + DemoOwnerContext construction map [SECURITY] [P0]

Route: `POST /api/fyd/objects/[objectId]/overrides`, stage "approve".
Served handler: served `src/app/api/fyd/objects/[objectId]/overrides/route.ts:123+` (audited-head mirror carries the gate at 116-120; served lacks it — sec4 rows 95-98).

Served approve chain:

1. No demo env/Host gate before propose/approve in the served checkout.
2. `createOwnerContext(objectId)` (`src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts:99-104`) — the single owner-context seam. Today its body is `return DemoOwnerContext.forTenant(tenantId)`.
3. `DemoOwnerContext.forTenant` (`owner-context.ts:130-136`): verifies the tenant id FIRST (`requireTenantContext`, fail closed — this part is sound), then `resolveOwnerCorrectionChain(verified)` (`src/fyd/owner-mode/demo-chain.ts:56-80`), then `demoActorContext(chain.actor.id, chain.actor.label)` (`overrides/patch-loop.ts:80`).
4. The actor is `DEMO_OWNER_ACTOR = { id: "demo-owner", label: "Demo Owner (seeded, unverified)" }` (`src/fyd/owner-mode/capability.ts:59-62`) — a hardcoded constant, constructed in `resolveDemoRelationship` (`capability.ts:70-82`) which treats the seeded actor as controller of every demo site: "This mapping is the demo. It verifies nothing."
5. Approval calls `ctx.evaluateCapability(objectId, "owner.correct-fact")` (`owner-context.ts:138-153`) → verdict from the seeded demo chain → on allow, `applyOwnerCommand(...)` mutates the owner store and `buildBoundApproval({... actor ...})` binds the approval record to the SEEDED actor (served route, approve stage).

So "seeded DemoOwnerContext stands in for a principal" means: a constant actor id minted server-side, with a controller relationship assigned by a hardcoded mapping, no session, no credential, no tenant-scoped ownership registry anywhere in the chain (the session cookie is read only for audit notes — `demo-chain.ts:58-67`, "the verdict below never derives from it").

Status: PROVEN by code read; corroborates F163. (Residual: served approve path's exact persisted-write line was flagged ADAPTER-4 and remains uncaptured; the approve stage's `applyOwnerCommand` + `buildBoundApproval` are the mirror-captured writes.)

## F274 — every consumer that trusts the seeded stand-in [SECURITY] [P0]

1. `app/api/fyd/objects/[objectId]/overrides/route.ts` — calls `createOwnerContext(objectId)`; uses `ctx.evaluateCapability` on BOTH propose and approve; on approve, binds `actor` into the persisted approval and `applyOwnerCommand` mutation. The stand-in principal authorizes writes.
2. `app/api/fyd/objects/[objectId]/overrides/owner-context.ts` — defines the seam AND the only implementation (`DemoOwnerContext.forTenant`, `DemoOwnerContext.label()`); the factory body is the construction point where a real principal must attach (the file's own docstring names this).
3. `app/api/fyd/objects/[objectId]/overrides/patch-loop.ts:80` — `demoActorContext(actorId, label)` constructs the `OwnerActorContext` (demo marker + disclosure) the route stamps on every response and binds into approvals.
4. `app/api/fyd/customize/route.ts:72-74` — a SECOND independent consumer: `evaluateCapability(DEMO_OWNER_ACTOR, resolveDemoRelationship("", DEMO_OWNER_ACTOR), "owner.customize-approve")` gates customize approvals on the same seeded actor, outside the OwnerContext seam. This consumer does not even go through the seam's labeling contract.

The seam design (`owner-context.ts` header) contains the migration path: replacing `createOwnerContext`'s body with a PING identity/capability implementation changes one factory. But `customize/route.ts` bypasses that seam, so it needs its own port or a shared "require real owner context" helper.

Status: PROVEN by grep + code read.

## F275 — proposal: replace the stand-in with a real principal requirement (or explicit demo disablement in served builds) [SECURITY] [P0]

**Preferred: real principal requirement.** Change `createOwnerContext`'s factory body to construct a principal-backed context: session (practice identity cookie) → PING identity verification → CONTROL RELATIONSHIP resolved from a tenant ownership registry (not a seeded mapping) → capability evaluation of `owner.correct-fact`. `DemoOwnerContext.forTenant` stays in the tree but becomes constructible ONLY when the demo gate (env flag + private host) passes; any other construction attempt fails closed. Responses keep the seam's disclosure contract; the disclosure then reads "verified owner" instead of "seeded demo actor".

**Fallback (explicit demo labeling + disablement in served builds).** Until real owner auth exists: in served (non-demo) builds the approve stage is disabled by build config — the route returns typed 403 `owner_auth_unimplemented` for stage approve, while propose stays as a read-only preview. Demo builds keep the current DemoOwnerContext behind the demo gate, with the DEMO OWNER CONTEXT labeling retained on every response (already present). This matches FYD's own rule from the builder decisions (2026-09-22): owner correction loop runs only for authorized owners; demo mode is visibly labeled.

**What breaks if applied.** All current "approve" flows in served deployments stop working for unauthenticated callers — intended breakage. Demo UI keeps working only under the demo gate. `customize/route.ts` must be ported off the direct `DEMO_OWNER_ACTOR` call to the seam (its approvals would otherwise keep minting under the stand-in). The seeded-actor approval records already persisted are historical: they carry `demoScaffolding: true` in the audit chain (`demo-chain.ts`), so a migration script can identify them — no silent re-labeling.

Full patch sketch: `patches/served/w3-claim-verify-gate-proposal.md` (part 2).

Status: PROPOSED, not applied.

## F276 — canonical-events route bypasses the ingest authority [EVENT/GOVERNANCE] [P1]

`POST /canonical-events` (`gateway/routes/canonical_events.js:29`, mounted `bootstrap:687`) calls `executeEmitEvent` (`gateway/canonical_event_envelope.js:206-250`) which:

- mints its own receipt identity: `generateEventId` = UUID v5 over `(tenantId, eventType, timestamp, sequence)` (canonical_event_envelope.js:130-147) — ingress-era row identity, NOT the content-addressed constitutional identity;
- assigns per-tenant `MAX+1` sequence (receipt ordering, not canonical order) and a receipt timestamp;
- inserts into the `canonical_events` table directly.

No `authorizeNamespace`, no `canonicalizeAndEmit`, no namespace auth. The code itself declares this a "RECEIPT surface, not an acceptance authority" (`canonical_event_envelope.js:222-236`): constitutional identity/order/namespace are minted only IF the row later converges through `UnifiedEventRuntime.emit()` via the EventBridge 5s poll. So at the HTTP boundary, `POST /canonical-events` lets callers insert rows into a journal with a tenant CLAIM (`tenant_id` "unverified here") that only later gets namespace resolution at convergence.

**What it costs:** two identity schemes (receipt UUID vs content hash) for the same event; rows readable from `canonical_events` before namespace authorization has been decided; the EventBridge convergence becomes a second, async gate — a bypass in time. The AGENT01 writers table (C-1..C-6) confirms live in-process callers: all four business authorities, the route, and the business-profile adapter.

**Seam points for routing through the single ingest authority** (`patches/served/w3-ingest-authority-routing-proposal.md`): `canonical_event_envelope.js:206` (executeEmitEvent entry) becomes a pre-canonicalization producer stage: business authorities pass their command into `CanonicalizationService.authorizeNamespace` + `canonicalizeAndEmit` with a business-event namespace rule; the `canonical_events` receipt INSERT is retained as a durable receipt log (it is a journal, not an authority) but rows carry the canonical `event_id`/namespace returned by the authority, instead of minted receipt identities that get rebound later.

Status: PROVEN mechanism (forensics copy 2026-09-19 + AGENT01 writers table); live re-verification of `routes/canonical_events.js:29` NOT done tonight (core route files not extractable from this sandbox — no Pig/core access in this subagent scope).

## F277 — identities route bypasses the ingest authority [EVENT/GOVERNANCE] [P1]

`POST /identities` (`gateway/routes/identities.js:178`, `OBJECT_CREATED`, mounted `bootstrap:683`) emits directly via `eventRuntime.emit` — AGENT01-EVENT.md W-4. The route claims "the ONE IdentityAuthority" but its event enters the journal WITHOUT `authorizeNamespace` or `canonicalizeAndEmit`. The direct-emit branch pattern is the same shape Agent 01 already proposed to retire for `/events` (deployed-events.js:110-128).

**What it costs:** identity-creation events — the most authority-sensitive events in the system — are the least gated: they skip the boundary that decides namespace auth + canonical envelope construction. Any downstream consumer that assumes "journaled = canonicalized" gets a false guarantee for identity events.

**Seam points** (`patches/served/w3-ingest-authority-routing-proposal.md`): `gateway/routes/identities.js:178` is the single seam — replace the direct `eventRuntime.emit` call with `canonicalizationService.canonicalizeAndEmit`, with the identity domain's namespace rule folded into `authorizeNamespace`/`resolveNamespace` as configuration.

Status: PROVEN via AGENT01-EVENT.md §2.1 W-4; route-source re-read not done tonight (same sandbox limitation as F276).

## F278 — ingest-authority routing: what Agent 01 already covers vs this wave's remainder [GOVERNANCE]

Agent 01's proposal `patches/agent01-event-authority/CP-1-single-ingest-authority.md` (2026-09-24) covers `POST /events`: replace both direct-emit branches in `gateway/routes/events.js` with `canonicalizeAndEmit`, fold BFF normalization + tenant-registry validation into the authority as configuration, keep `UnifiedEventRuntime.emit` as the durable-append primitive. This wave does NOT duplicate that proposal; it is referenced and extended.

This wave's remainder (runner-up scope): `POST /canonical-events` (F276) and `POST /identities` (F277). Both bypass the boundary; both have exact single seams; both proposals keep the existing stores/tables and only move the DECISION (namespace auth + canonical envelope) into `CanonicalizationService`, preserving `UnifiedEventRuntime.emit` as the sole append primitive per the write-gate (no EventAuthorityV2).

Behavioral equivalence argument (full): `patches/served/w3-ingest-authority-routing-proposal.md`. Short form: receipt identity (UUID v5 over tenant/type/time/seq) is strictly weaker than content identity; the convergence path already re-mints canonical identity at bridge time, so routing producers through the authority at ingress removes a temporal bypass without changing the stored canonical outcome — producers get the canonical event_id synchronously instead of asynchronously.

Status: PROPOSED, not applied. Dedupe note: F144/CP-1 remains the umbrella decision; F276/F277 are its runner-up children; Agent 01 owns /events.

## F279 — generic-class entries [GOVERNANCE]

1. **CLASS: served build ships without audited-head demo gate.** Both P0 findings (F270/F271 claim-verify, F273-F275 overrides) are one pattern: the audited head carries a fail-closed demo-owner-mode gate (`demoDenied` / `isDemoOwnerModeEnabled` + `isPrivateHost`) and the served checkout `e48ef710` dropped it while keeping the write paths. Detection invariant for future passes: every route whose handler calls a persist function (`writeClaim`, `applyOwnerCommand`, `buildBoundApproval`) must have a gate function called as the first statement of its handler in the SERVED tree, not just at head. Check: `grep -L "demoDenied\|principal"` over served route files that import write-path functions.
2. **CLASS: secondary journals as temporal bypass of the ingest authority.** F276/F277/F144: a journal that accepts writes now and defers namespace authorization to convergence time (EventBridge) is a boundary bypass in time. Rule: authorization decisions must happen at ingress, synchronously, in `CanonicalizationService`; secondary tables (`canonical_events`, `repository_events`) are journals, and journals must store the authority's verdict, not mint their own identities first.
3. **CLASS: seeded demo principals trusted by multiple consumers.** F274: `DEMO_OWNER_ACTOR` is consumed by the overrides seam AND independently by `customize/route.ts`. Rule: a demo stand-in principal must be constructible through exactly one seam, and that seam must fail closed unless the demo gate passes; direct imports of the seeded actor outside the seam are findings.

---

### Numbers used
- Findings F270–F279 (new); consumed F162, F163, F144/CP-1, F246.
- Six declared verification methods, one implemented (`operator-attestation`).
- Basis minimum length 10 characters (both `attestOperatorControl` and `verifyControl`).
- Six `canonical_events` writers (C-1..C-6), four ping_events writers (W-1..W-4).
- Two claim-verdict typed codes unchanged; new 403 `principal_required`/`demo_owner_mode_required` / `owner_auth_unimplemented`.

### File paths
- New: `fleet/served/w3-claim-verify-gates.md` (this file); `patches/served/w3-claim-verify-gate-proposal.md`; `patches/served/w3-ingest-authority-routing-proposal.md`.
- Reference: `repo-mirror/src/app/api/fyd/claims/[resourceId]/verify/route.ts`; `repo-mirror/src/app/api/fyd/objects/[objectId]/overrides/{route.ts,owner-context.ts,patch-loop.ts}`; `repo-mirror/src/fyd/{claim/{machine.ts,store.ts,verification-seam.ts},owner-mode/{gate.ts,capability.ts,demo-chain.ts}}`; `repo-mirror/src/app/api/fyd/customize/route.ts:72-74`.
- Prior art: `fleet/security/sec4-unauth-endpoints.md` (rows 78-79, 95-98); `agent01-event-authority/AGENT01-EVENT.md` (§1, §2.1–2.4, §4); `patches/agent01-event-authority/CP-1-single-ingest-authority.md`; `agent20-convergence/GLOBAL-AUTHORITY-MAP.md` (CP-1); forensics copy `~/workspace/forensics/transfer-2026-09-19/canonical_event_envelope.js`.

### Needing Nolan
Nothing needs Nolan's decision tonight. For awareness only: (a) the claim-verify and overrides-approve gates in the served build `e48ef710` are proposals, NOT fixes — the served :3100 checkout still accepts self-attested claim verifications and seeded-actor owner approvals; (b) applying either gate breaks current public/self-hosted use of those flows by design; (c) the canonical-events/identities ingest routing belongs in the sprint worktree (`/home/nolan/projects/ping-constitutional`), never in `/home/nolan/ping`, per the write-gate; (d) served-side live proof (actual POST to :3100) was out of scope for this subagent (Pig-side, no core/container access).
