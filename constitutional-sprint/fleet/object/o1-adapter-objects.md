# O1 — Adapter Object Inventory (object/schema worker)

**Worker:** O1 (object/schema worker, depth 2/2 subagent). **Base:** adapter `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (verified HEAD, working tree clean throughout; read-only, no commits, no patches applied). **Core consulted read-only** (`/home/nolan/ping`) only where adapter code calls into it (margin object layer, constellation geometry). **Read first:** `EVIDENCE-OBJECT-INTENT.md`, `AUTHORITY-MAP.md` (all row citations below are consistent with both).

**Constitutional vocabulary used for KIND:** ACTOR / OBJECT / RELATIONSHIP / CAPABILITY / TRANSITION / EVIDENCE (small core). Anything else is labeled "business noun wearing constitutional clothes" or "derived/projection".

**CLASSIFICATION values:** `sound` (correct constitutional shape) / `fork` (two mechanisms mint the same kind) / `drift` (identity lost/changed across a transform) / `dormant` (no live readers) / `open-mint` (anyone can mint the id) / `business-noun` (domain vocabulary promoted without constitutional role) / `demo-standin` (placeholder where a constitutional authority must connect).

---

## Row table

Columns: DOMAIN / NOUN / SCHEMA / MINTER / ID SCHEME / STORE / READERS / KIND / CLASSIFICATION / CONF / BROKEN BOUNDARY / AFFECTS AGENTS

### A. Object substrate

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| substrate | PingObject | any (`schema` string; `KNOWN_OBJECT_SCHEMAS` lists 10) | proceduralizer `deriveBusinessId` (proceduralizer.ts:615); overlay `add_object` emitter (fyd-tenant-graph.ts:285); media attach `mediaToObject` (attach.ts); core runtime at promotion (documented in proceduralizer.ts:595-602) | `website-business-<sha256[0:16]>` (proceduralizer) / `fyd-media-<sha256[0:16]>` (media) / arbitrary emitter string (add_object) / runtime canonical (core, unverified here) | repo fixtures (`__fixtures__/*.ts`); `/home/nolan/ping/var/fyd-projections/<siteId>.json`; gateway journal (overlay ops) | view.ts, ping-object-source.ts, fyd-tenant-graph.ts, circle-adapter.ts, attach.ts | OBJECT | **fork**: three adapter-side minters + emitter-open minter + core runtime; no single minting authority in adapter | HIGH | **BB-1** multi-minter identity; **BB-2** add_object accepts any unique emitter string (fail-open id) | YES (Ask FYD, object tool descriptions) |
| substrate | PingRelationship | predicate vocab split (see below) | deriveRelationshipId (proceduralizer.ts:619); media attach (attach.ts:112); add_relationship emitter | `rel-<sha16(subject\|predicate\|object)>` (proceduralizer) vs `rel-<digest[0:12]>-<predicate-no-underscores>` (media attach) vs arbitrary emitter string | same stores as PingObject | sitespec graph.ts, attach.ts, eligibleComponents | RELATIONSHIP | **fork**: two different digest truncations (16hex vs 12hex+suffix) + open emitter ids; no single relationship minting authority | HIGH | **BB-2** (extends to relationships) | YES |
| substrate | business object (role) | `ping.social.business@1` (+ `ping.knowledge.business@1` via SCHEMA_ROLES) | same as PingObject | same as PingObject | same as PingObject | eligibility.ts:91 filters `SCHEMA_ROLES.business` | OBJECT | sound as OBJECT; but **fork** in the schema catalog: FYD_SCHEMAS claims "exactly three" (schemas.ts:1) while KNOWN_OBJECT_SCHEMAS (lib/ping/types.ts:62) lists 10 and SCHEMA_ROLES adds the `ping.knowledge.*` vocabulary | HIGH | **BB-3** schema-catalog fork ("exactly three" is false at code level) | YES (builder eligibility, planner) |

### B. Tenant / site

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tenant | Tenant (TenantContext.tenantId) | n/a (scope, not record) | none; pinned in code | DNS-safe slug, `TENANT_ID_PATTERN /^[a-z0-9-]{1,64}$/` (tenant-context.ts) | code: `FYD_TENANT_PINS` (fyd-tenant-graph.ts:104-124) — exactly 2 tenants: `happy-place`, `coppersmith-plumbing` | `assertTenantKey` across stores/routes | CAPABILITY (access scope) | **business-noun**: "tenant" is a scope string, not a minted object; there is no tenant creation authority — adding a tenant = editing source code | HIGH | **BB-4** no tenant minting authority | YES (Ask per-tenant, all scoped stores) |
| tenant | site definition | n/a | none | siteId == tenantId (same slug) | no site record exists in adapter; site truth lives in `ProjectionMeta` + dump.py meta + journal overlays | ping-object-source.ts, fyd-tenant-graph.ts | n/a (identifier, not a record) | **business-noun**: the "site" noun has no object of its own — no site record (name, settings) anywhere in the adapter | HIGH | BB-4 (same gap) | YES |

### C. Owner intent

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| owner | OwnerCommand (move-service, set-service-visibility, add-service, set-address-visibility, set-contact-field, revert-contact-field, confirm-contact-field) | n/a (command envelope) | `parseOwnerCommand` (owner-store.ts:545); validated, fail-closed | n/a (commands are transient) | transient (become OwnerEvents) | `applyOwnerCommand` (owner-store.ts:150) | TRANSITION | sound: bounded typed command set, fail-closed | HIGH | none | no (server-side only) |
| owner | OwnerEvent (owner event log) | n/a | `appendOwnerEvent` (owner-events.ts:622), validated + demo-owner-mode gated | sha256 content-hash over canonical (sequence, actor, target, previous basis, new value, time, evidence ref) with `fyd-owner@1` generator binding (owner-events.ts:134) | `data/fyd-owner/<objectId>.json` (atomic rewrite, all prior events retained) | `projectOwnerState` (reducer fold), overrides GET route | EVIDENCE | sound as EVIDENCE (append-only, deterministic ids, revert appends `owner.restored-fact`, never deletes) | HIGH | none (mechanism); attribution gap below | YES (owner state feeds views) |
| owner | owner actor | n/a | n/a (demo) | seeded demo actor label (owner-mode/demo-chain.ts) | n/a | stamps every owner response | ACTOR | **demo-standin**: all owner-intent EVIDENCE is attributed to an unverified demo actor; `src/fyd/identity/` real auth is disconnected (EVIDENCE §3.1 C4 PROVEN) | HIGH | **BB-5** no owner identity authority connected; must resolve before real owner auth or evidence is misattributed | YES |
| owner | OwnerOverrides / OwnerAssertion projection | n/a | reducer fold over event log (per read) | derived from event ids | per-read derivation (not stored as truth; store file holds the log) | view.ts `composeObjectView`, overrides route | OBJECT (derived) | sound: derived object, never source truth | HIGH | none | no |
| owner | owner-store key (objectId vs slug) | n/a | `composeObjectView(graph, siteId, obj, viewId, overridesKey)` | slug (`happy-place`) on the slug path (view.ts:316) vs PING object id (`website-business-...`) on the by-id path (by-id.ts:36) | `data/fyd-owner/<key>.json` — two possible log files for the same business | overrides GET route keys history to raw URL param (route.ts:31); mutation route resolves slugs only (overrides/route.ts:205) | n/a (keying) | **drift**: same business's owner intent can land in two different log files per entry path (EVIDENCE D2, mechanism PROVEN) | HIGH | **BB-8** owner-store key split (proposed P2) | YES (owner corrections invisible across paths) |

### D. Claims

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| claim | ResourceClaim (`kind: "fyd-site"`) | resource claim record (types.ts) | claim machine (`createObserved`/`claim`/...) via 4 claim routes | `claimResourceIdForUrl`: `url-<sha256(normalized origin)[0:16]>` (resource-id.ts) — different pages on same origin share one claim | `data/fyd-claims/<resourceId>.json` (atomic tmp+rename replace of mutable aggregate) | claim routes, `anonymous-preview.ts` | OBJECT (mutable state aggregate, not a constitutional object) | sound as record; but `release()` sets `verification: null` then `writeClaim` replaces the file — the complete prior VerificationProof is destroyed from persisted current state, only a summarized audit event remains (EVIDENCE D1, mechanism PROVEN) | HIGH | **BB-6** claim release deletes persisted verification proof | moderate (claim routes only) |
| claim | VerificationProof | proof record | verify route via verification-seam.ts | n/a (nested in claim) | nested in ResourceClaim file | claim routes | EVIDENCE | sound but thin: only `operator-attestation` implemented, honestly labeled "a statement, not a cryptographic proof" | HIGH | BB-6 | moderate |
| claim | ClaimEvent history | audit event | claim machine `withEvent` | append order | nested in ResourceClaim file | claim routes | EVIDENCE | sound: append-only audit trail | HIGH | none | no |

### E. Observations / refresh lane

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| refresh | Observation (refresh/types.ts) | website/facebook/synthetic observation | website-observe.ts (pure extraction), facebook-source.ts | `observationId` timestamp-based (website-observe.ts); `claimId` = hash(entityId\|field\|sourceKind\|normalizedValue) | none (explicit "Nothing here writes to the PING journal"; run-t2.ts read-only lane) | none live (AUTHORITY-MAP #44 DORMANT) | EVIDENCE | **dormant**: temporal observation structures with no persistence and no route consumers; timestamp ids risk same-ms collision | HIGH | **BB-7** write-only/dormant evidence lane | no |
| refresh | Snapshot (snapshot-store.ts) | evidence-like record | `saveSnapshot` (caller-supplied dir) | caller-supplied `snapshotId` | `<snapshotId>.json` plain file, same-ID overwrites | none live | EVIDENCE | **dormant**: overwrite store with no live readers; observation-level `evidenceRef` lost except where duplicated in claims (EVIDENCE A3) | HIGH | BB-7 | no |
| refresh | Conflict | conflict record (open/resolved) | conflict.ts `resolveConflict` | n/a | no persistence path found | none | OBJECT | **dormant**: conflict records are created and resolved in memory only | MEDIUM | BB-7 | no |
| media | MediaManifest | manifest record | ingest.ts (`ingestRunId: randomUUID()`, `pipelineVersion: "fyd-media@2"`) | manifest keyed by siteId; run id = uuid v4 | `src/fyd/media/manifests/<siteId>.json` (whole-file replace) | attach.ts, bundle-media.ts, provenance.ts | EVIDENCE | sound as evidence container; overwrite semantics (regeneration does not merge prior manifest — EVIDENCE A5, R5) | HIGH | none new (R5 recorded) | YES (media bundle) |
| media | MediaObservation | fetch-attempt record | ingest.ts | n/a (nested) | nested in MediaManifest.observations | provenance.ts (read-side projection) | EVIDENCE | sound | HIGH | none | no |

### F. Media objects

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| media | FydMediaObject | `ping.social.media@1` (MEDIA_SCHEMA_ID) | ingest.ts (single minter) | `fyd-media-<sha256(original bytes)[0:16]>` — content-addressed, deterministic (ingest.ts:151) | media manifest | attach.ts → graph | OBJECT | sound: the cleanest minter in the adapter (single minter, content-addressed ids, explicit RightsSource classification enforced by pipeline) | HIGH | none | YES (graph augmentation) |
| media | MediaVariant | rendition record | derivatives.ts | nested; `derivedFrom` = sha256 of original bytes (explicit derivation edge as data) | nested in manifest | select.ts, bundle-media.ts | OBJECT (derived) | sound: derived-asset relationship is data, not convention | HIGH | none | no |
| media | media `depicts` / semantic predicates | `represented_by` / `illustrated_by` / `has_media` / `has_image` (attach.ts MEDIA_PREDICATES) | attach.ts `predicateForSubjectSchema` (regex on subject schema) | relationship id `rel-<digest[0:12]>-<predicate>` (attach.ts:112) | graph (appended by attach) | `mediaForObject()` selectors | RELATIONSHIP | sound as relationship; note predicate chosen by regex on subject schema (`/business/`, `/service/`, `/project/`) — a new schema containing those substrings gets the wrong predicate | MEDIUM | minor: regex-based predicate selection | YES |

### G. Derived projections (never stored as truth)

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| projection | ObjectView | read-model shape (object/types.ts) | `composeObjectView` (view.ts:213) | `viewId` = slug on slug path, PING object id on by-id path (BB-8) | transient | pages, api routes, object-projection.ts | OBJECT (derived projection) | sound as projection; **drift**: the same business yields different `view.id` per entry path (slug vs `website-business-*`) | HIGH | **BB-8** | YES |
| projection | CircleProjection | read-model shape | `loadCircleProjection` (view.ts:361) | inherits view id | transient | circle route | OBJECT (derived) | sound | HIGH | BB-8 (inherited) | no |
| projection | MarginObjectDescriptor (CORE, `/home/nolan/projects/ping/src/fyd/ui/object-layer/types.ts`) | presentation descriptor | core page code (consulted read-only) | `objectId` = PING object id (example in file: `"happy-place"` — slug form) | transient | MarginObjectLayer.tsx, ObjectCircle.tsx, PeekCard.tsx | OBJECT (derived) | sound: pure presentation descriptor; keys follow/like state by objectId | HIGH | none | no |
| projection | constellation geometry (CORE `star-layout.ts::starLayoutFor`) | n/a | n/a (pure function) | n/a — cells derive from member count/order only | none | core ClusterSlot component | n/a | correctly non-constitutionalized: deterministic pure math, no records, no identity | HIGH | none | no |
| projection | ObjectGraph / FydTenantGraph / ProjectionMeta | graph aggregate + digest envelope | `getPingObjectGraph(Sync)` (dump JSON) vs `getFydTenantGraph` (fixture + journal) | graphDigest = sha256(canonicalized graph); baseDigest pins fixture | transient | all render/ask lanes | OBJECT (derived aggregate) + EVIDENCE (digests) | **fork**: two competing graph compilers serve different consumers (EVIDENCE D3/B6, mechanism PROVEN); digest verification is sound in both | HIGH | **BB-9** dual read authorities (public render vs Ask FYD can disagree) | YES |
| projection | GraphAttestation | attestation envelope | `verifyObjectGraph` (object-builder.ts) | digest over canonicalized graph | returned, not persisted | builder planner | EVIDENCE | sound: adapter's closest witness analog (builder version + schema-catalog version + digest + checks + evidence-preserving derivations) | HIGH | none | no |
| projection | SiteSpec (FYDPage/FYDSection/FYDQuery) | plan record (sitespec/types.ts) | builder planner | section id = `pageSlug:component:index` (deterministic) | transient (spec files in build lane) | renderer | OBJECT (portable plan) | sound: spec is data, never JSX | HIGH | none | YES (generator/agents) |

### H. Capabilities, transitions, intents

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| capability | ObjectCapability (view/ask/follow/like/call/email/website) | action-row union (object/types.ts) | `buildCapabilities` (view.ts:167) | n/a | transient | ObjectView.capabilities → action row | CAPABILITY | **fork** with schema-derived `FYDActionKind` (schemas.ts `capabilityOptions`): schema says business is `likeable: false` ("content, never identities") but `buildCapabilities` always emits `{kind:"like"}` (and `{kind:"follow"}`) for business objects (view.ts:182) | HIGH | **BB-10** capability vocabulary divergence: agent tool descriptions (from capabilityOptions) say like is unavailable on business while the UI offers it | YES (Ask FYD / agent tool descriptions) |
| transition | FYD_SITE_OVERLAY ops (`set_field`, `add_object`, `add_relationship`, `deactivate_object`, `set_presentation_intent`) | op envelope | emit-overlay.py (core tools), customize apply-layer | event ids = gateway content-hash ids; **object/relationship ids inside ops are emitter-chosen** | gateway `ping_events` (append-only) | dump.py `apply_overlays`, TS `applyTenantOverlays` | TRANSITION | sound as journaled transitions; **open-mint** for the payload ids (BB-2) | HIGH | BB-2 | YES |
| intent | PresentationIntentBlock / PresentationIntentDirective | intent record (customize/types.ts) | `buildPresentationIntentBlock` per read; journaled via `set_presentation_intent` ops | `intentId` (op-supplied) | journal (durable) + transient block | fyd-tenant-graph.ts | EVIDENCE (journaled intent) / OBJECT (derived block) | sound: factual vs presentation intent are distinct op streams, separately digested | HIGH | none | YES |

### I. Identity across the object rows (cross-cutting)

| DOMAIN | NOUN | SCHEMA | MINTER | ID SCHEME | STORE | READERS | KIND | CLASSIFICATION | CONF | BROKEN BOUNDARY | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| identity | controllerId namespace | n/a | fixture author / proceduralizer / gateway | fixture: `identity_fyd_compiler_test`; media: `web:<ownerId>`; social lane: gateway `identity_<16hex>`; OIDC lane: uuidv5; website-derived documented as "stable web: id" (lib/ping/types.ts:PingObject) | wherever objects live | grants.ts, action-planner | ACTOR (reference) | **fork**: three live identity namespaces with no bridge table (AUTHORITY-MAP Overlap-1); the same business can appear under different controllerIds per lane | HIGH | **BB-11** identity namespace fork touches object ownership | YES |
| identity | business object id across fixture vs canonical | `ping.social.business@1` | proceduralizer fixture regen | fixture: `website-business-<sha16>` (happy-place-graph.ts) vs slug form (`happy-place`, `coppersmith-plumbing`) used by owner logs, margin descriptors, overlay siteIds | fixtures vs dump-era projections vs owner logs | view.ts, by-id.ts, core margin layer | OBJECT | **drift**: fixture-regen ids and slug ids name the same business differently; which one a consumer sees depends on the read path (BB-8/BB-9 mechanism) | MEDIUM (slug-as-object-id confirmed in margin types example + D2 evidence; dump-era canonical id form not re-verified in this pass) | **BB-12** identity drift across fixture/projection generations | YES |

---

## Hunt results (asked-for patterns)

1. **Two stores minting the same object kind with different IDs — FOUND.** PingObject: proceduralizer (`website-business-<sha16>`), media ingest (`fyd-media-<sha16>`), overlay `add_object` (arbitrary emitter string), core runtime at promotion (unverified scheme). PingRelationship: two different digest truncations + open emitter ids. (BB-1, BB-2)
2. **Identity collisions — PARTIAL.** 64-bit truncated digests (16 hex) across two minters; distinct prefixes (`website-business-` vs `fyd-media-` vs `rel-`) make accidental collision across kinds unlikely, but nothing enforces prefix discipline for emitter-supplied `add_object` ids — an emitter can mint `fyd-media-<anything>` and shadow a media object id. No collision observed, mechanism is open. (BB-2)
3. **Objects without provenance — FOUND (one).** `applyTenantOverlays` `add_object`/`add_relationship` overwrite `provenance`/`evidenceRef` with `ping-event:<eid>` at read time, so journal-added objects always get provenance — good. But fixture-base objects carry `procedural-fixture` provenance pinned to a regen script that is **not in the repo** (`/home/nolan/fyd-proof-run/regen.ts` — outside the adapter, per fixture header); the provenance chain dead-ends at an off-repo script. (minor, recorded)
4. **Write-only objects — FOUND (dormant lane).** Snapshot store (`snapshot-store.ts`), media/preview manifests for the refresh lane, Conflict records: written by lanes with no live route readers (AUTHORITY-MAP #44 DORMANT; BB-7). Preview manifests (capture.ts) ARE read (page.tsx, portal-rail) — not write-only. Resource-claim aggregates are read. So write-only = refresh Observation/Snapshot/Conflict only.
5. **Objects nothing reads — FOUND.** Same as #4 plus `FYDActionKind`/`capabilityOptions` output (only consumed by `agentToolDescription`, which itself has no verified live caller — tool description text may be dead output). `attest`/owner-mode H3 gate already flagged DORMANT in the authority map.
6. **Business nouns constitutionalized unnecessarily — FOUND (two).** (a) "Tenant" is carried as a constitutional-looking scope/authority concept (TenantContext, assertTenantKey, scoped-stores "Phase-0 tenant contract") but there is no tenant object, no tenant minting authority, and the registry is two hardcoded lines — the ceremony outruns the mechanism. (b) `FYD_SCHEMAS` "exactly three (Business, Service, Post)" is asserted as a constitutional-style law ("Not one hundred.") while the code operates on 10 known schemas plus a parallel `ping.knowledge.*` vocabulary — the law statement is aspirational, not descriptive.
7. **Object identity lost across transforms — FOUND.** Slug-keyed vs object-id-keyed owner logs (BB-8/D2); ObjectView.id changes per entry path; fixture ids vs slug ids for the same business (BB-12); canonical-JSON serializer fork (`canonicalizeJson` drops undefined, `canonicalize` serializes undefined as null — AUTHORITY-MAP Overlap-3) means the same logical object hashes differently in the owner-event/signing lane vs the digest-verification lane — an identity-relevant divergence at the byte level, confirmed live in both lanes.

## Objects correctly kept OUT of the constitutional core (good news)

- **Constellation geometry** (`starLayoutFor`, core): pure deterministic function of count/member order — correctly never an object, never stored. Sound.
- **MarginObjectDescriptor** (core): presentation descriptor only; reads object data, mints nothing, keys follow/like state by object id. Sound.
- **Media lifecycle** (source_reference → stale): recorded as data on FydMediaObject, not as constitutional transitions. Sound.
- **Owner intent**: journaled as evidence, never mutates source (EVIDENCE R2/R3). Sound mechanism; only the actor attribution (BB-5) and key split (BB-8) are broken.
- **SiteSpec**: data, not JSX; deterministic ids. Sound.

---

## Proposed diffs (PROPOSE ONLY — no patches applied)

### P1 — Gate overlay op payload ids (BB-2: add_object/add_relationship open mint)
- **WHY:** Anyone who can emit a `FYD_SITE_OVERLAY` event can mint an object/relationship with ANY unique id, including id strings that shadow another minter's namespace (`fyd-media-*`, `website-business-*`). The read seam's only check is uniqueness.
- **EVIDENCE:** `src/fyd/data/fyd-tenant-graph.ts:285-310` — `add_object`/`add_relationship` accept `o.id`/`r.id` as any non-empty string not already present; no prefix or scheme validation.
- **MINIMUM CHANGE:** In `applyTenantOverlays` (and the dump.py port), reject `add_object`/`add_relationship` ops whose `id` does not match the minter's declared scheme (e.g. require `website-`/`fyd-media-`/`rel-` prefix consistent with the op's schema, or require content-derived ids). Fail closed (throw `overlay_malformed`) as the engine already does for other malformed ops.
- **TEST:** Feed an `add_object` op with id `fyd-media-deadbeef` into `applyTenantOverlays`; expect rejection. Feed a schema-consistent id; expect acceptance.
- **RESULT:** Not executed (propose-only mandate). Awaiting parent approval to implement.

### P2 — Single owner-store key rule (BB-8 / D2)
- **WHY:** The same business's owner intent lands in `data/fyd-owner/happy-place.json` (slug path) or `data/fyd-owner/website-business-<hash>.json` (by-id path); the GET route keys history to the raw param while the mutation route resolves slugs only. One owner's corrections can be invisible to another entry path.
- **EVIDENCE:** `src/fyd/object/view.ts:213,316` (overridesKey = slug on slug path), `src/fyd/object/by-id.ts:36` (overridesKey = obj.id), `src/app/api/fyd/objects/[objectId]/route.ts:31`, `src/app/api/fyd/objects/[objectId]/overrides/route.ts:205`.
- **MINIMUM CHANGE:** Canonical rule: overridesKey is ALWAYS the PING object id. Add a one-time migration that merges any slug-keyed log into the object-id-keyed log (append events, never delete), and make the slug path resolve slug → object id before keying.
- **TEST:** Apply a correction via slug path, read via by-id path (and vice versa); both must show the correction; only one log file exists.
- **RESULT:** Not executed (propose-only). Awaiting parent approval.

### P3 — Record the object-id minter registry (BB-1)
- **WHY:** Three adapter minters + one emitter-open path + core runtime promotion mint PingObject ids with different schemes and no documented registry; future agents will guess.
- **EVIDENCE:** proceduralizer.ts:615,614-621; ingest.ts:151; fyd-tenant-graph.ts:285-310; proceduralizer.ts:595-602 (runtime promotion comment).
- **MINIMUM CHANGE:** Docs-only: add `docs/object-id-schemes.md` (or extend the schema catalog header) recording minter → scheme → prefix → collision domain, plus the rule that `add_object` ids must name their minter (ties to P1).
- **TEST:** n/a (documentation). Review: every current id in fixtures/manifests maps to exactly one registry row.
- **RESULT:** Not executed (propose-only).

### P4 — Reconcile the like/follow capability fork (BB-10)
- **WHY:** Schema law says business objects are not likeable ("content, never identities", schemas.ts BUSINESS_SCHEMA.likeable=false; capabilityOptions grants like only when likeable) but `buildCapabilities` always emits `like` (and `follow`) for business objects (view.ts:182). Agent tool descriptions and the UI disagree about what a business object can do.
- **EVIDENCE:** `src/fyd/sitespec/schemas.ts:322-343` vs `src/fyd/object/view.ts:167-194` (`buildCapabilities`).
- **MINIMUM CHANGE:** Decide one rule (recommendation: follow the schema law — emit `like` only when the schema's `likeable` flag is true, threading the schema def into `buildCapabilities`; OR set business `likeable: true` with a documented reason). Update the other side to match.
- **TEST:** Compose ObjectView for a business fixture; `capabilities` must equal `capabilityOptions(BUSINESS_SCHEMA, …)` mapped to ObjectCapability kinds.
- **RESULT:** Not executed (propose-only).

### P5 — Fix the "exactly three schemas" law statement (BB-3)
- **WHY:** schemas.ts header asserts "FYD proof schemas: exactly three (Business, Service, Post)... Not one hundred." The same file defines the 7-role SCHEMA_ROLES map including product/location/person/article and a parallel `ping.knowledge.*` vocabulary; lib/ping/types.ts lists 10 known schemas. An agent reading the header will make wrong assumptions (e.g. that product/location objects cannot exist).
- **EVIDENCE:** `src/fyd/sitespec/schemas.ts:1-3` vs `:143-165` (SCHEMA_ROLES) vs `src/lib/ping/types.ts:62-73`.
- **MINIMUM CHANGE:** Docs-only: rewrite the header to state the proof vocabulary (3 fully-defined schemas) vs the operational vocabulary (10 known + knowledge projection), and which lanes may mint which.
- **TEST:** n/a. Review against eligibility.ts/planner.ts usage.
- **RESULT:** Not executed (propose-only).

### P6 — Retain VerificationProof on release (BB-6 / D1)
- **WHY:** `release()` nulls `verification`, and `writeClaim` replaces the aggregate file, so the complete prior proof is destroyed from persisted state; only a summarized audit event remains. If VerificationProof is constitutional evidence, this is evidence correction.
- **EVIDENCE:** `src/fyd/claim/machine.ts:159-168`, `src/fyd/claim/store.ts:68-77`.
- **MINIMUM CHANGE:** On release, move the full `VerificationProof` into the appended `released` history event payload (or a `pastVerifications` list) instead of nulling it; keep `verification: null` as the *current* state.
- **TEST:** verify → release → read claim file: full proof bytes present in history; `verification` null; state `observed`.
- **RESULT:** Not executed (propose-only).

### P7 — Retire or wire the refresh lane (BB-7)
- **WHY:** Observation/Snapshot/Conflict structures are written by dormant lanes with no live readers and no journal sink — write-only evidence that will rot and mislead future readers into thinking an observation pipeline exists.
- **EVIDENCE:** AUTHORITY-MAP #44 DORMANT; `src/fyd/refresh/run-t2.ts` (manual script, no journal writes); no route imports `src/fyd/refresh/*`.
- **MINIMUM CHANGE:** Either (a) mark the lane `RETIRED` in its README with a pointer to the successor, or (b) wire `extractWebsiteClaims` output into the media/snapshot evidence sink with persistence. Recommend (a) unless a consumer is planned.
- **TEST:** `git grep -l "fyd/refresh"` shows only tests + the retirement note after (a).
- **RESULT:** Not executed (propose-only).

### P8 — Define tenant creation (BB-4)
- **WHY:** Tenants are two hardcoded lines in `FYD_TENANT_PINS`; onboarding a third business requires a code edit + digest pinning, invisible to any agent or owner flow.
- **EVIDENCE:** `src/fyd/data/fyd-tenant-graph.ts:104-124`.
- **MINIMUM CHANGE:** Define a journaled tenant-registration op (or a pinned-registry file with a documented add-tenant procedure) so tenant creation is an explicit, reviewable act rather than a source edit. Minimal: move pins to a JSON registry file with a checksum and a documented procedure.
- **TEST:** Add a tenant via the procedure; `getFydTenantIds()` lists it; digest pin verified.
- **RESULT:** Not executed (propose-only).

---

## Summary

**Scope inventoried:** every object mechanism in the adapter — `fyd-tenant-graph.ts`, object models/schemas (`lib/ping/types.ts`, `sitespec/schemas.ts`, `object/types.ts`), tenant objects (TenantContext + FYD_TENANT_PINS), business objects, margin object layer + constellation geometry (core, consulted read-only), owner intents (commands/events/store), claims, observations, media bindings, site definitions.

**Headline findings:**
1. **Object identity has no single minting authority in the adapter** (BB-1): the proceduralizer, the media pipeline, and any overlay emitter each mint PingObject ids with different schemes; `add_object` accepts arbitrary emitter strings (BB-2, fail-open).
2. **Identity drifts across read paths** (BB-8/BB-12): owner logs keyed by slug OR object id; ObjectView.id differs per entry path; fixture ids (`website-business-*`) vs slug ids (`happy-place`) name the same business.
3. **Two capability vocabularies disagree** (BB-10): schema law says businesses are not likeable; the view composer emits `like` anyway. Agent-facing tool descriptions and UI diverge.
4. **Tenant/site are scope strings, not objects** (BB-4): no tenant minting authority; adding a tenant is a code edit.
5. **Claim release destroys the persisted VerificationProof** (BB-6/D1); the refresh lane is dormant write-only evidence (BB-7).
6. **Correctly non-constitutionalized:** constellation geometry (pure function), margin descriptors (presentation-only), media lifecycle, owner intent (journaled evidence, never mutates source), SiteSpec (data not JSX).

**Broken-boundary count:** 12 (BB-1…BB-12), of which 8 are proposed above (P1–P8); BB-9 (dual graph read authorities = D3), BB-11 (identity namespace fork), BB-5 (demo owner actor) are owned by other workers (read-path convergence, identity, owner-auth) — recorded here because they touch object identity, not duplicated as proposals.

**No commits created. No files in the repos modified. `git status` clean at start and end (a69bb68f).**

## Next adjacent gap I see

**The core-runtime side of object minting is unverified from the adapter.** This pass confirmed the adapter's minters and the emitter-open hole, but the fifth minter — the core runtime's `CanonicalObject` authority (`createCanonicalObject`, `gateway/canonical_object_authority.js`: "Nothing else creates constitutional objects") and its `IdentityAuthority.generate_id()`/`generate_deterministic_id()` — was only consulted via the authority map's documented claims. A core-side object worker should verify: (a) the exact runtime id scheme for promoted website-derived objects (does promotion preserve `website-business-*` ids or re-mint?); (b) whether gateway `identity_<16hex>` and adapter `web:` controllerIds are bridged anywhere; (c) whether the gateway validates `FYD_SITE_OVERLAY` op payload ids at ingest (which would close BB-2 server-side regardless of the adapter seam). Until that is verified, P1's fail-closed validation is the only defense, and it lives in the adapter, not at the authority.
