# CAPABILITY PROJECTION — Agent 06 (capability + security)

Investigator: Agent 06, capability + security. Date: 2026-09-24 UTC.
Scope: read-only forensic investigation of capability, authorization,
principal, tenant, and projection-consumer mechanisms.

- Adapter: /home/nolan/projects/ping-constitutional, branch
  constitutional-convergence-v2, HEAD a69bb68f (verified at session start).
- Canonical core: /home/nolan/ping, branch refactor/runtime-authority-convergence,
  read-only. Live code was prioritized over stale top-level core audit Markdown.
- Transport: ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "<cmd>"'.
- Core was never written, staged, committed, restarted, or otherwise touched.
- Writer-ownership rule read (~/workspace/constitutional-sprint/WRITER-OWNERSHIP.md).
  Agent 06 owns capability/auth/principal paths (capabilities/, auth, gate.ts,
  RBAC, JWT, tenant) in the sprint worktree only. /home/nolan/ping is
  propose-only always. Proposals live under
  ~/workspace/constitutional-sprint/patches/agent06-capability/.
- No credential or secret values were read or printed.
- COMMITS CREATED: NONE.

## Verdicts carried in from prior phases (not re-litigated)

- UnifiedEventRuntime -> ping_events is the sovereign event spine;
  ConstitutionalEventStore does not exist (EVENT-FORENSICS, 2026-09-23).
- Security findings F1 (unauthenticated Kit webhook event injection), F2
  (unauthenticated Kit subscriber tagging + reflected open redirect), F3
  (demo-owner mode as sole owner-mutation authorization, Host-header-sensitive
  private-host gate) are assigned to the convergence wave. Only their
  capability-boundary intersections are documented here.

## Shared-record findings

Legend: CLASSIFICATION in {LIVE, DORMANT, DUPLICATE, CONFLICTING, AMBIGUOUS}.
CONFIDENCE in {HIGH, MEDIUM}. Marks: CONFIRMED / REFUTED where core evidence
changed an adapter conclusion.

### A. Adapter (ping-constitutional) findings

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| capability/grant | src/lib/ping/grants.ts grantsForViewer | Grants are UI planning hints, not authorization | Everyone receives object.reference; controller of a site-capable object receives site.read, site.propose, object.reference; no publish/message/purchase/advertise/provider/mutate grants exist | action-planner.ts, routes | - | - | planner, consumers | adapter (self) | LIVE | HIGH | none; never claimed to authorize | viewer/controller equality | agent05 (viewer/controller identity) |
| capability/planning | src/lib/ping/action-planner.ts | Produces UI and agent action plans from grants | Uses viewer/controller equality + grantsForViewer | routes, UI | - | - | UI, agents | adapter (self) | LIVE | HIGH | routes do not uniformly re-check the plan server-side | grants.ts | agent01 (route handlers) |
| capability/agent | src/fyd/ask/capabilities.ts | Strips forbidden agent effects, fails closed | Pure filter used by src/fyd/ask/context-builder.ts | context-builder.ts | - | - | ask pipeline | adapter (self) | LIVE | HIGH | none observed | context-builder callers | agent04 (ask projection) |
| capability/demo | src/fyd/owner-mode/capability.ts | Seeded demo-owner is treated as controller of every demo site; allows correction + customize approval, denies publish | Capability map keyed on DEMO_OWNER_ACTOR | fyd owner routes | - | - | owner routes | adapter, self-asserted | LIVE under NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1; dormant-by-design otherwise | HIGH | production safety depends entirely on the demo gate (intersects F3) | owner-mode/gate.ts | agent20, coordinator |
| capability/demo | src/fyd/owner-mode/gate.ts isPrivateHost | Private-host detection trusts the Host header | Header-derived host decides demo gate | owner-mode capability | - | - | demo gate | adapter, self-asserted | LIVE when flag on | HIGH | Host header is attacker-controlled (intersects F3) | env flag | security wave |
| capability/client | src/fyd/capabilities/runtime.ts | Client-side Circle capability detection + follow/like/ask/website executors | Capability presence gates UI buttons; no server check | Circle UI | local /api/fyd/follow, /api/fyd/like | local demo store | Circle UI | none (UI hint) | LIVE client-side | HIGH | local follow/like routes do not re-check portal capability server-side; effects are local demo state, not journal writes | portal capability API | agent04 |
| principal/dev | src/lib/ping/session.ts | Unsigned identity cookie selects a dev identity | Cookie value is the identity; grants nothing by itself | practice routes | - | client | routes | none | LIVE dev lane | HIGH | documented as non-granting; dev signing keys are the real gate | PING_DEV_KEY_DIR custody | agent05 |
| principal/OIDC | src/fyd/identity/provider.ts verifyGoogleIdToken | Rigorous JWT verification: alg pinned RS256, kid required, JWKS fetch, RSA-SHA256, iss pinned to Google, aud = clientId, exp/iat with 120s skew, nonce checked | provider.ts:205-290 | google/callback route | - | - | session | Google (dormant) | DORMANT | HIGH | no JWT exists in the core live gateway; refuses to run until real provider-console credentials are installed (AUTH_NOT_CONFIGURED) | env credentials | agent05 |
| principal | three identity namespaces (AUTHORITY-MAP Overlap 1) | A: OIDC uuidv5(FYD_IDENTITY_NAMESPACE, provider-account:issuer:sub); B: gateway-minted identity_[0-9a-f]{16} with keys under FYD_DEV_KEY_DIR; C: claim lane demo-owner only, deliberately not depending on auth lane | principal.ts:57; social/actions.ts:62; claim/identity.ts:16; no module imports both deriveIdentityId and createFydIdentity | auth routes, social actions, claim lane | - | gateway / self | all lanes | fragmented | CONFLICTING | HIGH | no bridge table; a Google user, a dev identity, and a claim filer are three unlinkable principals | agent05 must reconcile | agent05, coordinator |
| principal/signing | two dev signing custodians (AUTHORITY-MAP Overlap 2) | signAsFydIdentity (FYD_DEV_KEY_DIR, strict identity regex) vs signAsIdentity (PING_DEV_KEY_DIR, loose regex) | key-custody.ts:67; dev-signer.ts:132 | social envelope path; practice BFF path | - | - | envelope builders | adapter (self) | DUPLICATE | HIGH | same crypto, different dirs/validation, no shared key registry | lane separation comment | agent05 |
| integrity | proposal digest binding | Digest binding is strong on selected mutation paths, NOT universal | POST /api/ping/proposal re-verifies digest; site patches verify signed envelope + SiteSpec digest; owner-override approval echoes base-state/base-view/patch digests; customize re-derives and requires full-body equality | proposal/override/customize routes | journal | routes | journal | adapter + gateway | LIVE (per-path) | HIGH | follow/unfollow/like/unlike/profile/bio submit signed events with no proposal; core direct POST /events accepts fields with no digest. Claim "every consequential action is bound to a proposal digest" is REFUTED | dev-signer canonicalizeJson | agent01, agent02 |
| integrity/signing | src/fyd/social/envelope.ts + key-custody.ts | Signed bff-envelope@1; private keys 0600, loaded in-memory, never serialized | envelope.ts:43-72; key-custody.ts | social actions.ts | gateway POST /events | adapter lane | gateway | adapter lane (self-asserted identity) | LIVE | HIGH | proof.publicKey is self-asserted in the envelope; binding happens via gateway DB lookup of the key | FYD_DEV_KEY_DIR | agent05 |
| capability/social | src/fyd/social/actions.ts | Follow/like/profile actions submit signed envelopes directly; no portal capability check, no proposal | actions.ts:24,88-162: buildSignedEnvelope + submitEnvelope to gateway /events | FYD social UI | gateway | adapter lane | journal | self-asserted identity | LIVE | HIGH | bypasses the portal capability model; effects are journal writes (unlike local /api/fyd/follow) | envelope.ts | agent01 |
| integrity/attestation | src/fyd/owner-mode/attestation-gate.ts, src/fyd/social/attestation-gate.ts | Evidence-honesty gates: attestation requires named preconditions, fails closed, never fabricates | attestation-gate.ts:21-32 preconditions; "does not authenticate the attester" | demo owner flows; social actions | - | - | flows | adapter (self) | LIVE | HIGH | gates prove evidence presence, NOT attester identity; do not confuse with authorization | journal reads | agent02 |
| tenant | src/fyd/tenant/tenant-context.ts requireTenantContext/assertTenantKey | Tenant key enforced on Ask FYD pipeline, ask route, and object overrides | tenant-context.ts; ask-pipeline.ts; ask/[siteId]/route.ts; overrides/owner-context.ts; scoped-stores.ts | ask/override routes | tenant-scoped stores | routes | tenant stores | adapter (self) | LIVE | HIGH | customize route takes siteId from body with no tenant key (demo-gated instead); FYD demo lanes have no tenant isolation | FYD_TENANT_KEY material | agent05 |
| projection/read | src/app/api/fyd/projection/route.ts | Returns full graph {meta, graph} with no public-object filter; shipped projection contains one private-visibility object | route.ts:32+; happy-place.json projection data | unknown consumers | - | journal-derived graph | HTTP clients | UNOWNED (intent ambiguous) | AMBIGUOUS | MEDIUM | every other consumer filters to public; this is the only unfiltered read surface | agent04 owns projection paths | agent04, coordinator |

### B. Canonical core (/home/nolan/ping) findings

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| capability/executor | runtime/kernel/capabilities/capability-authority.ts | Registry + resolver implementation; resolves capability descriptors by requirements; does NOT grant principals permission or enforce at execution time | No live JS/TS composition root imports it; registry.yaml labels CapabilityResolution "missing_implementation" | none | - | - | - | UNOWNED | DORMANT | HIGH | any claim that a live executor authority enforces actions is REFUTED | - | coordinator |
| capability/discovery | gateway/generated/capability_registry.json, connector CapabilityRegistry, orchestration execution capability registries | Discovery/provider registries for routing, not use-time principal authorization | separate from kernel authority; no enforcement hook | connectors, orchestrator | - | - | routers | respective subsystems | LIVE (discovery only) | MEDIUM | must not be mistaken for authorization | - | agent14, orchestration |
| integrity/signing | gateway/social_ingest_adapter.js normalizeBffEnvelope/verifyBffProof | BFF envelope signatures verified; vocabulary enforced; secrets rejected | social_ingest_adapter.js:258-300; rejectSecrets(payload) | POST /events BFF branch | eventRuntime.emit | adapter lane | journal | gateway (self) | LIVE | HIGH | identity is self-asserted then DB-bound; see next row | IdentityAuthority (id minting) | agent01 |
| authorization | gateway/social_ingest_adapter.js normalizeObjectUpdated | Signer bound to identity, but signer is NEVER compared to the object's controller; direct gateway callers bypass the adapter's controller check | social_ingest_adapter.js:257-281; resolveObjectId (156-163); resolveIdentityByPublicKey (140-154) | POST /events BFF branch | eventRuntime.emit | any key holder | journal | UNOWNED (no owner of this check) | CONFLICTING (adapter checks, gateway does not) | HIGH | signature proves WHO, not MAY; ownership authorization missing | proposal core-01 | agent01, agent20, coordinator |
| authorization | gateway/routes/events.js direct canonical-shape branch | {event_type, aggregate_id, aggregate_type, event_data} emits with no signature/capability/namespace check in the worktree copy | events.js:108-121 | any HTTP caller | eventRuntime.emit | caller | journal | UNOWNED | CONFLICTING (sibling copies add tenant-registry validation; deployed bytes unresolved) | MEDIUM-HIGH | two write doors, two authorization levels; deployed-path unknown per EVENT-FORENSICS | proposal core-02 | agent01, agent20, coordinator |
| principal | gateway/routes/identities.js | Identity creation validates shape/key and mints via IdentityAuthority; no caller authentication observed | identities.js:101+ | any HTTP caller | IdentityAuthority | caller | registry | gateway (self) | LIVE | HIGH | open minting underpins the self-asserted principal model | IdentityAuthority | agent05 |
| authorization | CanonicalizationService.authorizeNamespace | Namespace resolution/authorization seam for POST /ingest (core::<name>/tenant::<id>) | canonicalization_service.js:109-176; ingest.js:48,53; bootstrap ~447 | POST /ingest, business emitters | UnifiedEventRuntime | service | journal | core (self) | LIVE | HIGH | POST /events does not share this seam (see core-02) | UnifiedEventRuntime | agent01 |
| projection/consumer | ping-runtime/embeddings/embedding_service.js:122-148 | Subscribes directly to UnifiedEventRuntime; receives raw event payloads before user-facing filtering | direct subscription | runtime | embedding pipeline | runtime | vector store | internal | LIVE (internal raw consumer) | MEDIUM | raw projection consumer with no capability gate at subscription | UnifiedEventRuntime | agent14 |
| projection/consumer | ping-runtime/orchestration/event_to_mission_bridge.js:91+ | Subscribes directly to runtime events; passes raw events into mission handling | direct subscription | runtime | mission handling | runtime | agents | internal | LIVE (internal raw consumer) | MEDIUM | no observed capability gate at subscription | UnifiedEventRuntime | orchestration |
| projection/consumer | ping-runtime/search/hybrid_search.js:35-57 | Requires and filters namespace on search | namespace predicate | search callers | Qdrant | indexer | search | core (self) | LIVE | MEDIUM | policy is namespace isolation, not per-viewer visibility | projection payloads | agent04, agent14 |
| projection/consumer | mcp/ping_mcp_server.py | Thin Mission Control proxy; no viewer/tenant/visibility policy in the file | file inspection | MCP clients | Mission Control | - | MCP clients | delegated downstream | AMBIGUOUS (dormant-or-delegated) | MEDIUM | enforcement depends on untraced Mission Control endpoints | Mission Control | agent04 |

## Projection consumers: who reads what, and whether policy is applied

| Consumer | Read path | Policy | Classification |
|---|---|---|---|
| FYD renderer / object views | src/fyd/object/view.ts, verified graph state | Filters to public objects at view composition | LIVE, policy-filtered |
| Ask FYD | visitor-answer.ts: field visibility, then public objects + active relationships with public endpoints; owner mode currently grants nothing extra | Policy-filtered | LIVE, policy-filtered |
| Ask PING | PingObjectReader.visibleTo, sanitizeFields, bounded context, evidence shaping | Policy-filtered | LIVE, policy-filtered |
| Circle | PingObjectReader, visibility checks, sanitized DTOs | Policy-filtered (some profile fields reconstructed inside the reader) | LIVE, policy-filtered |
| Discovery / feed / node | Reader filters object visibility, sanitizes payloads | Policy-filtered | LIVE, policy-filtered |
| FYD social feed | src/fyd/social/readers.ts reads journal directly, bypasses PingObjectReader | Explicitly filters to public posts; duplicate read mechanism | LIVE, policy-filtered |
| Raw FYD projection API | src/app/api/fyd/projection/route.ts:32+ returns {meta, graph} unfiltered | NO visibility filter; one private object observed in shipped data | AMBIGUOUS; dependency agent04 |
| Search | hybrid_search.js namespace filter | Namespace isolation, not per-viewer visibility | LIVE, coarse policy |
| Embedding projection | Direct UnifiedEventRuntime subscription | Raw payloads, internal consumer | LIVE, internal raw |
| Agents / mission creation | event_to_mission_bridge direct subscription | Raw events, no capability gate at subscription | LIVE, internal raw |
| MCP | Thin Mission Control proxy | No policy in the MCP file; depends on downstream | AMBIGUOUS |
| ActivityPub | src/fyd/adapters/activitypub | No src/app importer found | DORMANT |
| ATProto | Harvest/design material only | No proven live read surface | DORMANT |
| Adapter object search | None exists | List/filter or core hybrid search only | absent |

## Principals: the three identity namespaces (detail)

From AUTHORITY-MAP Overlap 1, confirmed live in this session:

- A. OIDC lane: deriveIdentityId = uuidv5(FYD_IDENTITY_NAMESPACE,
  "provider-account:"+provider+"::"+issuer+"::"+subject). Used by Google
  callback/link/unlink/session routes. Verification is rigorous (see table)
  but the lane is DORMANT until real provider-console credentials exist.
- B. Social/dev lane: gateway-minted identity_[0-9a-f]{16}, asserted at
  src/fyd/social/actions.ts:62, minted via POST <gateway>/identities, keys
  escrowed under FYD_DEV_KEY_DIR with 0600 files and in-memory signing. The
  live lane for all journal writes.
- C. Claim lane: resolveClaimIdentity() returns demo-owner only and
  deliberately does not depend on the auth lane (src/fyd/claim/identity.ts:16).

No bridge table exists. A Google user, a dev identity, and a claim filer are
three unlinkable principals. Any identity convergence must reconcile all
three; treating any one as "the" identity silently orphans the others.
Related: Overlap 2, two dev signing custodians (DUPLICATE) with different
identity-format enforcement and no shared key registry.

## Tenants

- Core: CanonicalizationService.authorizeNamespace enforces core::<name> /
  tenant::<id> namespaces on POST /ingest and business emitters. POST /events
  does not share this seam in the worktree copy (proposal core-02).
- Adapter: requireTenantContext/assertTenantKey enforced on the Ask FYD
  pipeline, ask route, and object overrides; scoped stores for builder/planner.
- Adapter demo lanes (customize, FYD demo sites, projection): no tenant
  isolation; isolation is by demo-site store and env flags, not tenant keys.
- No RBAC beyond viewer/controller/owner roles; tenant-context.ts notes
  service-role separation for worker paths (comment-level only).

## Secrets and key custody

- FYD dev keys: FYD_DEV_KEY_DIR, 0600 files, loaded in-memory for signing,
  never serialized (key-custody.ts). Practice BFF keys: PING_DEV_KEY_DIR, same
  model, separate dir (dev-signer.ts). No raw key material was read.
- Gateway rejects secrets in event payloads: rejectSecrets(payload) in the
  social ingest adapter.
- OIDC client secret is server-only; placeholders are injected by default and
  the flow refuses to run until real credentials exist.
- No secret values were printed anywhere in this investigation.

## Self-asserted vs third-party provenance

- Self-asserted: proof.publicKey in the BFF envelope (bound to an identity by
  gateway DB lookup of the key, not by a third party); the demo-owner "owner"
  overlay provenance; website-derived provenance claims; practice-lane dev
  identities. The journal records what a key holder asserted, verified as
  "this key signed this", not "this person is this".
- Third-party: Google OIDC (dormant); Kit webhooks (F1, unauthenticated).
- The envelope model is honest about this: signature proves key possession,
  and the gateway binds key to gateway-minted identity. What is missing is
  the authorization step that says which keys may mutate which objects
  (proposals core-01, core-02).

## Security finding intersections (F1/F2/F3)

- F1 (unauthenticated Kit webhook event injection) intersects the missing
  use-time capability authority: an unauthenticated route can create
  event-like records with no capability evaluation. The executor
  CapabilityAuthority is dormant, so there is no authority to evaluate
  against; the fix belongs to the convergence wave, not to a resurrected
  second authority.
- F2 (unauthenticated Kit subscriber tagging + reflected open redirect)
  intersects direct external-effect execution: tagging occurs with no explicit
  capability grant and no approved proposal. Same family as the FYD social
  actions, which write signed journal events with no portal capability check.
- F3 (demo-owner mode as sole owner-mutation authorization, Host-header
  gate) is a self-granting demo capability mechanism: the seeded actor maps
  to controller for every demo site, then capability evaluation allows
  selected mutations. Honest scaffolding, dormant-by-design; production
  safety depends entirely on the demo gate, and the Host-header trust in
  isPrivateHost is the weak point.

## What survives vs what dies (agent capability boundaries)

Survives (canonical-worthy):
- Proposal digest binding on owner/site/object mutations: re-verify digest at
  submit, bind site patches to the signed envelope + current SiteSpec digest,
  echo digests at approval, re-derive before journal emission.
- BFF envelope signature verification + vocabulary enforcement + secret
  rejection at the gateway.
- Planning grants (grants.ts) as UI/agent hints, clearly separated from
  authorization.
- Fail-closed agent effect filters (ask capabilities) and evidence-honesty
  attestation gates, with the explicit caveat that they do not authenticate.
- Namespace authorization seam (CanonicalizationService.authorizeNamespace)
  as the ONE write-path boundary; POST /events should converge to it.

Dies at the production boundary (demo-only, do not promote):
- Demo-owner mode and the Host-header private-host gate.
- Unsigned identity cookie as a principal selector.
- Self-asserted principals without a bridge: the three identity namespaces
  must be reconciled, not left parallel.
- The dormant kernel CapabilityAuthority must NOT be resurrected as a second
  authority; executor use-time authorization is UNOWNED and any future owner
  must be exactly one.

## CONFIRMED / REFUTED summary

- CONFIRMED: the kernel TS CapabilityAuthority is dormant; no live executor
  authorization authority exists (UNOWNED).
- CONFIRMED: proposal digest binding is per-path, not universal.
- CONFIRMED: three conflicting identity namespaces with no bridge.
- CONFIRMED: BFF envelope signature verification is live; controller
  authorization on OBJECT_UPDATED is absent at the gateway.
- REFUTED: adapter user-facing grants are (or imply) the executor
  CapabilityAuthority. They are planning hints; the executor authority does
  not enforce anything, anywhere.
- REFUTED: every consequential action is bound to an approved proposal
  digest. Follow/like/unfollow/profile/bio and the core direct emit branch
  carry no proposal.

## Patch and proposal status

- Adapter patches applied: NONE. Nothing in owned paths met the
  unambiguous-evidence bar.
- Core patches applied: NONE (propose-only always).
- Proposals written under
  ~/workspace/constitutional-sprint/patches/agent06-capability/:
  00-INDEX.md (dependency log), core-01 (OBJECT_UPDATED controller check),
  core-02 (POST /events direct-branch authorization), adapter-01 (evaluated,
  no patch warranted; agent01 dependency), adapter-02 (evaluated, ambiguous;
  agent04 dependency).
- Tests run: one read-only attempt of the existing ask-fyd jest suite
  (src/fyd/ask/__tests__/ask-fyd.test.ts) failed at the babel transform stage
  with 0 tests executed (sandbox environment issue); not pursued, since no
  patch was applied and no regression test was required.
- Repo state: no worktree file modified, nothing staged, nothing committed.
  COMMITS CREATED: NONE.

## Open questions for the coordinator

1. Deployed-path truth for POST /events: exact deployed Oracle bytes are
   unresolved; the 2026-09-16/17 capture suggests the deployed container may
   already enforce auth the worktree copy lacks. Verify before applying
   core-02.
2. Raw FYD projection API intent (agent04): raw debug surface or public API?
   One private object is served unfiltered today.
3. Identity reconciliation (agent05): bridge table for the three namespaces,
   or an explicit decision to keep lanes separate.
4. Executor use-time authorization remains UNOWNED: the convergence wave
   should name exactly one owner or explicitly defer it; Agent 06 must not
   create a second authority.
