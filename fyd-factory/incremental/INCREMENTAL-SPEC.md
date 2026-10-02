# FYD Incremental Compilation: Design Spec

Lane: LANE-INCREMENTAL, 500-SITE FACTORY STRESS PROGRAM
Date: 2026-09-23
Status: design + measured proof (see INCREMENTAL-PROOF.md)

## 0. Thesis

FYD is an entity compiler, not a rebuild-the-universe machine. A site is
compiled from a chain of stages:

SOURCE -> OBSERVATION -> NORMALIZED -> EVIDENCE -> OBJECT -> SECTION ->
PAGE -> SITESPEC -> RENDER_MODEL -> PROJECTION

Every stage is content-addressed. A change anywhere in the chain invalidates
exactly the downstream nodes that depend on it, by digest comparison. Nothing
is rebuilt because a timer fired or because a neighboring fact moved.

This is a compilation layer over existing authorities. It creates no new
event system (PING's event/evidence plane remains the recorder), no new
canonical store (the object graph remains the knowledge authority), and no
new verifier (the claim/verify lanes own claim integrity). It reads the
artifacts those authorities already emit (acquisition observations, object
attestations, planner DependencyManifests, semantic render models) and adds
two things: content-addressed node identities per stage, and a dependency
DAG with memoized invalidation.

## 1. Content-addressable acquisition: the digest scheme

### 1.1 The one digest construction (mandatory)

Every digest in this layer is:

```
digest(x) = SHA-256 hex over canonical JSON of x
```

where canonical JSON means: object keys sorted recursively, array order
preserved (array order is semantic: section order matters), and volatile
stamps stripped. The volatile strip set is exactly the one in
`src/fyd/builder/canonical.ts` (`stripVolatile`): `generatedAt`,
`dumpedAt`, `manifestGeneratedAt`, and any key ending in `At`
(`createdAt`, `updatedAt`, `derivedAt`, `fetchedAt` inside content blobs).

This is not a new invention. It is the production construction already in
the repo:

- `semanticDigestOf(spec)` in `src/fyd/builder/canonical.ts`: "sha256 hex
  over the canonical spec: the semantic identity."
- `canonicalizeModel` in `src/fyd/sitespec/render-model.ts`: canonical form
  of the semantic render model.
- Owner-layer survival digests in `src/fyd/builder/source-refresh.ts`
  (`ownerLayerDigestBefore/After`, sha256 over the canonical owner layer).

The incremental layer reuses these functions where they exist and applies
the identical algorithm at the stages that lack one. A Python port used in
proof was differentially verified byte-identical against the real
`canonicalizeSpec`/`semanticDigestOf` executed on the Pig via tsx
(see INCREMENTAL-PROOF.md, self-test vector).

### 1.2 Why >= 256 bits is a hard requirement (LANE-CLAIM H8)

LANE-CLAIM proved empirically (verdict FAIL, finding H8, evidence in
`~/workspace/fyd-factory/claim/CLAIM-VERDICT.md`) that a 32-bit digest is
not a semantic identity: digest `faebba73` was found in ~4.3 seconds of
searching to map two different fact sets (`555-61245` and `555-83635`).
The residual-risk note is explicit: "The H8 digest should not be used for
change detection, dedup, or as an integrity identity anywhere in the
pipeline."

Consequence, adopted as law in this spec:

- No digest under 256 bits is used for change detection, dedup, cache
  identity, or work identity anywhere in the incremental layer.
- SHA-256 (256-bit) over canonical JSON is the only permitted digest
  construction. Truncated or 32/64-bit digests are permitted only as
  non-authoritative display prefixes, never as keys.
- The proof suite carries a permanent adversarial digest-collision probe
  that reproduces the H8 attack class against 32-bit digests and asserts
  the 256-bit construction distinguishes the colliding pair
  (INCREMENTAL-PROOF.md, probe 3).

Birthday math for the factory scale this program targets: 500 sites at
~25 objects each is ~12,500 object digests. At 32 bits the expected
collision count is n^2 / 2^32, roughly 3.6 percent chance of at least one
collision per full-factory pass, before counting section, page, and
observation digests. At 256 bits the probability is negligible for any
plausible factory volume. The H8 finding makes this empirical, not
theoretical: collisions were found in seconds, not years.

### 1.3 Per-stage digests

Node identity is `stage:occurrenceId` (section 2). The digest of a node
covers its occurrence id, its stage tag, and its canonical content:

```
nodeDigest = SHA-256(canonical({_stage, _occ, content}))
```

Binding the occurrence id into the digest is what enforces the hard rule
in section 5: byte-identical twins hash differently because their
occurrence ids differ.

| Stage | Occurrence id | Content digested | Real pipeline anchor |
|---|---|---|---|
| SOURCE | `acq<seq>/src-<n>` | channel ref + sha256 of acquired bytes | `AcquisitionRequest`/`AcquiredObservation` in `src/fyd/acquisition/acquisition-adapter.ts` (URL in, typed observations out; egress policy L0-L4) |
| OBSERVATION | `acq<seq>/obs-<n>` | url, finalUrl, fetchedAt, statusCode, contentType, levelUsed, depth, title, meta/openGraph/jsonLd digests | `AcquiredObservation` type; occurrence id carries (url, fetchedAt, seq), never derived from bytes |
| NORMALIZED | `acq<seq>/norm-<n>` | normalized fact set for the channel, sorted | deterministic extraction output before interpretation (acquisition-adapter contract: L4 AI interpretation only after deterministic extraction is exhausted) |
| EVIDENCE | `acq<seq>/ev-<claimRef>` | claimRef + sorted attested fact set `(objectId.field=value)` | `ClaimEvidence` in `src/fyd/object/object-projection.ts`; `evidenceRef` on relationships; BindingVerifier atoms |
| OBJECT | `<objectId>` (e.g. `cw-biz-01`) | schema, visibility, title, fields, provenance | `verifyObjectGraph` attestation in `src/fyd/builder/object-builder.ts` (`OBJECT_BUILDER_VERSION`) |
| GRAPH | `<tenantId>` | sorted object digests + sorted relationship digests + builder/attestation versions | `ObjectGraph` in `src/fyd/sitespec/types.ts`; `source-refresh.ts` four-layer contract (SOURCE replaced wholesale, OWNER byte-stable by digest) |
| SECTION | `<pageSlug>:<component>:<index>` (planner bindingId form) | component, componentVersion, objectField binding form, objectIds in render order, bound object digests, copy/heading | `BindingManifest` in `src/fyd/builder/manifest.ts`; `resolveQueryObjects` in `src/fyd/builder/planner.ts` |
| PAGE | `<slug>` | slug + ordered (sectionId, sectionDigest) pairs | `FYDPage` in spec types; `SemanticPageModel` in render-model.ts |
| SITESPEC | `<siteId>` | full spec canonical form | `semanticDigestOf` in `canonical.ts` (the production semantic identity) |
| RENDER_MODEL | `<viewerClass or "public">` | pages -> sections -> {id, component, objectIds, copy} | `buildSemanticRenderModel` / `canonicalizeModel` in `src/fyd/sitespec/render-model.ts` (`RENDER_MODEL_VERSION`) |
| PROJECTION | `<viewerClass>` | viewerClass, renderModelDigest, visible object id set | `objectViewToProjection` in `src/fyd/object/object-projection.ts` |

GRAPH digest detail (new, defined here): the graph node binds the verified
object set, not the ingestion that produced it. Two ingestions that attest
the same object set produce the same graph digest, which is what lets
OBJECT and below be stable across re-ingestions while OBSERVATION and
above are per-ingestion occurrences.

Volatile exclusion: `fetchedAt`, `generatedAt`, `asOf`, and all `*At`
stamps are stripped from content digests per the canonical.ts law ("no
timestamps in semantic planning"). Time enters node identity only as part
of occurrence ids (OBSERVATION), never as a hidden digest input.

## 2. Dependency tracking: the compilation DAG

### 2.1 Nodes and edges

The DAG has one node per (stage, occurrence). Edges point parent ->
child, i.e. from a node's inputs to the node:

```
SOURCE -> OBSERVATION -> NORMALIZED -> EVIDENCE -> OBJECT
  -> SECTION -> PAGE -> SITESPEC -> RENDER_MODEL -> PROJECTION
```

Edge records are `(parentNodeId, childNodeId, edgeKind)` where edgeKind is
one of `ingested-by`, `normalized-from`, `attests`, `binds` (with the
BindingManifest `objectField` form: `owner`, `related:<role>:<predicates>`,
`static`, `slot:<slotId>`), `composes`, `renders`.

### 2.2 Built from the real manifest, not beside it

The planner already emits the OBJECT -> SECTION dependency records this
layer needs: `DependencyManifest` in `src/fyd/builder/manifest.ts`, with
`forwardWalk` (Explain: section -> its binding record) and `reverseWalk`
(change impact: object field or claim ref -> every binding that renders
it). The compilation DAG is constructed as follows, stage by stage, from
artifacts the pipeline already produces:

- OBSERVATION -> NORMALIZED -> EVIDENCE: from acquisition intake records
  (observation ids, claim refs). Evidence nodes key on claimRef, matching
  `reverseWalk(manifest, claimRef)` at the evidence level.
- EVIDENCE -> OBJECT: from object provenance refs
  (`provenance.ref` on each object; `evidenceRef` on relationships).
- OBJECT -> SECTION: from `manifest.bindings[].objectField`, resolved
  through the same query semantics as `resolveQueryObjects`
  (`owner` kind, `related` kind with predicates, `all` kind).
- SECTION -> PAGE -> SITESPEC: from the spec's page/section structure.
- SITESPEC -> RENDER_MODEL: from `buildSemanticRenderModel` output
  (pages -> sections -> objectIds, in render order).
- RENDER_MODEL -> PROJECTION: one projection node per viewer class,
  from `objectViewToProjection` visibility filtering.

The manifest travels with the spec today; the DAG is the manifest
generalized to the full chain and made content-addressed. No second
manifest system is introduced.

### 2.3 Invalidation algorithm (memoized, bottom-up)

```
onInputChange(changedLeafNodes):
  dirty = changedLeafNodes
  order = topological order of DAG (parents before children)
  for node in order:
    if node in dirty: recompute digest; continue
    if any parent digest != cached parent digest: mark dirty, recompute
    else: cache hit (reuse stored digest, skip recompute)
```

Cache key: `(nodeId, tuple(sorted(parentDigests)))`. A node rebuilds iff
its own content changed or any parent digest changed. Digest equality is
the only invalidation signal; there are no timers, no generation counters.

Two granularities, both reported:

- Dependency-level invalidation (SECTION/PAGE digests bind parent
  digests): conservative. A section rebuilds if any bound object changed,
  even if the section's rendered output would be identical.
- Output-level diff (RENDER_MODEL section entries): exact. Only sections
  whose rendered entry (id/component/objectIds/copy) changed need
  re-render. The scheduler may skip re-render of dependency-invalidated
  but output-identical sections; it must still re-verify their bindings.

Measured behavior on the fixture (INCREMENTAL-PROOF.md): a phone change
rebuilds 6 sections at dependency level but only 4 at output level
(hours/areas sections bind the changed object; their rendered copy does
not contain the phone).

### 2.3b Where the DAG lives (no new canonical store)

Digest records and the DAG are sidecar compilation state, keyed by
`(tenantId, stage, occurrenceId)`, stored alongside the artifacts they
describe (next to the spec, next to the render model), never in a new
database. The object graph stays the knowledge authority; PING's event
plane stays the recorder. If the sidecars are lost, the full DAG
rebuilds deterministically from the authorities. Sidecars are a cache,
not a store.

## 3. Deterministic work identity: the lease/join mechanism

### 3.1 Problem

At factory scale, the same acquisition (same URL, same policy, same
purpose) will be requested concurrently: by the scheduled re-ingestion
pass, by a review-triggered refresh, by an owner correction, and across
sites that cite the same source (two plumbers, one shared supplier page).
Naive handling performs the acquisition N times and, worse, can append N
duplicate canonical side effects (duplicate observations, duplicate
evidence records, duplicate journal lines).

### 3.2 Work identity

```
workId = SHA-256(canonical(acquisitionRequest))
```

The request is the `AcquisitionRequest` shape from
`src/fyd/acquisition/acquisition-adapter.ts`: url, allowedDomains,
purpose, allowDiscovery, pageBudget, maxDepth, plus the policy version.
Identical requests hash to identical workIds deterministically, on any
machine, in any process. Distinct requests (different URL, different
purpose) hash differently and never falsely join (proven: DISTINCT
scenario in INCREMENTAL-PROOF.md).

### 3.3 Lease/join protocol

State per workId (sidecar, same storage as section 2.3b):

```
leases/<workId>/
  lease.json    {owner, acquiredAt, expiresAt, fencing}
  result.json   {workId, fencing, payloadDigest, completedAt}
  side-effect-journal.txt   (the canonical side-effect record)
```

Protocol:

1. `request(workId)`: try atomic acquire (`mkdir`, POSIX-atomic).
   Winner writes `lease.json` atomically (tmp + rename; torn writes are
   the failure the proof caught and fixed, see INCREMENTAL-PROOF.md).
2. Winner performs the work exactly once, publishes `result.json`
   atomically (tmp + rename), then appends exactly one line to the
   side-effect journal carrying its fencing token.
3. Losers poll for `result.json` (bounded timeout), verify
   `payloadDigest`, and return the winner's result. They perform no work
   and append nothing.
4. Crash recovery: leases carry a TTL. If the holder dies, the next
   requester observes expiry, steals the lease with `fencing + 1`, and
   completes the work. Any late append from the dead holder carries the
   old fencing token and is rejected by the journal gate. Fencing makes
   "exactly one canonical side effect" hold even under holder death.
5. A result already published is returned immediately: repeated
   `request(workId)` calls are pure cache hits (idempotent join).

Invariants (all proven in INCREMENTAL-PROOF.md, lease scenarios):

- work_executions == 1 for N concurrent identical requests (measured:
  10 workers -> 1 worker, 9 joiners).
- side-effect journal lines == 1 per workId per fencing generation.
- Stale fencing appends are rejected (ghost holder test).
- All joiners observe the identical payloadDigest.

### 3.4 Scope boundary

The lease covers acquisition work (network fetch, observation typing).
It does not cover owner decisions or claim verification, which are never
deduped: two owner corrections are two occurrences even if their bytes
match (section 5).

## 4. Invalidation proof design (what was measured)

The proof harness (`proof/inc_proof.py`) builds the full 10-stage DAG
for the fixture `corpus/fixtures/clearwater-plumbing-demo.json` (25
objects, 24 relationships), changes exactly one fact
(`cw-biz-01.fields.phone`: `(970) 555-0142` -> `(970) 555-0143`) as a new
ingestion occurrence, and measures per-stage rebuild vs cache-hit counts,
with assertions on every invalidation boundary. Digest algorithm is the
byte-verified port of `canonical.ts`. Full measured evidence is in
INCREMENTAL-PROOF.md.

## 5. Hard rule: identity is occurrence-based, never byte-based

**Distinct real-world occurrences are never collapsed because their bytes
match.** This is the load-bearing rule of the whole layer, and the digest
scheme is built to enforce it rather than merely promise it:

- Every node digest binds its occurrence id (`_occ`) alongside content
  (section 1.3). Two nodes with identical content bytes but different
  occurrence ids hash differently, deterministically.
- OBSERVATION identity is `(url, fetchedAt, acquisitionSeq)`. Re-fetching
  the same URL and getting identical bytes creates a new observation
  node; it does not merge with the old one. History is append-only.
- OBJECT identity is the object id (`cw-biz-01`). Two objects with
  identical field bytes keep distinct digests because the id is part of
  the hashed input.
- EVIDENCE identity is `(acquisitionSeq, claimRef)`. The same claim ref
  observed in two ingestions yields two evidence nodes.
- The lease/join layer (section 3) dedupes *work*, never *occurrences*:
  ten workers requesting one acquisition produce one observation
  occurrence, not zero and not ten. Dedup applies to the doing, never to
  the being.
- Owner corrections are always new occurrences, even when the corrected
  value is byte-identical to a previous value (correction, retraction,
  re-assertion are distinct real-world events).

Violation detector (in the proof suite): the harness constructs
byte-identical twin observations and twin objects and asserts their node
ids and digests differ. During proof development this detector caught a
real harness bug: evidence occurrence ids truncated to 40 characters
collided for two distinct claim refs
(`website-ingestion:https://clearwater-plumbing.example.com/` vs
`.../contact/`), silently merging two evidence nodes. Occurrence ids must
be collision-free by construction (full ref or ref + digest suffix);
truncation is forbidden. The incident is recorded because it is exactly
the failure class the hard rule exists to prevent.

## 6. Scaling argument (500 sites)

- Per-site DAGs are independent; invalidation never crosses tenant
  boundaries. A phone change on site A touches zero nodes of site B.
- Work identity dedupes across sites: identical acquisition requests
  (shared supplier page, shared directory listing) resolve to one workId;
  one site does the fetch, others join. Occurrences stay per-site
  (each site records its own observation occurrence referencing the
  shared result digest).
- Steady-state re-ingestion cost is proportional to changed facts, not to
  site count: unchanged objects are digest cache hits at every downstream
  stage. The measured fixture ratio (29 rebuilt / 58 nodes for a
  single-fact change, with 24/25 objects untouched) is the shape of the
  curve; at 500 sites the absolute numbers scale with changed facts.
- Digest records are small (32 bytes per node) and sidecar-local; no
  central contention point.

## 7. Non-goals and boundaries

- Not a verifier: claim integrity stays with the claim/verify lanes.
  The layer tracks *what changed*, not *whether it is true*.
- Not an event system: PING's event/evidence plane remains the recorder.
  Stage nodes reference event/observation ids; they do not re-emit them.
- Not a canonical store: the object graph remains the knowledge
  authority. Sidecars are a rebuildable cache (section 2.3b).
- Not a renderer: render semantics stay versioned in `renderer.tsx`
  (`RENDERER_VERSION` pin in render-model.ts); the layer only records
  which rendered entries changed.
- 32-bit or otherwise sub-256-bit digests are banned as identities
  (section 1.2, LANE-CLAIM H8).
- Occurrence-id truncation is banned (section 5 incident).

## 8. Proof artifacts

- `proof/inc_proof.py`: stage DAG builder, phone-change invalidation
  measurement, hard-rule twin test, reverse-walk check, canonical.ts
  differential self-test.
- `proof/lease_proof.py`: 10-worker race, crash-recovery steal, stale
  fencing rejection, distinct-request non-join.
- `proof/collision_proof.py`: adversarial 32-bit collision probe vs the
  mandated 256-bit construction.
- `proof/invalidation-result.json`, `proof/baseline-digests.json`,
  `proof/collision-result.json`: measured outputs.
- `INCREMENTAL-PROOF.md`: the measured evidence, in full.
