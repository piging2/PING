# LANE N — DATA LINEAGE DESIGN

Version 1.0.0 — 2026-09-23. Status: design, uncommitted, converges on existing PING machinery.

## 0. Non-negotiables

1. **Lineage is a derived projection, never a second authority.** Identity comes from the Identity Authority, hashes from the Hash Authority, events from the Event Authority (canonical). Lineage records carry *references* to those, never re-mint them. There is exactly one provenance model per record kind: `ObjectProvenance` on objects, `ExtractedField` on observations, `LineageEdge` on transitions.
2. **Connector data is observation, never canonical truth.** The SOURCE end of the chain is always external bytes; the OBJECT end is always PING-resolved.
3. **A missing link is a first-class verdict.** Every query returns either a resolved link with a machine pointer, or a typed gap with a `needed` field saying exactly what would resolve it (harvested from the LANE-LIN tracer's missing semantics). Never synthesize lineage; never backfill silently.
4. **No secrets in lineage.** Acquisition records identify the connector (`connectorId`) and the grant scope, never tokens, never credentials (lane L boundary).
5. **Customer-owned lineage travels with customer data.** Evidence history is customer-owned per the data boundary (src/fyd/boundary/data-boundary.ts). Deleting a customer's data package deletes their evidence; lineage records reference evidence by content hash only, never embed customer bytes.

## 1. What PING already has (reuse, do not rebuild)

| Mechanism | Location | Lineage role |
|---|---|---|
| `traceClaim` 7-stage machine trace | `src/fyd/lineage/tracer.ts` (LANE-LIN spike, untracked) | The proof engine: SOURCE BYTES → OBSERVATION → EVIDENCE → OBJECT FIELD → SITESPEC BINDING → RENDERED CLAIM → ASK FYD ANSWER, resolved/missing + `needed` |
| `ObjectProvenance` | `src/lib/ping/types.ts:96` | kind ∈ {canonical-journal, website-derived, overlay-authored}, ref, updatedRefs?, derivedAt — on every object |
| `ExtractedField` | `src/fyd/proceduralize/proceduralizer.ts:103` | The observation record: name/value/sourceUrl/sourceType/observedAt/evidenceRef/confidence/factClass/visibility/claimKind/property/entityId/evidenceDetail/extractor |
| `evidenceRefForFact` | proceduralizer.ts:447 | Deterministic evidence id: `web:` + sha256(sourceType\|name\|JSON(value)\|entityId)[:12] |
| observation→evidence join | proceduralizer (entityId ↔ relationship evidenceRef suffix) | How an observation becomes a relationship's evidence |
| `WhyThis` component | `src/fyd/ui/why-this.tsx` | Customer query surface: claim → lineage steps, never invented |
| ask-composer bindings | `src/lib/ping/ask-composer.ts`, `src/fyd/ask/answer.ts` | `evidenceRefs` + `claimClassifications` bind every answer claim to evidence |
| projection meta | `ping/var/fyd-projections/<site>.json` meta | overlayEventIds, eventSequences, baseDigest, graphDigest — change attribution anchors |
| `planActions` | `src/lib/ping/action-planner.ts` | Deterministic action planning (the ACTION seam; records not yet written) |
| media provenance API | `GET /api/fyd/media` | Media evidence; lane P extends to content-hash addressing |

## 2. The lineage model

### 2.1 Node kinds (the chain)

```
SOURCE ──ACQUIRED──▶ ACQUISITION ──EXTRACTED──▶ OBSERVATION ──RESOLVED──▶ CLAIM
                                                                          │
                                                                          │ (evidenceRef join)
                                                                          ▼
ACTION ◀──EXECUTED── ANSWER ◀──COMPOSED── RENDERED-CLAIM ◀──RENDERED── SITE-SECTION
   ▲                     ▲                                              │
   │                     │ (claimClassifications)                        │ (resolveQuery binding)
   │                     └──────────────────────────────────────────────┘
   └── object/field via OBJECT-FIELD node
```

Full ordered chain for a website fact:

1. **SOURCE** — the external thing: a URL, a connector object (facebook page, atproto record), a git repo, a file. Identified by `sourceKey` (stable external key: normalized URL, connector-qualified id, git remote + path).
2. **ACQUISITION** — one fetch of a SOURCE at a time: bytes + contentDigest (sha256) + retrievedAt + method + connectorId + runId. Same URL fetched twice = two acquisitions (digests may differ — that is how rewrites are detected).
3. **OBSERVATION** — one extracted fact (`ExtractedField`): carries `acquisitionId`, `evidenceRef`, `factClass`, `observedAt`.
4. **CLAIM** — a resolved, PING-owned assertion about an object field, graded by factClass (DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE). The `resolve()` tier decision lives here, with the resolution event id.
5. **OBJECT-FIELD** — the claim materialized on `PingObject.<field>`; object's `provenance` answers where, `updatedRefs` answers what changed it.
6. **SITE-SECTION** — the SiteSpec section whose query bound the object (`resolveQuery`); pointer `FYDSiteSpec#<sectionId>`.
7. **RENDERED-CLAIM** — the string in SSR markup, verified by the binding verifier (`resolveBoundField`).
8. **ANSWER** — an Ask FYD answer; `claimClassifications[].evidenceRefIds` binds claims to evidence.
9. **ACTION** — an executed action (owner approved a patch, clicked call, followed up). Points back to the answer + claim bindings that prompted it. **This link does not exist yet — the design adds it.**

### 2.2 Every lineage question → exact field

| Question | Answered by | Field(s) |
|---|---|---|
| WHERE DID THIS COME FROM? | OBSERVATION.sourceUrl → ACQUISITION.connectorId → SOURCE.sourceKey | `sourceUrl`, `connectorId`, `sourceKey` |
| WHEN OBSERVED? | OBSERVATION | `observedAt` (ISO, source: observation record, never re-derived) |
| WHAT EXTERNAL OBJECT PRODUCED IT? | SOURCE | `sourceKey` + `externalObjectId` (connector-qualified: `facebook:page:<id>`, `atproto:did:...`, `git:<remote>#<path>`, `web:<url>`) |
| WHICH CONNECTOR? | ACQUISITION | `connectorId` (registry key owned by lane M; e.g. `web-fetch`, `facebook-graph`, `atproto-firehose`, `git-ingest`). No credentials, no tokens. |
| WHICH TENANT/NAMESPACE? | every node | `tenantId` + `namespace` (site id for FYD; tenant scoping from tenant config). Lineage queries are tenant-scoped: a query never crosses tenants. |
| WHAT RAW EVIDENCE SUPPORTS IT? | ACQUISITION | pinned raw bytes pointer + `sourceLocation` byte range on the observation |
| WHAT HASH IDENTIFIES THE EVIDENCE? | ACQUISITION / OBSERVATION | `contentDigest` (sha256 of raw bytes) on acquisition; `evidenceRef` (deterministic `web:<sha12>`) on observation; `graphDigest` on the composed projection |
| WHAT EVENT CAUSED THE NEXT STEP? | LineageEdge | `causedByEventId` on every edge (the canonical event id from the Event Authority; see §4) |

### 2.3 LineageEdge — the only new record kind

Transitions are append-only journal records. No edge is ever mutated; a correction is a new edge with `supersedes`.

```ts
interface LineageEdge {
  edgeId: string;            // from IdentityAuthority (never re-minted locally)
  tenantId: string;
  namespace: string;         // site id for FYD
  from: LineageNodeRef;      // { kind: NodeKind; id: string }
  to: LineageNodeRef;
  transition:                // typed, closed vocabulary
    | "ACQUIRED" | "EXTRACTED" | "RESOLVED" | "MATERIALIZED"
    | "BOUND" | "RENDERED" | "COMPOSED" | "CITED" | "EXECUTED"
    | "SUPERSEDED" | "CONTESTED" | "TOMBSTONED" | "REWRITTEN";
  causedByEventId: string;   // canonical event id (EventAuthority)
  at: string;                // ISO; copied from the causing event, not wall-clocked here
  detail: {                  // transition-specific, small, hash/pointer only
    contentDigest?: string;  // ACQUIRED: sha256 of bytes
    evidenceRef?: string;    // EXTRACTED: deterministic ref
    factClass?: string;      // RESOLVED
    resolutionPolicy?: string; // RESOLVED: "source-tier-wins" | "owner-override" | ...
    sectionId?: string;      // BOUND
    claimHash?: string;      // RENDERED/CITED: sha256 of the rendered claim string
    supersedes?: string;     // SUPERSEDED: edgeId it replaces
    note?: string;
  };
  gap?: {                    // present ONLY when the from-node is pre-lineage
    status: "LINEAGE_GAP";
    needed: string;          // exactly what would resolve it (tracer missing-semantics)
  };
}
```

Edges are **derivable and rebuildable**: given the journal (canonical events) plus persisted observations, the full edge set can be rebuilt deterministically. The materialized `LineageIndex` (§5) is a cache of that derivation, not truth.

### 2.4 Identity and hash reuse (phase0 contract)

- Node ids: SOURCE/ACQUISITION/OBSERVATION ids come from the systems that create them (extraction pipeline mints `entityId`; `evidenceRefForFact` is the deterministic observation identity). LineageEdge ids come from the Identity Authority. Lineage never invents an id scheme for something an authority already identifies.
- Hashes: all digests are sha256 via the Hash Authority's canonicalization (`canonicalize` in ask-composer is the precedent; the projection's `graphDigest` recompute in the tracer is the verification pattern).
- Events: `causedByEventId` must be a real canonical event id. If the transition happened before the event authority covered it (pre-lineage data), the edge carries `gap` instead of a forged event id. Forging is the one unforgivable sin here.

## 3. The ACTION link (new)

When an action executes (owner approves a `propose_update`, taps call, sends follow-up), the executor writes one `ActionRecord`:

```ts
interface ActionRecord {
  actionId: string;          // IdentityAuthority
  tenantId: string; namespace: string;
  kind: string;              // from planActions PlannedAction.kind
  plannedBy: string;         // planner version, e.g. "action-planner@1"
  executedAt: string;
  executedBy: string;        // viewer/owner id or "agent:<id>"
  triggeredBy: {
    answerId?: string;       // Ask FYD answer id, when the action came from an answer
    claimBindings: { objectId: string; field: string; evidenceRef: string }[];
    planId?: string;         // lane T plan id, when it exists
  };
  resultingEventId: string;  // the canonical event the action appended (e.g. owner patch event)
  status: "EXECUTED" | "FAILED" | "SUPERSEDED";
}
```

This closes the chain: ACTION → (EXECUTED edge) → ANSWER → (CITED) → CLAIM → … → SOURCE. Query: "what action did this answer cause?" walks `triggeredBy.answerId`. Query: "why did this object change?" walks OBJECT-FIELD ← MATERIALIZED ← CLAIM ← RESOLVED ← resultingEventId of the action.

## 4. Query surface

All queries are tenant-scoped pure functions over (LineageIndex, Graph, Journal). Signatures (TS in the prototype):

1. **`whyThis(objectId, field)` → ClaimLineage[]** — WHY THIS? Returns the chain nearest-first: field value → claim (factClass, resolution event) → observation (extractor, observedAt, sourceUrl, byte range) → acquisition (contentDigest, connectorId, retrievedAt) → source (externalObjectId). Each link: `{ stage, pointer, excerpt, status: "resolved" | "gap", needed? }`. Customer surface: feeds the existing `WhyThis` component props. Never invents a step.
2. **`whyDidThisChange(objectId, field, since?)` → FieldChange[]** — WHY DID THIS CHANGE? Walks MATERIALIZED/SUPERSEDED edges + journal overlay deltas for the field: `{ at, eventId, actor, oldValueHash, newValueHash, cause: "re-observation" | "owner-override" | "conflict-resolution" | "source-rewrite" | "tombstone", causedBy }`. Values referenced by hash; full old values only from journal events the caller is authorized to read.
3. **`whatBreaksIfSourceDisappears(sourceKey)` → BlastRadius** — WHAT BREAKS IF THIS SOURCE DISAPPEARS? Reverse walk: SOURCE → acquisitions → observations → claims → object-fields → sections (via bindings) → rendered claims → answers citing them. Returns `{ observations: n, objects: [...], sections: [...], answers: n, actions: n, staleOnDelete: [...] }`. This is the dependency answer; lane O shares this index for regeneration invalidation.
4. **`whatPageUsesThisObject(objectId)` → SectionBinding[]** — WHAT PAGE USES THIS OBJECT? Runs the real `resolveQuery` per section (same call the tracer uses): `{ page, sectionId, component, boundObjectIds, objectIndex }`. Computed live against the current graph, not cached, so it can never go stale.
5. **`whatEvidenceSupportsThisAnswer(answerId)` → EvidenceSet** — WHAT EVIDENCE SUPPORTS THIS ANSWER? answer → claimClassifications → evidenceRefIds → observations → acquisitions (contentDigest + byte ranges) → source URLs. Returns the exact bundle an auditor needs: every claim, its factClass, its observation, its bytes hash.

All five return typed gaps (`status: "gap"`, `needed`) wherever a pre-lineage hop has no record, per §0.3.

## 5. LineageIndex (derived, rebuildable)

A per-namespace materialized index, rebuilt deterministically from (journal + persisted observations + SiteSpec):

- `byEvidenceRef: evidenceRef → observationId`
- `byObjectField: objectId#field → claimId → edgeIds`
- `bySourceKey: sourceKey → acquisitionIds → observationIds`
- `bySection: sectionId → boundObjectIds` (recomputed via resolveQuery; never persisted as truth)
- `byAnswer: answerId → claimBindings`
- `edgeLog: edgeId → LineageEdge` (append-only)

The index carries its own `indexDigest` (sha256 over canonicalized edges) and `builtFrom: { journalSeqHigh, observationDigest }` so any consumer can verify what it was built from. If the index is lost, it is rebuilt, not mourned. It is never written by producers; only the index builder writes it.

## 6. Worked example — the full chain

Realistic FYD flow: Sunrise Plumbing (Grand Junction CO), phone number observation → Services section → Ask FYD answer → owner taps "Call".

**Records (synthetic, schema-true):**

```json
// SOURCE
{ "kind": "SOURCE", "id": "src:sunrise-plumbing-web",
  "sourceKey": "web:https://sunriseplumbinggj.com",
  "externalObjectId": "web:https://sunriseplumbinggj.com",
  "tenantId": "t-ping", "namespace": "site:sunrise-plumbing" }

// ACQUISITION (one fetch)
{ "kind": "ACQUISITION", "id": "acq:2026-09-23T06-00-web",
  "sourceId": "src:sunrise-plumbing-web", "connectorId": "web-fetch",
  "retrievedAt": "2026-09-23T12:00:04Z",
  "contentDigest": "sha256:9f2c…a1 (64 hex)",
  "method": "http-get", "bytes": 48210,
  "rawPointer": "/var/fyd/raw/site:sunrise-plumbing/9f2ca1….html",
  "runId": "run:acq-2026-09-23", "causedByEventId": "evt:acq-run-start:…" }

// OBSERVATION (one extracted fact)
{ "kind": "OBSERVATION", "name": "phone", "value": "(970) 555-0147",
  "sourceUrl": "https://sunriseplumbinggj.com",
  "sourceType": "html", "sourcePointer": "a[href^=tel:]",
  "sourceLocation": "bytes=12204-12221",
  "observedAt": "2026-09-23T12:00:11Z",
  "extractor": "html-detector@2.3.0",
  "factClass": "DIRECT_FACT", "claimKind": "website_statement",
  "visibility": "public",
  "entityId": "ent:sp-phone-01",
  "evidenceRef": "web:4bd91c77e2a0",
  "acquisitionId": "acq:2026-09-23T06-00-web" }

// CLAIM (resolution: single source, no contest)
{ "kind": "CLAIM", "id": "claim:sp-phone-01",
  "objectId": "obj:sunrise-plumbing", "field": "fields.phone",
  "value": "(970) 555-0147", "factClass": "DIRECT_FACT",
  "resolutionPolicy": "single-source", "contenders": 1,
  "resolvedByEventId": "evt:resolve:…", "at": "2026-09-23T12:00:12Z" }

// OBJECT-FIELD (materialized; object provenance answers WHERE)
{ "objectId": "obj:sunrise-plumbing",
  "provenance": { "kind": "website-derived",
                  "ref": "website-ingestion:https://sunriseplumbinggj.com",
                  "derivedAt": "2026-09-23T12:00:13Z" } }
// edge: MATERIALIZED claim:sp-phone-01 → obj:sunrise-plumbing#fields.phone, evt:materialize:…
```

SiteSpec generation binds `obj:sunrise-plumbing` into `home:contact` (ContactSection) via `resolveQuery`; SSR renders "(970) 555-0147" through `resolveBoundField`. Visitor asks "What is their phone number?"; `composeAskFyd` answers with `claimClassifications: [{ classification: "direct", evidenceRefIds: ["obj:sunrise-plumbing"] }]` and `evidenceRefs` pointing at the object; answer id `ans:q-8812`. Owner taps Call: `ActionRecord { kind: "open_website"… }` no — kind `call`, `triggeredBy: { answerId: "ans:q-8812", claimBindings: [{ objectId: "obj:sunrise-plumbing", field: "fields.phone", evidenceRef: "web:4bd91c77e2a0" }] }, resultingEventId: "evt:action:call:…" }`.

**The five queries on this chain:**

- `whyThis("obj:sunrise-plumbing", "fields.phone")` → 5 resolved links, ending at `web:https://sunriseplumbinggj.com`, digest `9f2c…a1`, bytes 12204-12221, observed 2026-09-23T12:00:11Z by html-detector@2.3.0.
- `whyDidThisChange(...)` → one MATERIALIZED edge at 12:00:13Z (initial). No changes yet.
- `whatBreaksIfSourceDisappears("web:https://sunriseplumbinggj.com")` → 14 observations, 3 objects, sections [home:contact, home:services], 2 answers citing, 1 action downstream.
- `whatPageUsesThisObject("obj:sunrise-plumbing")` → home:contact (ContactSection), home:services (ServicesSection, index 2 of 6 bound).
- `whatEvidenceSupportsThisAnswer("ans:q-8812")` → claim direct, evidenceRef web:4bd91c77e2a0, bytes digest 9f2c…a1.

## 7. Deletion / tombstone semantics

Upstream deletion is an observation like any other: a re-acquisition that finds the object gone (404, feed entry removed, connector object deleted) produces an acquisition with `httpStatus: 410`-style detail and an observation of absence. The lineage consequences:

1. **TOMBSTONED edge** `ACQUISITION → SOURCE` (transition TOMBSTONED, causedByEventId = the deletion-observation event). The SOURCE node is marked `liveness: "deleted"`, `deletedAt`, `deletedObservedAt`. The node is never removed.
2. **Downstream invalidation is marked, not cascaded-deleted.** Each downstream edge gets a derived `staleness: "source-deleted"` flag in the index (recomputed, not stored on the edge). Objects keep their last-known values with provenance intact — PING never rewrites history to pretend the source never existed.
3. **Claims from a deleted source drop one resolution tier** (DIRECT_FACT → treated as unattributed for future resolutions) but existing rendered claims stay until a human or a re-resolution changes them. Fail closed: a deleted source never silently upgrades anything.
4. **Customer data deletion (Nolan's law) is different from upstream deletion.** When a customer deletes their data package, their evidence bytes go with it (customer-owned). Lineage edges referencing that evidence keep the content hash (proof something existed) but the bytes pointer becomes `gap: { status: "LINEAGE_GAP", needed: "evidence bytes deleted with customer data package on <date>; hash <sha> retained" }`. Hashes are not customer data; bytes are.
5. **Resurrection:** if the source reappears, a new ACQUISITION with a new digest re-livens the SOURCE (`liveness: "active"`); the tombstone edge stays in history. `whyDidThisChange` shows deleted → restored.

## 8. Red-team

### R1. Conflicting observations from two sources about the same object
Setup: `web:https://sunriseplumbinggj.com` says phone `(970) 555-0147`; `facebook:page:48291` (connector `facebook-graph`) says `(970) 555-0199`. Both are DIRECT_FACT.

Verdict: **handled, with a gap to close.** The `resolve()` tier list orders source *types* (json-ld > html), not source *instances*. Two DIRECT_FACTs from two sources tie. The design adds what `resolve()` lacks: a persisted `CONTESTED` edge naming both observation ids, and resolution policy `multi-source-tiebreak`: (a) prefer the observation with the newer `observedAt` within a 30-day window, (b) else prefer the source the owner attested (owner-attested source list per namespace), (c) else mark the claim `INFERENCE`-class `contested` and surface both values in the answer with their sources. The loser is never dropped: it stays a CONTESTED edge, queryable by `whyThis` ("two sources disagreed; website won on recency, event evt:resolve:…"). Kill-test: a resolution that silently discards a contender is rejected — both values must remain retrievable.

### R2. A source rewrites history
Setup: the website changes its phone number from `(970) 555-0147` to `(970) 555-0100` with no notice. Re-acquisition digest differs (`9f2c…a1` → `77bd…e4`).

Verdict: **handled.** This is the normal path, not an exception: new ACQUISITION (new digest) → new OBSERVATION (new evidenceRef) → RESOLVED edge with `supersedes` pointing at the old resolution edge → MATERIALIZED edge updating the field. The old chain is untouched; `whyDidThisChange` shows `cause: "source-rewrite"` with both digests and the exact re-observation time. Malicious variant (source rewrites to damage the business, e.g. a defaced phone number): the factClass stays DIRECT_FACT (it *is* what the source says), but lane J's run records show the anomaly (digest changed with no owner action), and the owner-correction loop (`USER_OVERRIDE` via owner overlay, provenance `overlay-authored`) wins on next resolution with policy `owner-override`. Lineage records the override as SUPERSEDED with the owner's event id, never as a silent edit.

### R3. Lineage gaps from pre-lineage data
Setup: objects materialized before observation persistence existed (fixture-built graphs, early proceduralize runs). A `whyThis` hits an object whose provenance ref is `website-ingestion:<url>` but no observation record exists.

Verdict: **handled by honest gaps.** The edge carries `gap: { status: "LINEAGE_GAP", needed: "persisted observation for website-ingestion:<url> field <f>; re-run extraction on pinned bytes or accept the gap" }`. The query returns `status: "gap"` at exactly the hop that is missing, with resolved links on both sides. What is forbidden: backfilling a synthetic observation to make the chain look complete (that manufactures certainty), and blocking the whole query because one hop is missing (that converts a partial truth into no truth). Metrics: the index tracks `gapCount` per namespace so coverage improves visibly over time; the night-shift goal is driving gaps down by persisting observations for every new acquisition, never by rewriting old ones.

### R4. (bonus) Connector lies about identity
A connector returns object id `X` for two different businesses across runs (unstable external ids). Verdict: SOURCE identity in PING is the `sourceKey`, a PING-minted stable key per (connectorId, external id, first-seen binding), not the raw external id. If the external id's content digest diverges beyond a threshold from the binding-time digest, the acquisition is quarantined with a CONTESTED edge rather than merged. Connector data is observation; PING owns the binding.

## 9. Kill criteria and optionality test (per import)

Applies to any external lineage mechanism adopted into PING:

- **Kill if:** license incompatible with PING's (Apache 2.0 / MIT only); requires surrendering canonical identity/hash/event authority; stores customer bytes outside the customer data package; cannot preserve provenance end to end; cannot run inside PING's TS runtime without a sidecar service; weight (deps, LOC, runtime) dwarfs the lineage value; PING already solves it (the tracer + provenance + evidenceRef + journal).
- **Optionality test:** can we replace the lineage index implementation, add a new source type, rebuild the projection from journal + observations, and trace a result to evidence, without touching canonical truth? If any answer is no, the import made infrastructure canonical — reject or wrap behind the index-builder interface.

## 10. What this unlocks (product)

- "Why this?" on every rendered claim, answered from records, not prose.
- "Why did the site change?" — the owner console shows the exact event, actor, and source behind every field change.
- Blast-radius analysis before disconnecting a source or letting a domain lapse.
- Auditor-grade answer bundles: every Ask FYD answer carries its evidence chain to raw bytes.
- Conflict surfacing instead of silent resolution: contested claims show both sources.

## 11. Open questions for the coordinator (not Nolan — none are his call tonight)

1. Who owns the `src/fyd/lineage/` spike convergence — DUP lane or lane N? Recommendation: lane N writes the query functions against the spike's types; DUP classifies the spike as ADAPTER-to-canonical once committed.
2. `connectorId` registry: lane M owns operational metadata; confirm the registry key format (`<provider>-<surface>`, e.g. `facebook-graph`) before acquisition records start carrying it.
3. Event id format from phase0: `causedByEventId` must match the canonical shape; pending phase0's WHO-CREATES-EVENT-ID answer.
