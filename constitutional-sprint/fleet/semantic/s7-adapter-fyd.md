# S7 Semantic Audit: FYD Adapter

Worker: S7 (semantic audit, adapter FYD). Parent-requested forensic read.
Mode: READ-ONLY. No patches applied, no processes started, no commits created.

## Audit posture

- Primary adapter base: `/home/nolan/projects/ping-constitutional`, HEAD `a69bb68fc84620a5635e071030cf49a633df7394`. Verified unchanged at task start and again at 2026-09-24 03:0x UTC (HEAD identical, `git status` shows no staged/unstaged changes OF MY OWN).
- Core (`/home/nolan/ping`, branch `refactor/runtime-authority-convergence`) consulted read-only for the identity authority and event spine only.
- Worktree drift observed during the audit: HEAD is pinned, but the working tree carries UNCOMMITTED changes made by sibling workers, timestamped 2026-09-23 20:39-20:41 MDT (before my evidence reads): comment corrections in `src/fyd/claim/identity.ts` and `src/fyd/social/attestation-gate.ts`; a functional fix in `src/fyd/social/readers.ts` (added `created_at` to `NetRelationship` and to the `winsOver` tiebreak) plus its regression test `src/fyd/social/__tests__/readers-tiebreak.test.ts` and `src/fyd/social/jest.config.cjs`; and later a comment correction in `src/app/api/fyd/customize/route.ts` (landed mid-audit). None of these are mine. Findings below cite the base commit where behavior is base; worktree-only behavior is labeled WORKTREE.
- Reference material read in full: `event/EVENT-FORENSICS.md`, `authority-map/AUTHORITY-MAP.md`, `security/SECURITY-SWEEP.md`, `reachability/REACHABILITY.md`, `~/AGENTS.md`, plus the injected standing context.

## Executive summary

The FYD adapter is an HTTP client of the canonical core. `UnifiedEventRuntime -> ping_events` is the proven event spine, and the adapter never writes to the journal directly except through gateway HTTP routes. The audit found no single catastrophic hole, but a pattern of **identity fragmentation, gate inconsistency, silent-fallback persistence, and orphan machinery** across four lanes:

1. Three live identity namespaces with no bridge: OIDC UUIDv5 (adapter file store), gateway `identity_<16hex>` (social + practice lanes), `demo-owner` (claim + owner lanes). A Google-authenticated UUID cannot enter the social signing lane; neither real lane maps to the claim actor. (R1)
2. Two POST `/identities` mint lanes with divergent validation, plus an open dev-identity route; retries can mint duplicate identities and a key-store failure orphans a live gateway identity whose private key is unrecoverable. (R2, R3, R4)
3. The claim lane's gates are inconsistent: `verify` requires demo-owner mode on a private host; `claim` and `release` require only the env flag (no host check); release ignores the request entirely (`_req`). In demo mode every caller IS `demo-owner`, so `release` is effectively unauthenticated mutation. Release also destroys structured verification proof. (R5, R6, R7)
4. The owner-capability seam is misbound: `DemoOwnerContext.evaluateCapability` ignores the requested capability and always answers for the seeded `owner.correct-fact` verdict; the overrides route hardcodes `owner.correct-fact` for every command type; the server-side owner mutation path never calls any attestation gate (the gate's `emit` path is only exercised by a client-side demo walkthrough with `emit: undefined`). (R8, R9, R23)
5. F20 confirmed: the owner store has two live keys for the same object. `composeObjectView` reads `readOverrides(overridesKey)` where the slug path passes the site slug (`view.ts:316`) and the by-id path passes the canonical object id (`by-id.ts:40`). An owner decision applied on one surface is invisible on the other. The tenant-id pattern (`^[a-z0-9-]{1,64}$`) accepts canonical object ids, so the tenant boundary cannot catch the confusion. (R11, R33)
6. Owner event and claim persistence hide corruption: catch-all read failures degrade to `[]`/`null`, and `appendOwnerEvent` then rewrites the log containing only the new event, silently destroying audit history. Shared `<path>.tmp` / `<path>.tmp-<pid>` temp files race on concurrent writes. (R12, R13)
7. The FYD_SITE_OVERLAY write lane's authority is the gateway event route, which the adapter's own comment admits has "no auth". The adapter's demo gate is enforced only in the Next.js route; anything that can reach the journal gateway can write overlay events for any site, bypassing every adapter gate. (R18)
8. `queryFydSiteOverlays` claims "tenant scoping at the authority" but fetches ALL tenants' overlay events and filters client-side in the adapter. (R15)
9. The practice BFF lane is systematically silent: 12+ `.catch(() => [])` / `.catch(() => null)` sites turn gateway failures into rendered emptiness (no relationships, no objects, no identities, empty feed). The FYD social readers, by contrast, fail closed. (R22)
10. The Ask FYD site-patch proposal pipeline is fully built but unreachable: `grants` is always `[]`, so `sitePatchRefusal` always refuses drafting; a consumer exists in the practice lane with separate grant logic. The /build planner ignores service order/visibility, which the overrides preview honestly admits. (R25, R26)
11. Decorative idempotency: the social "deterministic action ID" is computed but never submitted in the event; follow dedupe is a racy pre-read; posts have no dedupe; the 80-char prefix hash can collide. `submitEnvelope` coerces missing `event_id` to `""` and missing status to `"ok"`. (R20, R21)
12. Stale metadata and shallow validation: tenant graph `generatedAt`/`eventSequences` are hardcoded 2026-09-21 pins (R16); overlay `add_object`/`add_relationship` cast without semantic validation (R17); readers default unknown relationship status and missing feed visibility to active/public (R14, R36).

## Shared-record findings

Row schema: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

### R1. Identity fragmentation: three namespaces, no bridge
- DOMAIN: identity. COMPONENT: `src/fyd/identity/principal.ts`, `src/fyd/social/actions.ts`, `src/fyd/claim/identity.ts`.
- CLAIM: the adapter mints and honors three mutually unintelligible identity namespaces with no adapter-side bridge.
- EVIDENCE: `deriveIdentityId()` returns UUIDv5 over `provider::issuer::subject` and `toAccount()` rejects non-UUID identities (OIDC lane, adapter file store). `assertIdentityId()`/`safeIdentityDir()` require `^identity_[0-9a-f]{16}$`, minted by gateway POST `/identities` (social + practice lanes). `resolveClaimIdentity()` returns only `demo-owner` when `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` and explicitly does not consume the OIDC lane (claim-identity.txt:19-30; header comment corrected 2026-09-23).
- CALLER: Google callback flow / social UI / claim routes. CALLEE: adapter file store / PING gateway / demo seam. WRITER: callback-flow (`signInOrSignUp`), `createFydIdentity`, `resolveClaimIdentity`. READER: `toAccount`, `assertIdentityId`, claim routes.
- AUTHORITY: none declared for cross-namespace mapping; each lane is its own authority. CLASSIFICATION: CONFLICTING / SPLIT AUTHORITY. CONFIDENCE: high.
- BROKEN BOUNDARY: a Google-authenticated UUID cannot enter the social signing path, and neither real lane maps to the claim actor. DEPENDENCIES: core `UnifiedEventRuntime` (event spine only; no identity bridge in core for these). AFFECTS AGENTS: Ask FYD owner mode (future), claim UI, social UI, any future owner-auth lane.
- Remediation: see M-IDENT-1.

### R2. Duplicate identity minting on retry; orphaned gateway identity on key-store failure
- DOMAIN: identity. COMPONENT: `src/fyd/social/actions.ts` (`createFydIdentity`).
- CLAIM: identity creation is a non-transactional three-step (keygen, gateway POST `/identities`, local key store, profile OBJECT_CREATED). A failure after the gateway commit leaves a live gateway identity; a retry mints a second one.
- EVIDENCE: ordering in `createFydIdentity`: `generateKeypair` -> `POST /identities` -> `assertIdentityId` -> `storeKey` -> profile `submitEnvelope` -> profile `attestObjectCreated`. `storeKey` throws after the gateway has committed; the private key exists only in the local variable at that moment and is lost when the exception propagates (unrecoverable signing loss). Retrying the same human intent re-runs keygen + POST `/identities`, minting a second identity (no idempotency key, no handle-reservation).
- CALLER: `POST /api/fyd/social/identity`. CALLEE: gateway `/identities`, `safeIdentityDir` key store, gateway `/events`. WRITER: gateway (identity row), key store, journal. READER: attestation gate (profile only, not the identity row).
- AUTHORITY: gateway mints the id; adapter escrows the key. CLASSIFICATION: PARTIAL COMMIT / DUPLICATE MINT. CONFIDENCE: high.
- BROKEN BOUNDARY: no reservation of the identity before key generation; no attestation that the identity row exists (the attestation gate checks the profile event only). DEPENDENCIES: gateway `/identities`. AFFECTS AGENTS: social UI identity switcher, any future owner binding.
- Remediation: see M-IDENT-2.

### R3. Practice lane: second POST /identities mint with divergent validation
- DOMAIN: identity. COMPONENT: `src/lib/ping/ping-object-reader.ts` (`createIdentity`, por-full.txt:582-643).
- CLAIM: a second, independent dev-identity mint lane exists with weaker identity-format validation than the social lane.
- EVIDENCE: `createIdentity` POSTs `/identities` then reads `str(rec?.identityId) || str(rec?.id)` (por-full.txt:613) with NO format assertion, while the social lane asserts `^identity_[0-9a-f]{16}$` before storing. A divergent-format gateway response would enter the practice key store (`storeDevKeypair`) while the social lane would refuse it.
- CALLER: `POST /api/practice/identities` (open dev route, security F7). CALLEE: gateway `/identities`. WRITER: gateway, dev key store. READER: practice session, `signAsIdentity`.
- AUTHORITY: gateway mints; two adapter validators disagree. CLASSIFICATION: DIVERGENT VALIDATION / DUPLICATE MINT PATH. CONFIDENCE: high.
- BROKEN BOUNDARY: two lanes, one authority, two acceptance rules. DEPENDENCIES: gateway `/identities`. AFFECTS AGENTS: practice UI, social UI (shared gateway identity namespace).
- Remediation: see M-IDENT-3.

### R4. Relationship status vocabulary split across lanes
- DOMAIN: social graph. COMPONENT: `src/fyd/social/readers.ts:108` (WORKTREE), `src/fyd/social/attestation-gate.ts:58`, `src/lib/ping/ping-object-reader.ts` (practice follow, por-full.txt:645-654).
- CLAIM: the two write lanes use different status vocabularies and the two read models disagree on unknown values.
- EVIDENCE: practice-lane `follow()` submits RELATIONSHIP_CREATED with NO `status` field; the social lane submits explicit `"active"`/`"inactive"`. `readers.ts` maps `p.status === "inactive" ? "inactive" : "active"` (silent default to active for missing/unknown). `attestation-gate.ts` maps missing to `"active"` but passes any other string through (so `"revoked"` stays `"revoked"` there and fails attestation, while readers would call it `"active"`).
- CALLER: follow/unfollow actions. CALLEE: gateway `/events`. WRITER: social actions, practice reader. READER: `readNetRelationships`, `attestRelationshipState`, feed, counts.
- AUTHORITY: none declared for the relationship status vocabulary. CLASSIFICATION: CONFLICTING READ MODELS / SILENT DEFAULT. CONFIDENCE: high.
- BROKEN BOUNDARY: same predicate (`follows`), two vocabularies; a reader can report "active" where the gate cannot attest it. DEPENDENCIES: gateway event schema (unenforced). AFFECTS AGENTS: social UI counts, practice UI follow state, attestation gate.
- Remediation: see M-SOCIAL-1.

### R5. Claim release destroys structured verification proof (F19)
- DOMAIN: claim. COMPONENT: `src/fyd/claim/machine.ts` (`release`), `src/app/api/fyd/claims/[resourceId]/release/route.ts`.
- CLAIM: releasing a verified claim sets `verification: null`; the history keeps only a human-readable prior-verification detail, not the structured `VerificationProof` fields (method, basis, artifacts, proofNote, verifiedAt, verifiedBy).
- EVIDENCE: `release()` transitions CLAIMED/VERIFIED-CONTROLLED -> OBSERVED with `claimedBy: null, verification: null`; the appended history event detail is prose. Re-claiming later cannot reconstruct what was verified, by whom, on what basis.
- CALLER: release route. CALLEE: claim machine. WRITER: release route (`writeClaim`). READER: GET claim route, claim UI.
- AUTHORITY: claim state machine owns transitions; it drops the proof. CLASSIFICATION: EVIDENCE DESTRUCTION. CONFIDENCE: high.
- BROKEN BOUNDARY: release is a lifecycle transition, not an authorization revocation, yet it erases the proof material that justified the authorization. DEPENDENCIES: claim store. AFFECTS AGENTS: claim UI, any future dispute/audit consumer.
- Remediation: see M-CLAIM-1.

### R6. Inconsistent gates across the claim mutation surface
- DOMAIN: authorization. COMPONENT: `src/app/api/fyd/claims/[resourceId]/{verify,claim,release}/route.ts`.
- CLAIM: `verify` requires demo-owner mode AND a private host; `claim` and `release` require only the env flag (no host check); `release` ignores the request object entirely.
- EVIDENCE: verify-route.txt:43-63 (`demoDenied` with `isDemoOwnerModeEnabled()` + `isPrivateHost(host)`). claim/route.ts and release/route.ts: no `demoDenied`, no header read; release signature is `POST(_req, ...)` (release route line 16-19). Both rely on `resolveClaimIdentity()`, which returns `demo-owner` for every caller when the flag is set (claim-identity.txt:19-30), so the "only the identity holding the claim can release it" check (release route line 41) never fires in demo mode.
- CALLER: claim UI / any HTTP client. CALLEE: claim machine. WRITER: claim/release/verify routes. READER: GET claim route.
- AUTHORITY: demo seam (inconsistent). CLASSIFICATION: INCONSISTENT GATE / MISSING AUTHORIZATION. CONFIDENCE: high.
- BROKEN BOUNDARY: with the env flag set on a LAN host, any network client can claim/release any resource (subject to DEMO_CONTEXT_IDS), while verify is host-gated. The routes disagree on what "demo owner mode" requires. DEPENDENCIES: `isDemoOwnerModeEnabled`, `isPrivateHost`. AFFECTS AGENTS: claim UI, owner demo surface.
- Remediation: see M-AUTH-1.

### R7. `authenticatedAt` minted without authentication
- DOMAIN: identity. COMPONENT: `src/fyd/claim/identity.ts:25`.
- CLAIM: the demo claim identity stamps `authenticatedAt: new Date().toISOString()` for an identity that was never authenticated.
- EVIDENCE: claim-identity.txt:21-29. The field name asserts an authentication event; the authNote honestly disclaims it. Any consumer that reads the field without reading the note (logs, future audit) inherits a false authentication timestamp.
- AUTHORITY: demo seam. CLASSIFICATION: FAKE VERIFICATION SIGNAL (weak form). CONFIDENCE: high.
- BROKEN BOUNDARY: none live (the note disclaims), but the field is a trap for future consumers. DEPENDENCIES: none. AFFECTS AGENTS: future audit consumers.
- Remediation: see M-CLAIM-2.

### R8. Capability seam ignores the requested capability
- DOMAIN: authorization. COMPONENT: `src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts:159-172`.
- CLAIM: `DemoOwnerContext.evaluateCapability(objectId, capability)` ignores both arguments and always returns the seeded `owner.correct-fact` verdict.
- EVIDENCE: parameters named `_objectId`, `_capability`; the comment states "the capability argument is part of the interface for the future PING implementation; the demo chain knows only owner.correct-fact." The returned `capability` field is the verdict's, not the request's, so a caller asking about `owner.publish` gets `{ capability: "owner.correct-fact", allowed: true }` and any caller that checks only `allowed` misreads the answer.
- CALLER: overrides route (currently hardcodes the same string, so no live misread). CALLEE: `resolveOwnerCorrectionChain`. WRITER: n/a. READER: route, `capabilityImpactLine`.
- AUTHORITY: the interface promises per-action evaluation; the implementation does not. CLASSIFICATION: BROKEN SEAM CONTRACT / MISBOUND ANSWER. CONFIDENCE: high.
- BROKEN BOUNDARY: the seam's contract ("INTENT -> IDENTITY -> CAPABILITY + POLICY evaluation for one owner action") is not honored; the seam cannot be trusted by any future caller that passes a different capability. DEPENDENCIES: demo-chain, capability.ts. AFFECTS AGENTS: overrides route, any future PING-backed context.
- Remediation: see M-AUTH-2.

### R9. Overrides route evaluates one capability for every command type
- DOMAIN: authorization. COMPONENT: overrides route (propose stage line 259, approve stage line 371 in the pre-sibling capture; current line numbers may shift by the comment-only diff).
- CLAIM: every owner command (move-service, hide, add-service, set-contact-field, set-address-visibility, confirm) is capability-gated against the single hardcoded string `"owner.correct-fact"`.
- EVIDENCE: `ctx.evaluateCapability(objectId, "owner.correct-fact")` at both stages. Combined with R8, the evaluation does not even depend on the string; but the intent is wrong: a presentation-tier command (move-service) is checked against a factual-correction capability.
- AUTHORITY: capability.ts defines five capabilities; the route uses one. CLASSIFICATION: MISBOUND AUTHORIZATION. CONFIDENCE: high.
- BROKEN BOUNDARY: `owner.publish` is deny-by-default in the capability table but is never evaluated on this route; if a future command type carries publish-like effects, the gate would still answer the correct-fact question. DEPENDENCIES: capability.ts, owner-context. AFFECTS AGENTS: Manage surface, /build planner.
- Remediation: see M-AUTH-3.

### R10. evaluateCapability has no default arm (latent)
- DOMAIN: authorization. COMPONENT: `src/fyd/owner-mode/capability.ts:133-185`.
- CLAIM: the switch over `OwnerCapability` has no default; a runtime string outside the union returns `undefined`.
- EVIDENCE: switch cases cover all five union members; no default. The TypeScript signature blocks this at compile time, and the only `OwnerContext` implementation ignores the argument (R8), so this is latent, not live.
- CLASSIFICATION: LATENT DEFECT. CONFIDENCE: medium. BROKEN BOUNDARY: none live.
- Remediation: see M-AUTH-4.

### R11. F20: owner store key split, slug vs canonical object id
- DOMAIN: ownership state. COMPONENT: `src/fyd/object/view.ts:220`, `src/fyd/object/view.ts:316`, `src/fyd/object/by-id.ts:40`, `src/fyd/object/owner-store.ts` (`applyOwnerCommand`), `src/fyd/data/ping-object-source.ts` (`getPingObjectGraphSync`).
- CLAIM: two live owner-store keys exist for the same business object; writes on one are invisible on the other.
- EVIDENCE: `composeObjectView(graph, siteId, obj, viewId, overridesKey)` reads `readOverrides(overridesKey)` (view.ts:220). Slug path: `composeObjectView(graph, slug, business, slug, slug)` (view.ts:316), so overrides key = site slug, file `data/fyd-owner/<slug>.json`. By-id path: `composeObjectView(graph, siteId, obj, obj.id, obj.id)` (by-id.ts:40), so overrides key = canonical object id, file `data/fyd-owner/<canonical-id>.json`. The overrides route treats the route param as tenant and writes to whichever key the caller supplies; `ownerStateDigest(objectId)` (patch-loop.ts:44-46) binds digests per key, so the stale-proposal protection does not catch key confusion. Public page render, Ask FYD overlay (`applyOwnerFieldCorrections(bundle.graph, siteId)` in ask-pipeline.ts:86), and the slug ObjectView all key by slug; the Node/ObjectView-by-id path keys by canonical id.
- CALLER: Manage surface (by-id), public pages (slug), overrides route (either). CALLEE: owner-store, owner-events. WRITER: overrides route approve, `applyOwnerCommand`. READER: view, by-id, ask overlay, patch-loop digests.
- AUTHORITY: none; the key model is implicit. CLASSIFICATION: SPLIT WRITE MODEL / SILENT DIVERGENCE. CONFIDENCE: high.
- BROKEN BOUNDARY: an owner correction applied on the Node surface never appears on the public page or in Ask FYD answers, and vice versa; both keys match the owner-path regex and the tenant pattern, so no boundary refuses the confusion. DEPENDENCIES: tenant-context, ping-object-source. AFFECTS AGENTS: Manage surface, Ask FYD, /build planner, public pages.
- Remediation: see M-OWNER-1.

### R12. Owner event log: silent corruption wipe and lost-update race
- DOMAIN: persistence. COMPONENT: `src/fyd/object/owner-events.ts` (`readOwnerEvents`, `appendOwnerEvent`, `writeLogFile`, `ownerPath`).
- CLAIM: a corrupt or temporarily unreadable owner log is silently replaced by a log containing only the newest event; concurrent appends race on a shared temp file.
- EVIDENCE: `readOwnerEvents` catches every read/parse error and returns `[]`; `appendOwnerEvent` reads that result and writes a new log with only the new event, so one bad read destroys all prior audit history. Stored events are shallow-validated (no event-id recompute, no sequence contiguity/uniqueness check, no generator check; arbitrary string types accepted until reducer execution). `writeLogFile` uses a shared `<path>.tmp` (not unique), so concurrent read-modify-write calls collide or lose an append.
- CALLER: `applyOwnerCommand`, `lastEventId`, patch-loop digests. CALLEE: fs. WRITER: `appendOwnerEvent`. READER: `readOwnerEvents`, `readOverrides`.
- AUTHORITY: the event log is the owner-state authority; it cannot defend itself. CLASSIFICATION: SILENT FALLBACK / LOST UPDATE / INTEGRITY BYPASS. CONFIDENCE: high.
- BROKEN BOUNDARY: the audit trail's durability depends on every read succeeding; a single failed read is indistinguishable from an empty log. DEPENDENCIES: fs layout `data/fyd-owner/`. AFFECTS AGENTS: overrides route, Ask FYD (via overlays), Manage surface history.
- Remediation: see M-PERSIST-1.

### R13. Claim store: ambiguous absence and lost-update race
- DOMAIN: persistence. COMPONENT: `src/fyd/claim/store.ts` (`readClaim`, `writeClaim`).
- CLAIM: `readClaim` conflates missing record, invalid id, corrupt record, and fs failure into `null`; writes race on `<path>.tmp-<pid>`.
- EVIDENCE: catch-all in `readClaim` returns null; validation is shape-level only (no deep check of `claimedBy`, `verification`, history). Temp path includes pid but not a per-write unique token, so concurrent writes in one process collide. (Pre-compaction read; behavior unchanged in worktree.)
- CLASSIFICATION: AMBIGUOUS ABSENCE / LOST UPDATE RISK. CONFIDENCE: medium-high.
- BROKEN BOUNDARY: the claim/release/verify routes cannot distinguish "no claim" from "claim store unreadable". DEPENDENCIES: fs. AFFECTS AGENTS: claim UI, verify route.
- Remediation: see M-PERSIST-2.

### R14. Readers silently default unknown relationship status to active
- DOMAIN: social graph. COMPONENT: `src/fyd/social/readers.ts:108` (WORKTREE), `src/fyd/social/attestation-gate.ts:58`.
- CLAIM: a relationship event with missing or unknown status is projected as `active`; the attestation gate disagrees on non-empty unknown strings.
- EVIDENCE: `status: p.status === "inactive" ? "inactive" : "active"` (readers); `status: typeof p.status === "string" ? p.status : "active"` (gate). A `"revoked"` status reads active in the feed/counts but unattestable in the gate.
- CLASSIFICATION: SILENT DEFAULT / CONFLICTING READ MODELS. CONFIDENCE: high. (Same root as R4; this row is the read-side.)
- Remediation: see M-SOCIAL-1.

### R15. Tenant scoping in queryFydSiteOverlays is client-side, not authority-side
- DOMAIN: tenancy. COMPONENT: `src/lib/ping/ping-object-reader.ts` (`queryFydSiteOverlays`, por-full.txt:277-318).
- CLAIM: the "tenant scoping at the authority" comment is false; the reader fetches every tenant's FYD_SITE_OVERLAY events and filters in adapter JS.
- EVIDENCE: `gwFyd('/events/FYD_SITE_OVERLAY')` with no siteId parameter (por-full.txt:279); `if (str(p.siteId) !== siteId) continue;` (por-full.txt:298) after all payloads have crossed the HTTP boundary. The interface docstring (por-full.txt:154-158) claims "The siteId filter is enforced inside the reader: a call can never observe another tenant's overlays."
- CLASSIFICATION: OVERSTATED ISOLATION / FAKE BOUNDARY. CONFIDENCE: high.
- BROKEN BOUNDARY: any reuse of this function as a trust boundary inherits a false guarantee; other tenants' overlay payloads are visible to the adapter process. DEPENDENCIES: FYD journal gateway `/events`. AFFECTS AGENTS: Ask FYD bundle loader, customize lane, fyd-tenant-graph.
- Remediation: see M-TENANT-1.

### R16. Tenant graph carries hardcoded freshness metadata
- DOMAIN: read model. COMPONENT: `src/fyd/data/fyd-tenant-graph.ts`.
- CLAIM: `generatedAt` and `eventSequences` are returned from hardcoded per-tenant pins dated 2026-09-21, not computed from the fetched overlays.
- EVIDENCE: graph rebuilt from current journal overlays, but metadata fields come from static pins. A fresh graph is presented with stale sequence-window metadata.
- CLASSIFICATION: FAKE FRESHNESS METADATA / CONFLICTING READ MODEL. CONFIDENCE: high.
- BROKEN BOUNDARY: consumers cannot tell which overlay events the graph actually incorporated. DEPENDENCIES: `queryFydSiteOverlays`. AFFECTS AGENTS: Ask FYD, customize lane, /build planner. (Also confirms the authority-map's fixture-vs-projection divergence: the path uses fixture base graphs.)
- Remediation: see M-TENANT-2.

### R17. Overlay op validation is shallow
- DOMAIN: tenancy. COMPONENT: `src/fyd/data/fyd-tenant-graph.ts` (`applyOverlayOps`).
- CLAIM: `add_object` requires only a string id + no duplicate, then casts to `PingObject`; `add_relationship` requires only a string id + no duplicate, then casts to `PingRelationship`. No validation of required fields, endpoints, predicates, endpoint existence, or tenant ownership.
- EVIDENCE: casts after minimal checks (pre-compaction read).
- CLASSIFICATION: VALIDATION GAP. CONFIDENCE: high.
- BROKEN BOUNDARY: a gateway-accepted but malformed op produces an internally invalid graph that downstream treats as typed. DEPENDENCIES: gateway `/events` (no auth, R18). AFFECTS AGENTS: Ask FYD, site generator.
- Remediation: see M-TENANT-3.

### R18. Overlay write lane: unauthenticated gateway event route
- DOMAIN: authorization. COMPONENT: `src/fyd/customize/server.ts:8-9` (comment), `emitOverlayEvent` (customize-server.txt:78-122).
- CLAIM: the FYD journal gateway's event route has no auth, so the adapter's demo-owner gate can be bypassed at the persistence authority.
- EVIDENCE: "appends a FYD_SITE_OVERLAY event to the FYD demo journal (the repo-booted gateway; no auth on its event route)" (customize-server.txt:8-9). `emitOverlayEvent` POSTs `{ event_type: "FYD_SITE_OVERLAY", aggregate_id: "fyd-site:" + siteId, event_data: { siteId, ops } }` with no credential. Any process that can reach the gateway can journal overlay ops for any siteId, including `clear_presentation_intent` and (via R17) object/relationship injections into tenant graphs.
- CALLER: customize approve/clear (gated), or any direct HTTP client (ungated). CALLEE: FYD journal gateway. WRITER: gateway. READER: `queryFydSiteOverlays`, dump pipeline.
- AUTHORITY: the gateway is the write authority and enforces nothing. CLASSIFICATION: UNENFORCED WRITE LANE / GATE BYPASS AT THE AUTHORITY. CONFIDENCE: high.
- BROKEN BOUNDARY: the Next.js demo gate is not the enforcement point; the enforcement point does not exist. DEPENDENCIES: FYD journal gateway deployment. AFFECTS AGENTS: Ask FYD, site generator, customize lane, any tenant's rendered site.
- Remediation: see M-AUTH-5.

### R19. Lane D takes the tenant id from the request body
- DOMAIN: tenancy. COMPONENT: `src/app/api/fyd/customize/route.ts` (customize-route.txt:365-376, 402, 409).
- CLAIM: the customize approve/clear lane keys journal writes by a body-supplied `siteId` with no tenant-context seam.
- EVIDENCE: `const siteId = (body.siteId ?? "").trim()` (line 373); no `requireTenantContext`, no DNS-slug validation, no `assertTenantKey`. `handleClear` calls `emitOverlayEvent(siteId, ...)` without even `loadCustomizedSite` (no existence check). Contrast the overrides route's G4 (route-path tenant) and the ask route's tenant_mismatch refusal.
- CLASSIFICATION: MISSING TENANT BOUNDARY. CONFIDENCE: high.
- BROKEN BOUNDARY: in demo mode any caller can journal overlay events under any siteId string, including malformed ones; combined with R18 the journal accepts them. DEPENDENCIES: gateway. AFFECTS AGENTS: customize UI, any tenant site.
- Remediation: see M-TENANT-4.

### R20. Decorative idempotency in the social write lane
- DOMAIN: social. COMPONENT: `src/fyd/social/actions.ts` (`fydActionId`), `src/fyd/social/envelope.ts` (`buildSignedEnvelope`), `src/fyd/social/transition-id.ts`.
- CLAIM: the "deterministic action ID" is computed but never submitted; it is response-local bookkeeping, not gateway-visible idempotency material.
- EVIDENCE: `fydActionId()` computed in follow/unfollow/post; `buildSignedEnvelope()` receives only event type + payload; the actionId is in neither payload nor metadata. `producedAt: new Date().toISOString()` changes every envelope. Follow dedupe is a pre-read of net state (race-prone); post creation has no pre-read dedupe; the post actionId hashes only the first 80 chars of text, so distinct posts sharing a prefix collide even in local result identity.
- CLASSIFICATION: DECORATIVE IDEMPOTENCY / BROKEN BOUNDARY. CONFIDENCE: high.
- BROKEN BOUNDARY: retries and double-submits are not deduplicated at the authority; the idempotency story exists only in the response. DEPENDENCIES: gateway (no idempotency key support observed). AFFECTS AGENTS: social UI (double-post on retry).
- Remediation: see M-SOCIAL-2.

### R21. submitEnvelope coerces failure-shaped success
- DOMAIN: social. COMPONENT: `src/fyd/social/actions.ts` (`submitEnvelope`).
- CLAIM: any HTTP-success body is accepted; missing `event_id` becomes `""`, missing status becomes `"ok"`.
- EVIDENCE: coercions in `submitEnvelope` (pre-compaction read). Downstream `attestObjectCreated({ eventId: "" })` would then fail closed (honest), but the follow path's `expectEventId` binding and logging treat the coerced values as real.
- CLASSIFICATION: FAKE SUCCESS RISK. CONFIDENCE: high.
- BROKEN BOUNDARY: the write path manufactures the two fields the read-back path uses as evidence. DEPENDENCIES: gateway response shape. AFFECTS AGENTS: social UI, attestation gate.
- Remediation: see M-SOCIAL-3.

### R22. Practice BFF: systemic silent fallbacks turn outages into emptiness
- DOMAIN: read model. COMPONENT: `src/lib/ping/ping-object-reader.ts` (por-full.txt:461, 775, 928, 1019, 1026, 1028, 1062, 1200, 1212, 1246, 1248, 1258).
- CLAIM: gateway/read failures are caught and replaced with `[]`/`null`, which the UI renders as genuine emptiness.
- EVIDENCE: `getNode` composes with `this.getRelationships().catch(() => [] as PingRelationship[])` (por-full.txt:1200); `allObjects(...).catch(() => ({...}))` (1212, 1258); `listIdentities(...).catch(() => [])` (1019, 1248); `getFeed(...).catch(() => [])` (1026); `getObject(...).catch(() => null)` (1028, 1062); `queryEvents("OBJECT_UPDATED").catch(() => [])` (461, 775). This is the exact "service failure -> []" pattern SOUL.md #11 forbids. The FYD social readers (`readJournalEvents`) throw instead (fail-closed), so the two lanes disagree on failure semantics.
- CLASSIFICATION: SILENT FALLBACK (systemic). CONFIDENCE: high.
- BROKEN BOUNDARY: a gateway outage renders as "no relationships / no objects / no identities / empty feed" with no error surfaced. DEPENDENCIES: gateways. AFFECTS AGENTS: practice UI (circle card, discovery feed, node view, identities list).
- Remediation: see M-READ-1.

### R23. Owner attestation gate: emit path unwired on the server
- DOMAIN: authorization. COMPONENT: `src/fyd/owner-mode/attestation-gate.ts` (`attest`), `src/fyd/owner-mode/demo-owner-mode.tsx:61`, `src/fyd/owner-mode/capability.ts:15-16`.
- CLAIM: the failure-honesty gate's `emit` callback is never wired to persistence; the only caller is a client-side demo walkthrough that passes `emit: undefined`.
- EVIDENCE: `runAttest` calls `attest("regen-complete", evidence, undefined, ...)` (demo-owner-panel.txt:61); the result is rendered as walkthrough state and dropped. The server-side owner mutation path (overrides approve) never calls `attest`. The capability.ts header comment ("owner attestations additionally pass the attestation gate (./attestation-gate.ts)") is true only for the client demo, not for any server mutation.
- CLASSIFICATION: ORPHAN PRODUCER / MISLEADING SEAM COMMENT. CONFIDENCE: high.
- BROKEN BOUNDARY: the one mechanism that could bind evidence preconditions to owner mutations is not on the mutation path. DEPENDENCIES: none. AFFECTS AGENTS: overrides route (could consume), demo panel.
- Remediation: see M-AUTH-6.

### R24. Orphan capabilities: attest-regen (server) and edit-visibility
- DOMAIN: authorization. COMPONENT: `src/fyd/owner-mode/capability.ts` (union + `ALL_CAPABILITIES`).
- CLAIM: `owner.edit-visibility` has no callers anywhere; `owner.attest-regen` is evaluated only by the client demo panel for display, never on any server route.
- EVIDENCE: grep for `owner.edit-visibility` returns only capability.ts; grep for `owner.attest-regen` returns no route.ts caller; demo-owner-mode.tsx:48-50 evaluates it for the walkthrough UI.
- CLASSIFICATION: ORPHAN PRODUCER (capability definitions without enforcement consumers). CONFIDENCE: high.
- BROKEN BOUNDARY: the capability table implies an enforcement surface that does not exist; future code may assume these are enforced. DEPENDENCIES: none. AFFECTS AGENTS: any future owner lane.
- Remediation: see M-AUTH-7.

### R25. Site-patch proposal pipeline is unreachable in the FYD ask lane
- DOMAIN: ask. COMPONENT: `src/fyd/ask/visitor-answer.ts:461`, `src/fyd/ask/site-patch.ts` (`sitePatchRefusal`), `src/lib/ping/ping-object-reader.ts` (`submitProposal`, por-full.txt:1318-1348).
- CLAIM: the FYD ask lane can never draft a site_patch proposal (`grants` is always `[]`), while the practice lane can consume site_patch proposals through `submitProposal` with its own grant logic.
- EVIDENCE: visitor-answer.ts:461 sets `grants: []`; `sitePatchRefusal` refuses when `!ctx.grants.includes("site.propose")` (site-patch.txt:125-127). `draftSitePatchProposal`, `signSitePatchDraft`, `verifySignedSitePatchDraft`, `buildSitePatchCard` are fully built and tested (ask-fyd.test.ts) but unreachable in production. The practice reader's `submitProposal` handles `proposal.kind === "site_patch"` with controller + `grantsForViewer` checks and envelope-digest binding (por-full.txt:1318-1348).
- CLASSIFICATION: ORPHAN PRODUCER / CROSS-LANE SPLIT. CONFIDENCE: high.
- BROKEN BOUNDARY: proposal drafting and proposal approval live in different lanes with different grant authorities; no end-to-end path exists in either lane alone. DEPENDENCIES: grants.ts, ask-composer. AFFECTS AGENTS: Ask FYD UI (proposal affordance absent), practice UI.
- Remediation: see M-ASK-1.

### R26. /build planner ignores service order/visibility (orphan effect)
- DOMAIN: projection. COMPONENT: overrides patch-loop (`buildPatchPreview`, patchloop evidence lines 189-193, 203-206).
- CLAIM: owner service reorder/hide mutations are journaled and applied to the ObjectView, but the /build page planner consumes only field corrections, so the mutation has no effect on one primary projection.
- EVIDENCE: preview text: "Note: the /build page planner currently consumes owner field corrections, not service order." and "...not service visibility." The approve path still journals the event and reports success.
- CLASSIFICATION: ORPHAN CONSUMER (projection gap). CONFIDENCE: high (self-admitted).
- BROKEN BOUNDARY: a durable, digest-bound, "successful" owner mutation silently does nothing on /build. DEPENDENCIES: /build planner. AFFECTS AGENTS: Manage surface, /build page.
- Remediation: see M-OWNER-2.

### R27. Source-value evidence asserts absence on read failure
- DOMAIN: evidence. COMPONENT: overrides route approve stage (`sourceValue` block, overrides-route.txt:401-415), `patch-loop.ts` `sourceFieldValue` (catch -> null, lines 128-137).
- CLAIM: when the source-graph read fails transiently, the approval records "the source listed no value at correction time" instead of "the source read failed".
- EVIDENCE: try/catch around `getPingObjectGraphSync(objectId, { ownerOverlay: false })` degrades to `sourceValue: null`; `sourceSnapshotEvidence(null)` renders as absence. The evidence record cannot distinguish a failed read from a genuinely empty field.
- CLASSIFICATION: SILENT FALLBACK IN EVIDENCE. CONFIDENCE: high.
- BROKEN BOUNDARY: an evidence-bearing record can assert a false absence. DEPENDENCIES: ping-object-source. AFFECTS AGENTS: Ask FYD drift detection (`sourceDrifted`), Manage surface.
- Remediation: see M-OWNER-3.

### R28. Claim creation accepts weak sourceUrl and nonexistent resources
- DOMAIN: claim. COMPONENT: `src/app/api/fyd/claims/[resourceId]/claim/route.ts:53-63`.
- CLAIM: `sourceUrl` is accepted on a `startsWith("http")` check (so `"httpxyz"` passes; no URL parse), and claiming an arbitrary nonexistent resourceId creates the record then claims it.
- EVIDENCE: lines 53-63; `readClaim(resourceId) ?? createObserved(resourceId, sourceUrl)` then `claim(current, identity)`.
- CLASSIFICATION: WEAK VALIDATION. CONFIDENCE: high.
- BROKEN BOUNDARY: provenance-ish field (`sourceUrl`) and the resource itself are caller-asserted. In demo mode this is by design; the shape will be load-bearing when real claiming lands. DEPENDENCIES: none. AFFECTS AGENTS: claim UI.
- Remediation: see M-CLAIM-3.

### R29. (Consolidated into R4/R14.)

### R30. Attestation reads are window-truncated at 1000 events
- DOMAIN: social. COMPONENT: `src/fyd/social/attestation-gate.ts:32`, `:151`.
- CLAIM: `?limit=1000` is hardcoded; if the journal exceeds 1000 RELATIONSHIP_CREATED/OBJECT_CREATED events, attestation can attest a stale row as latest or reject a valid old event.
- EVIDENCE: fetch URLs with `?limit=1000`; no pagination, no cursor. Failure mode is fail-closed (ATTESTATION_REJECTED), so this degrades to false rejection, not false attestation, unless the gateway returns newest-first and the true latest row is outside the window.
- CLASSIFICATION: BOUNDED-WINDOW CORRECTNESS RISK. CONFIDENCE: medium.
- BROKEN BOUNDARY: "latest wins" is only latest-within-window. DEPENDENCIES: gateway `/events` ordering. AFFECTS AGENTS: social UI (follow/post success reporting).
- Remediation: see M-SOCIAL-4.

### R31. Feed defaults missing visibility to public
- DOMAIN: social. COMPONENT: `src/fyd/social/readers.ts:283` (WORKTREE).
- CLAIM: `(p.visibility || "public") === "public"` treats a missing visibility field as public.
- EVIDENCE: line 283. A post event without an explicit visibility is served in the feed.
- CLASSIFICATION: SILENT DEFAULT (visibility). CONFIDENCE: high.
- BROKEN BOUNDARY: the visibility vocabulary's safe default should be non-public; the reader chose the permissive one. DEPENDENCIES: event schema. AFFECTS AGENTS: social feed.
- Remediation: see M-SOCIAL-5.

### R32. Host-header trust on the demo gate (F3, re-confirmed)
- DOMAIN: authorization. COMPONENT: verify-route.txt:43-63, overrides route `demoDenied`, customize-route `demoDenied`, `src/fyd/owner-mode/gate.ts` (`isPrivateHost`).
- CLAIM: the demo gate trusts the raw `Host` header (`request.headers.get("host")`) for the private-network test.
- EVIDENCE: all three `demoDenied` implementations read `host` from headers and call `isPrivateHost(host)`; comments honestly label the mode non-authentication. Absent host fails closed ("" -> false). Spoofable by any client that can set Host (direct binds, misconfigured proxies).
- CLASSIFICATION: DEMO AUTHORIZATION AS MUTATION AUTHORITY (inherited F3, still live). CONFIDENCE: high.
- BROKEN BOUNDARY: the only thing between a network client and durable owner mutations is a header the client controls plus an env flag. DEPENDENCIES: deployment topology. AFFECTS AGENTS: overrides, customize, verify routes.
- Remediation: see M-AUTH-8. (Standing: demo only; the fix matters when any of these routes approaches production.)

### R33. Tenant-id pattern accepts non-tenant keys
- DOMAIN: tenancy. COMPONENT: `src/fyd/tenant/tenant-context.ts:50` (`TENANT_ID_PATTERN = /^[a-z0-9-]{1,64}$/`).
- CLAIM: a canonical object id (e.g. `website-business-<hex>`) passes `requireTenantContext` as a "tenant", so the tenant boundary cannot catch F20 key confusion.
- EVIDENCE: pattern matches lowercase alnum+hyphen; `createOwnerContext(objectId)` feeds the route param straight into `requireTenantContext`. A by-id key is therefore a "valid tenant" and `assertTenantKey` (equality check) cannot distinguish it from the real tenant.
- CLASSIFICATION: WEAK TENANT KEY MODEL. CONFIDENCE: high.
- BROKEN BOUNDARY: the tenant seam validates syntax, not tenant existence; combined with R11, owner state can be namespaced under keys that are not tenants. DEPENDENCIES: tenant-context. AFFECTS AGENTS: overrides route, scoped stores.
- Remediation: see M-TENANT-5.

### R34. Readers tiebreak dropped created_at at base (observed; sibling-fixed in worktree)
- DOMAIN: social. COMPONENT: `src/fyd/social/readers.ts` (`winsOver`).
- CLAIM: at base a69bb68f, `winsOver` ordered by (sequence, event_id) only, dropping `created_at` despite the header comment claiming (sequence, created_at, event_id); the attestation gate used (created_at, event_id), so the two disagreed on ties.
- EVIDENCE: base diff hunk (worktree-diff.txt): added `if (a.created_at !== b.created_at) return a.created_at > b.created_at;` and the `created_at` field on `NetRelationship`. The new regression test `src/fyd/social/__tests__/readers-tiebreak.test.ts` pins the fixed ordering and documents the pre-fix disagreement.
- CLASSIFICATION: CONFLICTING READ MODELS (base defect). CONFIDENCE: high.
- BROKEN BOUNDARY: was live at base; now corrected + pinned in the worktree by a sibling worker. No action from S7. Recorded for history classification.
- Remediation: none (sibling closed it). Noted so a future rebase does not resurrect the base behavior.

## Mechanism lifecycle traces

Stages: DEFINED -> IMPORTED -> CONSTRUCTED -> INITIALIZED -> STARTED -> REGISTERED -> CALLED -> PERSISTING -> READ BACK -> RESTARTED -> TESTED.

### M1. OIDC identity mint (adapter file store)
- DEFINED: `src/fyd/identity/principal.ts` (`deriveIdentityId` UUIDv5, `signInOrSignUp`, `linkProviderAccount`), `provider.ts`, `callback-flow.ts`, `session.ts`, `file-store.ts`, `audit.ts`, `config.ts`.
- IMPORTED: auth routes import the flow functions; nothing in the claim/social/practice lanes imports them (R1).
- CONSTRUCTED: `completeGoogleCallback` builds the binding via `signInOrSignUp(store, verified, nowIso)`; session cookie via `serializeSessionCookie`.
- INITIALIZED: `requireReady(config)` (503 when provider credentials absent); PKCE `newCodeVerifier`, `newState`, `newNonce`.
- STARTED: `beginGoogleStart` (authorization URL + state cookie).
- REGISTERED: identity binding persisted in the adapter file store (`IdentityBindingStore`); audit appended (`appendAuthAudit`).
- CALLED: Google callback route -> `completeGoogleCallback`.
- PERSISTING: file store under the identity dir; provider tokens discarded after verification (callback-flow lines 166-168).
- READ BACK: `toAccount` rejects non-UUID identities; `resolveClaimIdentity` never reads this store (R1).
- RESTARTED: file store survives restart; sessions are cookie-bound (secret-dependent).
- TESTED: `callback-flow.test.ts`, `principal.test.ts`, `provider.test.ts`, `provider-seam.test.ts`, `session.test.ts`, `file-store.test.ts`, `route.test.ts`, `demo-owner-path.test.ts` (identity lane has the strongest harness).

### M2. Social dev identity mint
- DEFINED/IMPORTED: `src/fyd/social/actions.ts` (`createFydIdentity`), `key-custody.ts`, `config.ts`.
- CONSTRUCTED: Ed25519 keypair generated client-side; gateway POST `/identities` with public key.
- INITIALIZED: `assertIdentityId` on the gateway response; handle/display-name validation.
- STARTED/REGISTERED: identity row created at the gateway; private key stored via `safeIdentityDir`.
- CALLED: `POST /api/fyd/social/identity`.
- PERSISTING: gateway identity row; adapter key files; profile OBJECT_CREATED event.
- READ BACK: attestation gate reads back the PROFILE event only, never the identity row (R2).
- RESTARTED: key files survive; gateway row survives; no reconciliation between them.
- TESTED: none for the write lane (only the new WORKTREE readers tiebreak test covers the read side). The write lane (create/follow/unfollow/post) has zero tests.

### M3. Practice identity mint
- DEFINED: `src/lib/ping/ping-object-reader.ts` `createIdentity` (por-full.txt:582-643).
- CALLED: `POST /api/practice/identities` (open dev route).
- PERSISTING: gateway identity row; dev keypair store; profile OBJECT_CREATED via `submitSignedEvent`.
- READ BACK: practice session cookie (unsigned, security F7); no format assertion on the returned id (R3).
- RESTARTED: same as M2.
- TESTED: none observed for the mint path.

### M4. Claim lifecycle
- DEFINED: `src/fyd/claim/types.ts`, `machine.ts` (OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED -> OBSERVED).
- IMPORTED: routes import machine/store/identity/verification-seam.
- CONSTRUCTED: `createObserved(resourceId, sourceUrl)`; `claim(current, identity)`; `verifyControl(current, proof)`; `release(current, actorLabel)`.
- INITIALIZED: `isValidResourceId`; `DEMO_CONTEXT_IDS` refusal.
- STARTED: POST claim/verify/release routes.
- REGISTERED: `writeClaim` to `data/` claim files.
- CALLED: claim UI via the three POST routes + GET route.
- PERSISTING: claim JSON files; history appended per transition.
- READ BACK: `readClaim` (catch-all -> null, R13); GET route 404s honestly on null.
- RESTARTED: files survive; `authenticatedAt` is re-minted per resolution, not persisted.
- TESTED: `machine.test.ts`, `resource-id.test.ts`, `seam.test.ts`, `verify-gate.test.ts`. No store/persistence tests; no claim/release route tests.

### M5. Owner command loop (overrides)
- DEFINED: `src/fyd/object/commands.ts`, `types.ts`, `owner-store.ts`, `owner-events.ts`, overrides `route.ts`, `patch-loop.ts`, `owner-context.ts`.
- IMPORTED: route imports all; view/by-id import `readOverrides`.
- CONSTRUCTED: `interpretTextCommand` -> `parseOwnerCommand` -> proposal; digests via `ownerStateDigest`/`patchDigestOf`/`buildViewDigest`.
- INITIALIZED: `createOwnerContext(objectId)` (tenant check), `demoDenied` (env + host).
- STARTED: POST propose (read-only) / approve (mutating).
- REGISTERED: `applyOwnerCommand` appends one event via `appendOwnerEvent`; approval record built by `buildBoundApproval`.
- CALLED: Manage surface.
- PERSISTING: `data/fyd-owner/<key>.json` event log (R11 key split, R12 corruption wipe, shared tmp race).
- READ BACK: `readOverrides` re-projects; `loadObjectView`/`loadObjectViewById` compose with different keys (R11); Ask FYD applies field corrections by slug (ask-pipeline.ts:86).
- RESTARTED: logs survive; digests recomputed live (no stale-digest persistence bug).
- TESTED: `overrides-patch-loop.test.ts`, `owner-context-seam.test.ts`, `owner-store.test.ts`, `owner-events.test.ts`, `commands.test.ts`, `confirm-command.test.ts`, `owner-capability.test.ts`, `owner-overlay.test.ts`. No concurrency/persistence-failure tests.

### M6. Social follow/unfollow
- DEFINED: `actions.ts`, `readers.ts`, social `attestation-gate.ts`, `envelope.ts`, `transition-id.ts`.
- CONSTRUCTED: signed envelope (Ed25519, key from `safeIdentityDir`); RELATIONSHIP_CREATED with status active/inactive.
- INITIALIZED: gateway base URL from `fydGatewayBaseUrl()`; default `127.0.0.1:18199` with no listener observed (dark seam).
- STARTED: social UI actions.
- REGISTERED: gateway journal; attestation via `attestRelationshipState` (latest-wins, `expectEventId` binding).
- CALLED: follow/unfollow UI.
- PERSISTING: journal only; no adapter-local persistence.
- READ BACK: `readNetRelationships` (last-wins; WORKTREE fixed tiebreak); `readSocialState`; feed.
- RESTARTED: journal is the store; adapter holds no state.
- TESTED: none for the write path; WORKTREE adds `readers-tiebreak.test.ts` for the read tiebreak.

### M7. Social post
- Same spine as M6. Post `actionId` hashes first 80 chars (collision, R20); no pre-read dedupe; `submitEnvelope` coercions (R21).

### M8. Overlay journal write (Lane D)
- DEFINED: `src/fyd/customize/server.ts`, `intent.ts`, `propose.ts`, `apply-layer.ts`, `types.ts`, route.
- CONSTRUCTED: `parseCustomizationIntent` -> `resolveCustomizationIntent` -> `proposeFromSiteIntent` -> `buildDirective` (deterministic `directiveIdFor`).
- INITIALIZED: `demoDenied` (approve/clear only; parse is ungated but read-only).
- STARTED: POST parse/approve/clear with body `siteId` (R19).
- REGISTERED: `emitOverlayEvent` POSTs to the gateway event route (no auth, R18); digest + full-body re-derivation check on approve.
- CALLED: customize UI.
- PERSISTING: FYD journal (append-only; clear is a compensating op, per the WORKTREE comment correction).
- READ BACK: `queryFydSiteOverlays` (client-side filter, R15); `loadCustomizedSite`; dump pipeline.
- RESTARTED: journal persists; proposals re-derived live (no stale state).
- TESTED: `intent.test.ts`, `apply-layer.test.ts`. No route/emit tests.

### M9. Tenant graph read
- DEFINED: `src/fyd/data/fyd-tenant-graph.ts`, `src/lib/ping/ping-object-reader.ts` (`queryFydSiteOverlays`).
- CONSTRUCTED: base graph (fixture) + overlay ops applied.
- INITIALIZED: `getTenantGraph(siteId)`.
- READ BACK: overlay ops validated shallowly (R17); metadata hardcoded (R16).
- TESTED: `src/fyd/tenant/__tests__/` (a-owner, b-projection, c-ask, d-worker, e-scoped-stores). No test pins the metadata pins or the op-validation gap.

### M10. Ask pipeline
- DEFINED: `src/app/api/fyd/ask/ask-pipeline.ts`, `src/fyd/ask/visitor-answer.ts`, `context-builder.ts`, `site-patch.ts`, `envelope.ts`, `types.ts`.
- INITIALIZED: tenant from route path (G3) or validated body siteId; `mode` visitor/owner (owner grants nothing).
- STARTED: POST /api/fyd/ask[/siteId].
- REGISTERED: `loadBundleWithOwnerOverlay` (slug-keyed corrections, R11 read side); tenant-scoped `loadBundle` closure.
- CALLED: Ask FYD UI.
- PERSISTING: none (read-only; proposals are drafted, never persisted here).
- READ BACK: 3-class contract (supported/derived/unknown) with per-citation claimClass.
- RESTARTED: stateless per request.
- TESTED: `ask-fyd.test.ts`, `demo-classification.test.ts`, `graph-read-route.test.ts`, `services-evidence.test.ts`, route tests (`route.test.ts`, `route-smoke.test.ts`, `ask-classes-tenant.test.ts`, `object-scope.test.ts`). The site-patch draft path is tested but unreachable (R25).

### M11. Claim verification
- DEFINED: `src/fyd/claim/verification-seam.ts`, verify route.
- CONSTRUCTED: `attestOperatorControl({resourceId, operatorLabel, basis})`; fails closed on basis < 10 chars or missing operator (weak-proof).
- INITIALIZED: `demoDenied` gate; method allowlist with 501 for unimplemented methods.
- REGISTERED: `verifyControl(current, proof)` -> `writeClaim`.
- READ BACK: GET claim route exposes the proof.
- RESTARTED: files persist.
- TESTED: `seam.test.ts`, `verify-gate.test.ts`. The proof is honestly labeled as a statement, not a cryptographic proof (not fake verification; correctly scoped). The gap is R5 (release destroys it) and R6 (gate inconsistency).

## Remediation proposals

Each proposal uses the required shape: WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT. Proposals are advisory; no code was changed. Ordering is by blast radius.

### M-IDENT-1. Declare one cross-namespace identity map
- WHY: three namespaces with no bridge means every future auth feature must independently solve the same mapping; the wrong lane will eventually be trusted for the wrong purpose.
- EVIDENCE: R1 (OIDC UUIDv5 vs `identity_<16hex>` vs `demo-owner`; claim lane explicitly does not consume the OIDC adapter).
- MINIMUM CHANGE: add a single `ClaimedIdentity` extension `kind: "oidc"` | `kind: "social"` with the source id + issuer, populated only when the corresponding adapter is bound; `resolveClaimIdentity` returns null for unbound lanes. No behavior change until a lane binds.
- TEST: unit test that an OIDC-authenticated request maps to `kind: "oidc"` with the UUIDv5 id; test that social lane still cannot be presented as claim identity until its binding lands.
- RESULT: one documented namespace map; no silent fallback between lanes.

### M-IDENT-2. Make social identity creation resumable
- WHY: a key-store failure orphans a live gateway identity with an unrecoverable key, and a retry mints a duplicate (R2).
- EVIDENCE: `createFydIdentity` ordering: keygen -> POST /identities -> storeKey -> profile event; storeKey throws after the gateway commit; no idempotency key.
- MINIMUM CHANGE: reserve the identity id before keygen (e.g. POST `/identities` with a client-supplied idempotency token derived from (handle, pubkey)); if the profile event fails, log the reserved identity id and expose a `GET /api/fyd/social/identity/pending` repair route that re-submits the profile event for the orphaned identity instead of minting a new one.
- TEST: integration test: fail `storeKey`, assert repair route recovers the same identity id; assert retry with the same token does not mint a second identity.
- RESULT: at-most-one identity per intent; orphaned identities are recoverable.

### M-IDENT-3. Unify POST /identities validation across lanes
- WHY: two lanes accept different gateway responses for the same authority (R3).
- EVIDENCE: social lane asserts `^identity_[0-9a-f]{16}$`; practice lane accepts `identityId || id` unchecked.
- MINIMUM CHANGE: extract the social lane's assertion into a shared validator and call it from `createIdentity` before `storeDevKeypair`; reject and surface otherwise.
- TEST: unit test feeding a divergent-format `/identities` response to both lanes; both reject.
- RESULT: one acceptance rule for one authority.

### M-AUTH-1. One gate for all claim mutations
- WHY: `claim` and `release` lack the host check `verify` has; release's actor check never fires in demo mode (R6).
- EVIDENCE: verify-route.txt:43-63 vs claim/release routes (no demoDenied, no header read); `_req` in release signature.
- MINIMUM CHANGE: route claim/release through the same `demoDenied` helper as verify; read the request in release; return 404-on-absent vs 409-on-corrupt distinctly (see M-PERSIST-2).
- TEST: route tests: claim/release from a public host with the env flag -> 403; release of another demo-owner's claim -> 403 (seeded via a test fixture identity, not the singleton).
- RESULT: the three mutation routes share one documented gate.

### M-AUTH-2. Fix the capability seam to answer the requested capability
- WHY: `evaluateCapability` ignores its arguments and always answers the seeded verdict (R8); any future caller is misled.
- EVIDENCE: owner-context.ts:159-172; returned `capability` is the verdict's, not the request's.
- MINIMUM CHANGE: if the requested capability is not `owner.correct-fact`, return `{ capability: requested, allowed: false, reason: "demo-chain covers only owner.correct-fact" }`; never echo the verdict's capability string as the request's.
- TEST: unit test: `evaluateCapability(obj, "owner.publish")` -> `{ capability: "owner.publish", allowed: false }`.
- RESULT: the seam answers the question asked, honestly declining what it does not cover.

### M-AUTH-3. Map command types to capabilities on the overrides route
- WHY: every command type is gated against one hardcoded capability (R9).
- EVIDENCE: overrides route propose/approve call `evaluateCapability(objectId, "owner.correct-fact")` for all command kinds.
- MINIMUM CHANGE: introduce a `capabilityForCommand(command.kind)` map (move-service -> owner.correct-fact; add-service -> owner.publish or deny; hide -> owner.correct-fact; set-contact-field -> owner.correct-fact; set-address-visibility -> owner.publish?) and evaluate the mapped capability; deny unmapped kinds until mapped.
- TEST: route test per command kind asserting the evaluated capability string (stub context recording the argument).
- RESULT: authorization intent matches the command being authorized.

### M-AUTH-4. Add the missing default arm
- WHY: latent undefined return (R10).
- EVIDENCE: capability.ts:133-185, no default.
- MINIMUM CHANGE: `default: return { capability, allowed: false, reason: "unknown capability" }`.
- TEST: unit test with a cast unknown string.
- RESULT: closed-world behavior documented.

### M-AUTH-5. Authenticate the gateway event route or stop pretending it is gated
- WHY: the adapter's demo gate is not the enforcement point; the gateway accepts overlay events for any site from any client (R18).
- EVIDENCE: customize-server.txt:8-9 ("no auth on its event route"); `emitOverlayEvent` posts with no credential; body-supplied siteId (R19).
- MINIMUM CHANGE (minimum honest): bind the gateway event route to the demo gate's network assumptions at minimum (localhost-only bind in demo deployments) and reject events whose `aggregate_id` tenant does not match the caller-context tenant once a real tenant seam exists; until then, document the bypass in the route docs and in SECURITY-SWEEP.
- TEST: integration test: POST to the gateway event route from a non-loopback source -> refused.
- RESULT: the enforcement point exists or the gap is declared rather than silently inherited.

### M-AUTH-6. Wire the attestation gate into the owner mutation path
- WHY: the one evidence-precondition mechanism is not on the mutation path (R23); the capability comment implies otherwise.
- EVIDENCE: demo-owner-mode.tsx:61 (`emit: undefined`); overrides approve never calls `attest`.
- MINIMUM CHANGE: in overrides approve, after `applyOwnerCommand`, call `attest("owner-mutation-applied", { eventId, digest }, emit)` with an emit callback that persists the attestation into the owner event log; correct the capability.ts comment to state the gate is client-demo-only until this lands.
- TEST: route test: approve -> owner log contains the mutation event and the attestation record; fail emit -> 500 with the mutation rolled back or explicitly marked unattested.
- RESULT: owner mutations carry durable evidence, or explicit failure.

### M-AUTH-7. Either enforce or delist the orphan capabilities
- WHY: `owner.edit-visibility` and (server-side) `owner.attest-regen` imply enforcement that does not exist (R24).
- EVIDENCE: grep shows no route consumers.
- MINIMUM CHANGE: mark both as `status: "planned"` in `ALL_CAPABILITIES` with a comment stating they are not enforced; or wire edit-visibility into the overrides command map (M-AUTH-3) and attest-regen into M-AUTH-6.
- TEST: a lint/test that every capability with `status: "implemented"` has at least one route caller.
- RESULT: the capability table matches reality.

### M-AUTH-8. Stop trusting the raw Host header when the routes approach production
- WHY: the demo gate's private-network test reads a client-controlled header (R32, inherited F3).
- EVIDENCE: all `demoDenied` implementations; `isPrivateHost` on the header value.
- MINIMUM CHANGE: keep for demo, but gate on the socket's remote address (server-side connection info) rather than the Host header, or move the gate behind an explicit allowlist; document that the header is untrusted.
- TEST: request with spoofed private Host from a public source address -> 403.
- RESULT: the gate measures the network, not the client's claim about the network.

### M-OWNER-1. One canonical owner-store key
- WHY: slug-keyed and canonical-id-keyed stores diverge silently (R11); tenant syntax cannot catch the confusion (R33).
- EVIDENCE: view.ts:316 (slug) vs by-id.ts:40 (obj.id); `TENANT_ID_PATTERN` accepts both.
- MINIMUM CHANGE: canonicalize to ONE key per business (recommend the canonical object id): migrate `data/fyd-owner/<slug>.json` -> `data/fyd-owner/<canonicalId>.json` with a one-time, logged migration; make the slug path resolve the canonical id from the graph before touching the store; make `requireTenantContext` resolve against a tenant registry (or at minimum an allowlist of the two demo sites) so non-tenant keys are rejected.
- TEST: test that an owner command via the slug path and a read via the by-id path share one log; test that a canonical-id string fails `requireTenantContext` as a tenant.
- RESULT: one owner state per business; the tenant seam validates membership, not just syntax.

### M-OWNER-2. Make /build consume owner service order, or refuse it at the gate
- WHY: durable "successful" mutations do nothing on /build (R26).
- EVIDENCE: patch-loop preview admissions.
- MINIMUM CHANGE: either plumb `services` order/visibility into the /build planner input, or return a bounded refusal for move-service/hide-set-visibility on routes whose projection does not consume them (consistent with the site-patch refusal pattern).
- TEST: /build planner test with a hide-service override -> hidden service absent; or route test asserting the refusal.
- RESULT: no successful-but-inert owner mutations.

### M-OWNER-3. Record read failure as read failure in approval evidence
- WHY: the approval asserts absence when the read failed (R27).
- EVIDENCE: overrides approve `sourceValue` try/catch -> null; `sourceFieldValue` catch -> null.
- MINIMUM CHANGE: propagate a `sourceRead: "ok" | "failed"` flag into `sourceSnapshotEvidence` and render "source read failed at correction time" instead of "listed no value".
- TEST: test with a failing graph source -> evidence string contains "read failed".
- RESULT: evidence stops asserting false absences.

### M-PERSIST-1. Make the owner event log corruption-safe
- WHY: one bad read wipes the audit log; concurrent appends race (R12).
- EVIDENCE: `readOwnerEvents` catch-all -> []; `appendOwnerEvent` read-modify-write; shared `<path>.tmp`.
- MINIMUM CHANGE: on read/parse failure, write the raw bytes to a quarantine file (`<key>.corrupt-<ts>.json`) and refuse the append (fail closed) instead of starting a fresh log; use a unique temp filename per write (`<path>.tmp-<pid>-<rand>`) + atomic rename; fsync the dir entry after rename.
- TEST: corrupt-log test: append after corruption -> 500 and quarantine file created, original bytes preserved; concurrency test: N parallel appends -> N events, no loss.
- RESULT: audit history survives corruption and concurrency.

### M-PERSIST-2. Distinguish claim-store states; unique temp files
- WHY: routes cannot tell absent from corrupt (R13); concurrent writes collide.
- EVIDENCE: `readClaim` catch-all -> null; `<path>.tmp-<pid>`.
- MINIMUM CHANGE: return a discriminated result (`{ ok: true, claim } | { ok: false, reason: "absent" | "corrupt" | "io" }`); routes map corrupt -> 500 (never recreate-overwrite), absent -> 404, io -> 503; unique temp filename per write + atomic rename.
- TEST: corrupt claim file -> GET returns 500, not 404; claim POST on corrupt file -> 409/500 without overwriting; parallel writes -> no interleaving.
- RESULT: corruption is surfaced, never silently healed by overwrite.

### M-TENANT-1. Move tenant filtering to the authority
- WHY: "tenant scoping at the authority" is false; all tenants' overlay payloads cross into the adapter (R15).
- EVIDENCE: por-full.txt:277-298 (fetch all, filter in JS).
- MINIMUM CHANGE: add `?site_id=` (or equivalent) support to the gateway `/events` read path and pass the siteId; keep the adapter-side filter as defense-in-depth, and fix the comment to describe the real enforcement point.
- TEST: adapter test with a second tenant's overlay present in the gateway -> adapter never receives its payload bytes.
- RESULT: the isolation claim becomes true, or is honestly downgraded.

### M-TENANT-2. Compute graph freshness metadata from the fetched overlays
- WHY: `generatedAt`/`eventSequences` are 2026-09-21 pins while content is live (R16).
- EVIDENCE: fyd-tenant-graph.ts pins.
- MINIMUM CHANGE: set `generatedAt` to the actual build time and `eventSequences` to the min/max sequence observed in the fetched overlay batch; if no events, mark `source: "empty"`.
- TEST: test with a known overlay set -> metadata reflects the set.
- RESULT: freshness metadata is observed, not asserted.

### M-TENANT-3. Validate overlay ops semantically before casting
- WHY: malformed ops become typed graph members (R17), and the writer is unauthenticated (R18).
- EVIDENCE: fyd-tenant-graph.ts minimal checks + casts.
- MINIMUM CHANGE: validate `add_object` against the `PingObject` required fields and tenant ownership (object.tenantId === siteId); validate `add_relationship` endpoints exist in the graph and the predicate is in the allowed set; reject-and-log violations instead of casting.
- TEST: malformed-op tests per op type.
- RESULT: the graph cannot be poisoned through the overlay lane.

### M-TENANT-4. Key Lane D by a validated tenant, not the request body
- WHY: body-supplied siteId with no tenant seam (R19).
- EVIDENCE: customize-route.txt:365-376, 402, 409.
- MINIMUM CHANGE: resolve the tenant through the same seam as the overrides route (route-path tenant or `requireTenantContext`), and run `loadCustomizedSite` (existence check) before approve/clear emit.
- TEST: route test with a nonexistent siteId -> 404, no journal event.
- RESULT: Lane D cannot journal for tenants that do not exist.

### M-TENANT-5. Tenant seam must validate membership, not syntax
- WHY: the tenant-id pattern accepts canonical object ids (R33), enabling R11's confusion.
- EVIDENCE: tenant-context.ts:50.
- MINIMUM CHANGE: `requireTenantContext` resolves against a tenant registry (demo: the two known sites; later: core tenant authority) and rejects syntactically valid non-tenants with `unknown_tenant`.
- TEST: `website-business-<hex>` as tenant -> `unknown_tenant`.
- RESULT: the tenant boundary is a boundary.

### M-SOCIAL-1. One relationship-status vocabulary
- WHY: two write vocabularies and two read defaults disagree (R4, R14).
- EVIDENCE: practice follow submits no status; readers default-to-active; gate passes unknown strings through.
- MINIMUM CHANGE: declare the vocabulary in one module (`status: "active" | "inactive"`, no other values); practice follow submits `"active"` explicitly; both readers map unknown/missing to a typed `unknown` state that renders as "unverified", never as active.
- TEST: unknown-status event -> both readers return the same `unknown` state; gate rejects it.
- RESULT: one vocabulary; no permissive defaults.

### M-SOCIAL-2. Submit the action id as gateway idempotency material
- WHY: the deterministic action id is decorative (R20).
- EVIDENCE: computed but absent from payload/metadata; producedAt varies; follow dedupe is a racy pre-read.
- MINIMUM CHANGE: include `actionId` in the signed envelope metadata; have the gateway (or the adapter's submit path, until the gateway supports it) keep a seen-actionId set and refuse duplicates; for posts, hash the full text + identity, not the 80-char prefix.
- TEST: double-submit same actionId -> one journal event; two distinct posts with a shared 80-char prefix -> two distinct actionIds.
- RESULT: retries are safe; the idempotency story is enforced, not asserted.

### M-SOCIAL-3. Reject failure-shaped gateway responses
- WHY: `submitEnvelope` manufactures event_id/status (R21).
- EVIDENCE: coercions to `""` / `"ok"`.
- MINIMUM CHANGE: require `event_id` non-empty and an explicit success status; otherwise throw `SubmitFailed` with the raw body preserved.
- TEST: gateway stub returning `{}` -> throw, no attestation attempted.
- RESULT: write success is observed, not coerced.

### M-SOCIAL-4. Bound or page attestation reads
- WHY: `?limit=1000` can window-truncate attestation (R30).
- EVIDENCE: attestation-gate.ts:32, :151.
- MINIMUM CHANGE: page through the event window (cursor or offset) until the target row is found or the stream is exhausted; cap pages and fail closed past the cap.
- TEST: journal with >1000 events where the target row is at position 1500 -> attested.
- RESULT: "latest wins" is latest, not latest-in-window.

### M-SOCIAL-5. Default missing visibility to non-public
- WHY: missing visibility renders in the public feed (R31).
- EVIDENCE: readers.ts:283.
- MINIMUM CHANGE: `(p.visibility ?? "private") === "public"`; log the defaulting.
- TEST: post event without visibility -> absent from feed.
- RESULT: the safe default is the closed one.

### M-READ-1. Fail closed in the practice BFF
- WHY: 12+ silent fallbacks render outages as emptiness (R22), violating SOUL #11.
- EVIDENCE: por-full.txt catch sites listed in R22.
- MINIMUM CHANGE: remove the `.catch(() => [])` / `.catch(() => null)` sites in the reader and let the route layer map typed failures to 502/503 with the boundary named (gateway vs parse); keep fallbacks ONLY where the empty state is genuinely meaningful (e.g. a 404 on an optional sub-resource).
- TEST: gateway-down integration test -> routes return 502/503 with error bodies, not empty UIs.
- RESULT: infrastructure failure is visible, never rendered as absence.

### M-CLAIM-1. Preserve verification proof on release
- WHY: release destroys the structured proof (R5).
- EVIDENCE: machine.ts release sets `verification: null`; history keeps prose.
- MINIMUM CHANGE: on release, move the full `VerificationProof` into a `priorVerifications: VerificationProof[]` (or `releasedFrom`) field on the claim record and include it in the history event payload, not just the detail string.
- TEST: verify -> release -> read claim -> prior proof intact with method, basis, artifacts, verifiedBy, verifiedAt.
- RESULT: the audit trail survives release.

### M-CLAIM-2. Rename or re-scope `authenticatedAt`
- WHY: the field name asserts an authentication event that never happened (R7).
- EVIDENCE: claim-identity.txt:25.
- MINIMUM CHANGE: rename to `resolvedAt` with a note, or keep the name only when `kind` is a real authentication.
- TEST: snapshot test on the demo identity shape.
- RESULT: no field claims more than it is.

### M-CLAIM-3. Validate sourceUrl and resource existence on claim
- WHY: weak provenance inputs (R28).
- EVIDENCE: claim route lines 53-63.
- MINIMUM CHANGE: `new URL(sourceUrl)` parse + protocol allowlist; for resource existence, resolve the resourceId against the known graph (demo: DEMO_CONTEXT_IDS or the object reader) before `createObserved`.
- TEST: `sourceUrl: "httpxyz"` -> 400; unknown resourceId -> 404 without creating a record.
- RESULT: claims attach to real resources with real URLs.

### M-ASK-1. Decide the site-patch proposal path: reach it or delist it
- WHY: a fully built, tested proposal pipeline is unreachable in the only lane that drafts it (R25).
- EVIDENCE: visitor-answer.ts:461 (`grants: []`); site-patch.ts refusal; practice lane has its own consumer.
- MINIMUM CHANGE: either (a) define the owner-mode grant ceremony for Ask FYD (bind `resolveClaimIdentity`/owner session -> `grants: ["site.propose"]`) and document it, or (b) remove the proposal-card UI affordance and mark `draftSitePatchProposal` as planned-unreachable until the ceremony exists.
- TEST: (a) owner-mode ask with a valid grant -> proposal drafted; without -> refusal. (b) no proposal affordance rendered in visitor mode.
- RESULT: one reachable, tested end-to-end path, or an honest gap.

## What I did not verify

- Core gateway behavior: I did not run the FYD journal gateway or POST `/identities` against it, so gateway-side idempotency, identity-id format enforcement, event ordering under `?limit`, and whether the "no auth" event route is reachable in the deployed topology are unverified from the adapter side. Core consult was limited to the identity authority and event spine per task scope.
- Concurrency: lost-update races (R12, R13) and the follow dedupe race (R20) are established by code reading (shared tmp names, read-modify-write, pre-read dedupe); I did not execute concurrent writes.
- The pre-compaction reads of `actions.ts`, `envelope.ts`, `transition-id.ts`, `key-custody.ts`, `config.ts`, `store.ts`, `machine.ts`, `tenant-graph.ts`, and the social route files were verified against the base commit before the sibling worktree drift began; line numbers for those files are cited as function-level, not line-level, because the worktree has since changed. Post-drift evidence files live in `~/workspace/constitutional-sprint/fleet/semantic/s7-evidence/`.
- Live gateway listener state: the 2026-09-23 evidence (dark seam, default 127.0.0.1:18199 with no listener) was not re-probed; the adapter's default-URL behavior is as observed in code.

## Next adjacent gap

The adapter assumes the gateway is a trusted, authenticated peer in every lane (social writes, overlay journal writes, practice BFF reads, `/identities` minting). The next gap is the **gateway trust boundary**: define what the adapter is allowed to believe from each gateway (identity rows, event ordering, success bodies), put it behind a typed gateway client with failure semantics (no coercion), and authenticate the event route. That closes R2, R18, R21, R22, and R30 at the seam where they originate, rather than patching each adapter lane separately. A second adjacent gap is the **demo-to-real auth migration plan** for the owner and claim lanes (R6, R7, R8, R9, R23, R32): the demo seam is load-bearing for every mutation, and its replacement needs a ceremony design before any of these routes approaches production.

COMMITS CREATED: NONE
