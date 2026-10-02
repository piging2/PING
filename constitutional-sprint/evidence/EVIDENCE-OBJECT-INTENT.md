# EVIDENCE-OBJECT-INTENT: Forensic Investigation Report

**Domain:** Phases 5, 6, 8 — observation → evidence → object compilation → owner intent

**Observed:** 2026-09-24 UTC. **Written:** 2026-09-24 UTC.

**Repositories (read-only, no writes made, no git mutation):**
- Adapter surface: `/home/nolan/projects/ping-constitutional` on the Pig, HEAD `a69bb68f Gate owner mutation behind demo-owner-mode` (verified clean before and after; `git status --porcelain` empty).
- Canonical core: `/home/nolan/ping` on the Pig (live PING runtime home; code dirs only swept; `vault/`, `*.key`/`*.pem`, oauth artifacts opened never; no secret values recorded; no processes touched).

**Method:** Remote shell reads via the mandated transport; a local read-only mirror of the adapter `src/` at `~/workspace/constitutional-sprint/repo-mirror/src` used for exact line citation. The hundreds of stale top-level audit markdown files in `/home/nolan/ping` were treated as pointers only, never as proof; all canonical-core claims cite live code paths.

**Conventions:** Every major claim ends `PROVEN`, `NOT PROVEN`, or `BLOCKED`. Repo-relative `file:line` references point at the repo named in the claim header (ADAPTER = ping-constitutional, CORE = /home/nolan/ping). Em-dash note: none used.

---

## 1. Phase 5 — Observation → Evidence trace (ADAPTER)

### 1.1 Persistence inventory (every evidence/observation writer found)

| # | Writer | Store | Durability semantics | Overwrite of prior records? |
|---|--------|-------|----------------------|------------------------------|
| 1 | `src/fyd/refresh/snapshot-store.ts:10` `saveSnapshot` | caller-supplied dir, `<snapshotId>.json`, direct `writeFileSync` (`snapshot-store.ts:13`) | plain-file, same-ID overwrites | YES — same snapshot ID replaces prior file |
| 2 | `src/fyd/media/ingest.ts` media ingest | `opts.manifestPath` manifest file | whole-manifest replace | YES — regeneration does not read/merge existing manifest; prior manifest observations are not inherently preserved |
| 3 | `src/fyd/media/provenance.ts` | projects the manifest as evidence | read-side projection | n/a (read path over writer #2) |
| 4 | `src/fyd/preview/capture.ts` preview capture | `src/fyd/preview/manifests/<objectId>.json` | whole-manifest replace per object | YES — replaces per-object manifest |
| 5 | `src/fyd/claim/store.ts:68` `writeClaim` | `data/fyd-claims/<resourceId>.json` | atomic tmp+rename replace of the mutable aggregate | YES by design (mutable aggregate) — see defect D1 |
| 6 | `src/fyd/object/owner-events.ts:622` `appendOwnerEvent` | `data/fyd-owner/<objectId>.json` | atomic tmp+rename (`owner-events.ts:612-614`) of the event log file; all prior events retained | NO — file rewritten atomically but every prior event is preserved; `revert` appends `owner.restored-fact`, never deletes |
| 7 | PING gateway `/events` POST (CORE `gateway/routes/events.js:117-127`) | `ping_events` via `UnifiedEventRuntime.emit` | `INSERT ... ON CONFLICT (event_id) DO NOTHING`; same-ID + different-payload → hard rejection | NO — append-only with fail-closed collision detection (see §4.1) |
| 8 | `emit-overlay.py` (CORE `tools/fyd-site-projection/emit-overlay.py:44-51`) | gateway `/events` as `FYD_SITE_OVERLAY` with `event_data = {siteId, ops}` | inherits writer #7 semantics | NO |
| 9 | Adapter `run-t2.ts:11` | stdout JSON report | explicitly "No journal writes" | n/a — a read-only lane |
| 10 | Customize apply layer (adapter `src/fyd/customize/apply-layer.ts`, `server.ts`) | gateway `FYD_SITE_OVERLAY` presentation-intent ops | inherits writer #7 semantics | NO |

`PROVEN`

### 1.2 Trace A: SOURCE → ACQUISITION → OBSERVATION → EVIDENCE (ADAPTER)

**A1. Acquisition is contract-only, not implemented.**
`src/fyd/acquisition/acquisition-adapter.ts` defines `AcquisitionRequest`, fetch policy, and `AcquiredObservation` (final URL, fetch time, status, bytes, policy notes, `evidenceHash`) but is explicitly "Types only. No implementation." The conceptual `SOURCE → ACQUISITION` leg is not executable in the adapter repo. `PROVEN`

**A2. Website observation is a pure extraction lane with no persistence.**
`src/fyd/refresh/website-observe.ts`: HTML + caller-supplied metadata → `Observation` + `Claim[]`. Claim IDs hash `entityId | field | sourceKind | normalizedValue`; `observationId` is timestamp-based. It records source URL, observed time, evidence reference, confidence, grade. It performs no network I/O and no persistence; it has no authorization header, no recorded-at timestamp distinct from observed time, no raw-content digest, and no canonical evidence envelope. `PROVEN`

**A3. Refresh snapshots are a separate plain-file evidence-like store.**
Writer #1. Snapshots keep captured time, source kind/URL, provenance, and claims, but the observation-level `evidenceRef` is lost except where duplicated inside claims. The `run-t2.ts` lane explicitly performs no journal writes. `PROVEN`

**A4. Conflict handling does not delete losing claims.**
`src/fyd/refresh/conflict.ts`: `resolveConflict` returns a new conflict with `status: "resolved"` plus decision metadata; both claims are retained. No persistence path for conflicts was found in the adapter. `PROVEN`

**A5. Media and preview captures are independent overwrite stores.**
Writers #2 and #4. Media records observations, source/final URL, observed time, original digest, derivatives, rights classification, rights basis; provenance is a read-side projection (`provenance.ts`). Regeneration replaces the whole manifest without reading the old one, so prior manifest observations are not inherently preserved. `PROVEN`

**A6. Resource claims are mutable aggregate files with embedded history.**
`src/fyd/claim/types.ts:80` carries `verification: VerificationProof | null`; `machine.ts:159-168` `release()` sets `{ state: "observed", claimedBy: null, verification: null }` while appending a summarized "released" audit event; `store.ts:68-77` `writeClaim` atomically replaces `data/fyd-claims/<resourceId>.json`. The complete prior `VerificationProof` is therefore removed from the current persisted state on release, with only a summary remaining in the human audit events. Whether `VerificationProof` counts as constitutional evidence is a constitutional-classification question; the removal mechanism is factual. `PROVEN` (mechanism); constitutional classification `BLOCKED` on the evidence definition.

**A7. Owner evidence uses an append-only event log with deterministic event IDs.**
`src/fyd/object/owner-events.ts:134` derives event IDs as SHA-256 over canonical JSON of (sequence, actor, target, previous basis, new value, time, evidence reference); `appendOwnerEvent` (`:622`) atomically rewrites the containing JSON file while retaining all prior events; revert appends `owner.restored-fact` and never deletes the correction. `PROVEN`

**A8. No historical owner-event mutation was found.**
The reducer mutates only a fresh projected `OwnerOverrides`; the owner correction overlay clones source fields and returns a new graph. `PROVEN` for the reviewed path.

---

## 2. Phase 6 — Object compilation trace (ADAPTER)

### 2.1 Trace B: EVIDENCE → OBJECT

**B1. Disk projection read seam fails closed.**
`src/fyd/data/ping-object-source.ts` reads `var/fyd-projections/<siteId>.json`, validates tenant, object/relationship structure, provenance references, graph digest, and presentation-intent digest; applies owner field corrections only after raw graph digest verification; fails closed on missing/malformed/tampered projection. `PROVEN`

**B2. Object semantic fields that exist.**
`src/lib/ping/types.ts`: `PingObject` (id, schema, controllerId, visibility, title, description, fields, created/updated timestamps, provenance), `PingRelationship` (id, subject, predicate, object, status, created time, evidence reference), `ProjectionMeta` (dumper version, base digest, graph digest, overlay event IDs, generated time, optional presentation-intent digest, event sequence range). Existing equivalents cover identity, schema/type, source lineage, evidence/event bindings, compiler version, canonical graph hash. No direct object-level canonical hash, predecessor ID, policy version, or explicit intent-binding field was found. `PROVEN` for the reviewed types.

**B3. ObjectView compilation is a multi-stage semantic projection, not one named object compiler.**
`src/fyd/object/view.ts` combines the digest-verified graph, deterministic transforms, media, and owner state; `src/fyd/object/object-projection.ts` adapts `ObjectView` into UI-facing factual claims and evidence labels. Owner additions/order/visibility compose separately from source. `PROVEN`

**B4. The adapter's object builder proposes no synthetic observations.**
`src/fyd/builder/object-builder.ts:150` `verifyObjectGraph` verifies the tenant's graph against the projection and emits a `GraphAttestation` (`:98`) carrying builder version, schema-catalog version, tenant, counts, a SHA-256 digest over the canonicalized graph (`:105`), checks, and evidence-preserving derivations (each derived edge names its source edge and rule — "the WHY THIS chain never invents evidence"); `:137` `proposeObjectDelta` returns empty upserts with the explicit comment "Observation intake arrives via the PING dump (the projection seam); this lane proposes no synthetic observations." `PROVEN`

**B5. Full object state is NOT PROVEN reconstructable from one complete history.**
The source graph can be rebuilt from fixture + ordered `FYD_SITE_OVERLAY` events; owner state from the append-only owner log; presentation intent from separate overlay events. But refresh/media observations are separate files not represented in one unified causal history. `NOT PROVEN`

**B6. Duplicate graph compiler/read paths exist.**
Disk projection (`ping-object-source.ts`) vs. fixture + live gateway overlay events (`fyd-tenant-graph.ts`); Python `dump.py::apply_overlays` vs. TypeScript `applyTenantOverlays` implement the same op vocabulary independently; Ask/media consumers use `fyd-tenant-graph` while pages/ObjectView/build/customize use `ping-object-source`. Competing read authorities for the same derived state. `PROVEN` (mechanism); live divergence impact `BLOCKED` on a production-traffic trace.

---

## 3. Phase 8 — Owner intent trace (ADAPTER)

### 3.1 Trace C: OWNER INTENT → EFFECT

**C1. Supported durable owner operations are bounded and typed.**
Correct/confirm/revert contact field; hide/show address; hide/show service; reorder service; add service — via `src/fyd/object/types.ts`, `commands.ts`, `owner-store.ts`. `PROVEN`

**C2. Owner intent is stored separately from source evidence and never mutates it.**
Contact corrections preserve `sourceValue` and `ownerValue`; the overlay applies after source digest verification; the source graph is unchanged; drift is derived per read (`owner-store.ts:120` `confirmationSourceDrifted`, "never persisted"); hide/show affects projection only. `PROVEN`

**C3. Mutation is digest-bound, two-stage, and demo-gated.**
`src/app/api/fyd/objects/[objectId]/overrides/route.ts`: propose then approve; approval must echo state/view/patch digests (`:340-341`); stale source or owner state refuses. The route requires `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` on localhost/private host (`:112`, `:127`). Capability is checked before append. `PROVEN`

**C4. The only owner-context implementation is the demo one; real owner auth is not connected.**
`src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts:93` `createOwnerContext` unconditionally returns `DemoOwnerContext.forTenant`; `:150-152` stamps every response "DEMO OWNER CONTEXT: mutations on this route run as a seeded demo actor. No owner identity was verified. Not a production owner API." The seam's docstring says a PING identity/capability implementation would replace "one class" later. `src/fyd/owner-mode/demo-chain.ts` uses a hard-coded seeded demo actor; session identity is audit-only. No production route creates an `OwnerEventActor.kind = "owner"`. Real OIDC-style identity machinery exists (`src/fyd/identity/`) but is not connected to owner mutation. HEAD's demo-mode gate reduces exposure but supplies no owner authentication/control proof. `PROVEN`

**C5. Plain-language customization is separately persisted presentation intent.**
`src/fyd/customize/types.ts`, `apply-layer.ts`, `server.ts`: plain text → typed intent → evidence-resolved → digest-bound proposal → `FYD_SITE_OVERLAY` presentation-intent op after demo approval; the projection stores it in a separately digested `presentationIntent` block; the apply layer overlays it on compiled SiteSpec without mutating object graph or design system. `PROVEN`

**C6. Owner-store key split is a real mechanism.**
`composeObjectView(graph, siteId, obj, viewId, overridesKey)` (`src/fyd/object/view.ts:213`); the slug business loader passes the slug (`view.ts:316` `composeObjectView(graph, slug, business, slug, slug)`); the per-ID loader passes the PING object ID (`by-id.ts:36` `composeObjectView(graph, siteId, obj, obj.id, obj.id)`). The owner log file is `data/fyd-owner/<key>.json`, so the same business's owner intent lands in different log files per entry path (e.g. slug `coppersmith-plumbing` vs object ID `website-business-2f1327c09d622175`, per `tools/fyd-site-projection/emit-overlay.py:40`). The GET route keys history to the raw URL param (`app/api/fyd/objects/[objectId]/route.ts:31` `readOverrides(objectId)`); the mutation route only resolves slugs (`overrides/route.ts:205` `loadObjectView(objectId)`). Mechanism `PROVEN`; which UI paths hit which key in production is `BLOCKED` on a production-traffic trace.

---

## 4. Canonical core sweep (`/home/nolan/ping`) — the true authorities

### 4.1 The "EVIDENCE IS NOT CORRECTED" test, run against the live journal

**Result: the live journal satisfies it; two adjacent stores do not fully.**

1. **`ping_events` append is correction-proof.** `POST /events` (`gateway/routes/events.js:117-127`) emits through `UnifiedEventRuntime.emit` (`ping-runtime/events/unified_event_runtime.js:74-90`): the event ID is a content-based SHA-256 over `{eventType, source, [namespace], [logical_id|payload]}` (deterministic, no `Date.now()`); persistence is `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING` (`:152`); on conflict the runtime re-reads the stored payload and compares canonical JSON, and on semantic mismatch fails closed with "Event ID collision: same event_id with different payload semantics" (`:161-174`). No `UPDATE` exists in the file. `PROVEN` — historical events cannot be corrected; only true duplicates are no-ops.

2. **Processed/failed markers do not touch evidence rows.** `markProcessed`/`markFailed` write to a separate `event_processing` operational table (`runtime/kernel/event_read_authority.js:304, :317`), never to `ping_events` payload/timestamp columns. `PROVEN`

3. **The older canonical-envelope table is also insert-safe.** `gateway/canonical_event_envelope.js:178` `executeEmitEvent` uses `INSERT INTO canonical_events ... ON CONFLICT (tenant_id, sequence) DO NOTHING`; event IDs are deterministic UUID v5 over `tenantId:eventType:timestamp:sequence` (`:66-90`). Mutable `processed`/`retries`/`last_error` columns exist but are operational metadata, not evidence content. `PROVEN`

4. **REFUTED as a live defect: `EventStorePersistence` replace-on-conflict.** `gateway/eventstore_persistence.js:358` (`_persistEvent`) does `ON CONFLICT (event_id) DO UPDATE SET event_data = $2` — a genuine correction mechanism, but a gateway-wide search found no consumers of the class (referenced only in its own file). Dead code, not on the live path. `PROVEN` (dead), so it is a latent hazard if ever wired in, not a live defect.

5. **NOT FULLY APPEND-ONLY: provenance records are last-writer-wins.** `gateway/provenance_authority.js:75` `recordProvenance` computes derivation path, causality chain, and lineage for an artifact and persists with `ON CONFLICT (artifact_id) DO UPDATE SET ...` (`:393`). Re-recording an artifact's provenance replaces the prior record. This is a derived-artifact index, not the raw event journal, so it is not the same as correcting a historical event — but any consumer that treats provenance_records as historical evidence inherits a correction path. `PROVEN` (mechanism); constitutional classification `BLOCKED` on the evidence definition (derived truth vs source truth).

### 4.2 Object compiler in the canonical core

**One canonical object envelope exists and is the consolidation target.** `ping-runtime/canonicalization/canonical_object.js:70` `createCanonicalObject` is the single immutable envelope: canonical bytes from payload (`:86`), canonical hash (`:87`), identity derived from canonical hash via the identity authority (`:98`), lineage with `source_id`/`derivation_path`/`provenance_chain` (`:101-106`), plus witness/certificate blocks. The header documents consolidation of ~15 isomorphic envelope implementations into this one. `gateway/canonical_object_authority.js:1-111` is the single authority ("Nothing else creates constitutional objects"), delegating to the shared envelope. `PROVEN`

**Reducers are code-bound to replay state.** `gateway/reducer_authority.js:1-29` is a shim delegating to `runtime/kernel/authorities/reducer_authority` — "Different reducer code must NOT produce same event stream with different state" (reducer hash fingerprint → reducer witness → replay certificate). `PROVEN` (interface); behavioral verification of replay certificates is `BLOCKED` on executing a replay.

**CONFIRMED / REFUTED vs adapter conclusions:**
- CONFIRMED: the adapter's disk-projection digest verification (`ping-object-source.ts`) mirrors the core's hash-bound object identity philosophy.
- CONFIRMED: the adapter's multi-stage projection (B3) matches the core pattern (envelope → lineage → witness → replay), and the adapter's "no synthetic observations" object builder (B4) is consistent with the core's evidence-first design.
- REFUTED: the adapter's duplicate-compiler concern (B6) is not mirrored at the envelope layer — the core has exactly one canonical object envelope by documented consolidation. The duplication is confined to the FYD adapter's read paths (disk dump vs live journal replay).
- NOT MAPPED: the core's acquisition authority (`gateway/acquisition_authority.js`) is Git-repository acquisition, not business/website observation. The FYD business observation lane exists only in the adapter + `tools/fyd-site-projection/`; there is no canonical business-observation authority in the core.

### 4.3 Owner intent in the canonical core

**The FYD overlay journal is the core's owner-intent evidence, and it is append-only.** `tools/fyd-site-projection/emit-overlay.py:44-51` posts `FYD_SITE_OVERLAY` to gateway `/events` with `event_data = {siteId, ops}` (ops vocabulary `set_field`, `add_object`, `add_relationship`, `deactivate_object` per `:14-17`); the emit goes through `UnifiedEventRuntime.emit` → `ping_events` (append-only per §4.1). `dump.py` reads the ordered journal and replays overlays onto the base projection; `set_field` mutates only the derived graph during replay (`updatedRefs`), original journal events remain. `PROVEN`

**Owner factual vs presentation intent separation exists at the event level.** Owner factual intent (owner event log in the adapter, owner corrections) and presentation intent (customize apply layer emitting presentation-intent ops into the same overlay journal with a separately digested `presentationIntent` block) are distinct op streams; the adapter's SiteSpec apply layer overlays presentation intent without touching the object graph. `PROVEN`

**No canonical owner-identity authority backs FYD owner mutation.** The core's `intent/` dir is the constitutional intent registry (why authorities exist), not business-owner intent. `gateway/approval_authority.js` governs code-patch approval (patch → replay → tests → witness → approval → commit), not business-owner actions. The FYD owner mutation path remains demo-only per C4; the core supplies no owner identity/capability implementation for it. `PROVEN`

---

## 5. Defects vs records

**Proven defects (mechanism verified in code):**
- **D1. Claim release destroys the complete VerificationProof from persisted current state.** `src/fyd/claim/machine.ts:159-168` (`release()` sets `verification: null`) + `src/fyd/claim/store.ts:68-77` (`writeClaim` replaces the aggregate file). Only a summarized audit event remains. If `VerificationProof` is constitutional evidence, this violates "evidence is not corrected" in the adapter's claim lane. `PROVEN` (mechanism).
- **D2. Owner-store key split.** Slug-keyed vs object-ID-keyed owner logs for the same business (`view.ts:316` vs `by-id.ts:36`), with the GET route keying history to the raw param and the mutation route resolving slugs only. Owner intent can diverge across two logs. `PROVEN` (mechanism).
- **D3. Dual graph read authorities.** Disk projection (`ping-object-source.ts`) vs fixture + live gateway journal (`fyd-tenant-graph.ts`), consumed by different lanes (pages/ObjectView/build/customize vs Ask/media). `PROVEN` (mechanism).

**Latent hazard (not live):**
- **H1.** `gateway/eventstore_persistence.js:358` replace-on-conflict upsert in a dead `EventStorePersistence` class — correction mechanism with no consumers; hazard only if wired in. `PROVEN` (dead).

**Architectural records (not defects):**
- **R1.** Live `ping_events` journal is append-only with fail-closed collision rejection (§4.1.1). `PROVEN`
- **R2.** Owner event log append-only with deterministic event IDs; revert appends, never deletes. `PROVEN`
- **R3.** Source evidence is never mutated by owner operations; corrections overlay after digest verification; drift derived per read, never persisted. `PROVEN`
- **R4.** One canonical object envelope exists in the core after documented consolidation; the duplication concern is confined to the adapter's read paths. `PROVEN`
- **R5.** Refresh snapshots, media manifests, and preview manifests are separate overwrite stores with no unified causal history; full object-state reconstruction from one history is not established. `PROVEN`

**Blocked:** constitutional classification of `VerificationProof` and provenance records as evidence (needs the evidence definition); production-traffic impact of D2/D3; replay-certificate behavioral verification.

---

## 6. Top three risks

1. **The live journal's append-only guarantee does not cover the adapter's satellite evidence stores.** `ping_events` is correction-proof (§4.1.1), but refresh snapshots (`src/fyd/refresh/snapshot-store.ts:10-13`), media manifests (`src/fyd/media/ingest.ts`), preview manifests (`src/fyd/preview/capture.ts`), and resource-claim aggregates (`src/fyd/claim/store.ts:68`) overwrite prior records, and `release()` affirmatively deletes the persisted `VerificationProof` (`src/fyd/claim/machine.ts:164`). The constitutional "EVIDENCE IS NOT CORRECTED" property holds only at the core journal; the FYD adapter's evidence lanes reintroduce correction by design or by bug.

2. **Owner intent has no real authorization and a split key.** All owner mutations run as a seeded demo actor with structural demo disclosure (`owner-context.ts:93, :150-152`); real identity (`src/fyd/identity/`) is disconnected. The same business's owner intent can land in slug-keyed (`view.ts:316`) or object-ID-keyed (`by-id.ts:36`) logs. When real owner auth is connected, the key split must be resolved first or one owner's corrections will be invisible to another entry path.

3. **Two object read authorities can serve divergent truth.** The disk-projection path (`src/fyd/data/ping-object-source.ts`) and the fixture-plus-live-journal path (`src/fyd/data/fyd-tenant-graph.ts`) are consumed by different lanes; the overlay op vocabulary is implemented twice (Python `dump.py`, TypeScript `applyTenantOverlays`). A consumer-side disagreement (e.g. Ask vs rendered page) is structurally possible and untested.

---

## Appendix: supporting evidence locations

- Local mirror (line-citation source): `~/workspace/constitutional-sprint/repo-mirror/src`
- `~/workspace/constitutional-sprint/evidence/dump-apply-overlays.txt` — Python overlay engine
- `~/workspace/constitutional-sprint/evidence/dump-journal-selection.txt` — journal selection
- `~/workspace/constitutional-sprint/evidence/emit-overlay-head.txt` — emitter head
- `~/workspace/constitutional-sprint/evidence/owner-context.txt` — demo owner seam (full file)
- `~/workspace/constitutional-sprint/evidence/eventstore-persistence-tail.txt` — dead upsert class
- `~/workspace/constitutional-sprint/evidence/canonical-event-envelope-head.txt` + `-tail.txt` — canonical envelope authority
- `~/workspace/constitutional-sprint/evidence/canonical-object-envelope.txt` — one canonical object envelope

**Integrity note:** one remote command on 2026-09-24 accidentally contained pipes and failed in the Windows transport before execution; no repository mutation resulted. `ping-constitutional` verified at `a69bb68f` with clean status before and after. `/home/nolan/ping` was read only; no writes, no process interaction, no secret values recorded.
