# Reader Lane 6: Local-first / collaborative state

**Lane:** 6 of 10, ecosystem harvest sweep
**Date:** 2026-09-30
**Mode:** READER ONLY. No installs, no dependencies added, no repo writes, no authorities created. This report is the only write.
**Domain question:** What constraints must we preserve TODAY so that future simultaneous owner/agent/offline SiteSpec editing stays possible, without any CRDT integration now?
**Lane answer:** No CRDT integration now. Preserve a short, enforceable SiteSpec hygiene checklist (below). The commodity (concurrent-edit convergence) is solved by external libraries we will NOT adopt yet; the only near-zero-cost move is keeping the spec shape CRDT-shaped.

---

## 1. Where I searched, and what I found

**Unreachable from this sandbox (recorded as required):**
- `/home/nolan/projects/ping` (canonical PING repo): no such path; `/home/nolan/` does not exist in this environment (I run as `hatch`).
- `/home/nolan/projects/ping-fyd-converged`: same, unreachable.
- `/home/nolan/projects`, `/home/nolan/workspace`: same, unreachable.

**Searched and found:**
- `~/workspace` (full tree scan for "sitespec" in code files): FYD SiteSpec implementation located at `~/workspace/fyd-build/src/fyd/sitespec/`; files `types.ts`, `schemas.ts`, `validator.ts`, `render-model.ts`, plus tests. This is the authoritative local FYD SiteSpec source.
- `~/workspace/your_files/crx-runtime-analysis/crx-runtime-file-by-file-analysis.md`: CRX runtime analysis (438 lines, from 2026-09-11 fresh clone). No local-first, CRDT, sync, Automerge, or Yjs content anywhere in it. CRX is a deterministic event-sourcing/replay kernel plus constitutional governance; it has no collaborative-editing convergence machinery to harvest.
- `~/workspace/fyd-grill/FYD_ECOSYSTEM_HARVEST.md` (2026-09-21): prior harvest row: Automerge `@automerge/automerge` 3.5.0 MIT, verdict USE-LIBRARY at the draft layer, never as the canonical event log; explicitly REJECTs automerge-repo and sync servers.
- `~/workspace/backlog-recon/reports/protocols-harvest.md`: register item 44 `reg-automerge-draft-reconcile` flags a CONTRADICTION between the ecosystem harvest (USE-LIBRARY at draft layer) and a 2026-09-22 lane (FYD has a no-CRDT rule; SitePatch seam is the only channel, structured patches only). Item 44 is held open pending Nolan's call on whether the no-CRDT rule is absolute or draft-layer-scoped. Item 44 remains unresolved as of this lane.

**Corrections to prior intelligence:** the task brief said "Automerge is at 3.4.1." Verified live against the npm registry on 2026-09-30: `@automerge/automerge` latest is **3.5.0**, published 2026-09-16, MIT. The 3.4.1 figure is stale. `yjs` latest is **13.6.33**, published 2026-09-23, MIT.

## 2. FYD SiteSpec: declarative or imperative?

**Verdict: declarative.** Verified by reading the source (`~/workspace/fyd-build/src/fyd/sitespec/types.ts`, `schemas.ts`, `validator.ts`):

- The file header states the law explicitly: "the spec is DATA, never generated JSX."
- `FYDSiteSpec` is a plain-data interface: `kind: "fyd.sitespec@1"`, `ownerObjectId`, `version`, `generator` (name/version/timestamp), `themeTokens` (structured strings/enums), `navigation` (label/slug pairs), `pages` (slug/title/navLabel/sections), and `provenance`. Every field is JSON-serializable.
- `FYDQuery` is a tagged union of plain-data shapes (`owner`, `related` with predicate/ids/limits, `all`, `reference` with `objectIds`, `static`). Queries declare HOW to fetch objects, never the objects. No closures, no render functions, no component code in the spec.
- `FYDSection` carries a component *registry name* (a string like "Hero"), not a component implementation. Rendering is a separate layer (`renderer.tsx` turns SiteSpec + ObjectGraph + ViewerContext into UI).
- `validateSiteSpec()` is pure and deterministic: structure checks (unique deterministic IDs, nav points at real pages) plus semantic checks (query schemas acceptable to the component). It operates on data only.
- **One hygiene smell found** (flagged in the checklist below): section IDs are defined as `pageSlug + ":" + component + ":" + index`. The validator even warns when an ID deviates from that index-derived form. Index-derived identity is position-dependent: inserting or reordering a section changes sibling IDs. For CRDT compatibility, identity must be stable under insert/move.

Bottom line: SiteSpec is a JSON-shaped document with deterministic derivation. It is natively compatible with both Automerge's JSON-like document model and Yjs's shared types. No format change is needed to keep the CRDT door open.

## 3. How the candidates represent state, resolve conflicts, sync, and what breaks

### Automerge 3.5.0 (verified: npm registry, MIT)

**State representation (primary source: automerge.github.io docs, content/docs/reference/documents/values.md and conflicts.md):** an Automerge document is a JSON-like CRDT. All JSON primitive datatypes are supported, plus JavaScript Date objects, plus special scalar types (Counter, ImmutableString for non-collaborative strings, byte arrays). Values live in maps (objects) and lists; lists support push/unshift/splice/index overwrite. No functions, no class instances: the document holds data, not code.

**Concurrent edits to the same field:** the one case Automerge cannot merge automatically is concurrent updates to the same property in the same object (or the same index in the same list). Resolution: one value is chosen as the "winner," chosen arbitrarily but deterministically, identical on all nodes. The losing values are NOT lost; they are relegated to a conflicts map retrievable via `Automerge.getConflicts(doc, key)` (op-id-keyed). Edits to different properties, or different objects, merge cleanly. Concurrent list inserts at the same position are preserved on all nodes in a single deterministic order.

**Sync protocol (primary source: automerge.github.io sync docs):** peers exchange rounds of sync messages via `generateSyncMessage(doc, syncState)` / `receiveSyncMessage(doc, syncState, msg)` until `generateSyncMessage` returns null (converged). Each message carries a lossily-compressed (Bloom filter) list of change hashes the sender already has plus the changes it believes the peer needs. Each node keeps one `SyncState` per peer per document; sync states can be persisted between sessions as an optimization and regenerate on problems. Transport-agnostic: WebSocket, WebRTC, TCP, any topology.

**Storage requirements:** the storage layer only needs to persist bytes. A document serializes to a compact binary form (`save`/`load`); saved chunks are concatenable in any order and still load as a coherent merged document. No server, no schema migration machinery, no log compaction required by the core.

**What breaks:** non-serializable values (functions, class instances, Symbols) cannot enter a document. Position-dependent identity is fragile: overwriting a list element *by index* while another peer inserts at that index creates the exact "same index" conflict case above. Relying on map key iteration order for meaning is fragile: maps converge on content, and concurrent key insertions order deterministically by op id, not by wall-clock insertion order. `undefined` is not a JSON value and has no meaning in the document; explicit `null` is.

### Yjs 13.6.33 (verified: npm registry, MIT)

**State representation (primary sources: yjs/yjs README on GitHub; architecture notes synthesizing yjs INTERNALS.md and docs.yjs.dev):** a `Y.Doc` is a container of named *shared types*: `Y.Map` (key-value), `Y.Array` (ordered list), `Y.Text` (collaborative text), `Y.XmlFragment`/`Y.XmlElement`/`Y.XmlText`. Map values may be plain JSON leaves (object, boolean, string, number, Uint8Array) or nested shared types. There is no native Date type; datetimes are stored as strings or numbers by convention.

**Concurrent edits to the same field:** `Y.Map` is last-writer-wins per key, deterministic (higher logical clock, tie-broken by client ID). One value replaces the other; the loser is silently dropped, there is no conflict-retention API like Automerge's `getConflicts`. `Y.Array` and `Y.Text` are YATA list CRDTs: concurrent insertions are never lost, deterministically ordered by each item's immutable ID (client ID plus logical clock) relative to left/right origin neighbors; deletes are tombstones (permanent storage cost, required so late-arriving operations can still be ordered).

**Sync protocol:** updates are binary deltas; peers exchange state vectors (`Y.encodeStateVector`) to compute the minimal diff (`Y.encodeStateAsUpdate(doc, stateVector)`) and apply it (`Y.applyUpdate`). Updates are commutative and idempotent; any transport works. Multi-peer sync in practice goes through a *provider* (y-websocket, y-webrtc, Hocuspocus server); ephemeral presence (cursors) travels over a separate broadcast *awareness* protocol that is explicitly not persisted into the document.

**Storage requirements:** the persistence layer stores the update log (e.g., y-indexeddb persists updates and merges them; Postgres bytea is a documented pattern). The doc can be rebuilt by replaying updates. No central server is required by the core, but a provider is needed for live multi-peer sync.

**What breaks:** same as Automerge for non-serializable values (only JSON leaves, Uint8Array, or shared types may be stored). Additionally: silent LWW drops make Y.Map a worse fit for fields where two humans' concurrent edits both matter (copy edits, headings); position-dependent semantics are handled by the list CRDT but a reorder is delete-plus-insert (no native move), so a "move section" by two editors concurrently can interleave into surprising order; map key order carries no meaning.

### Fit with SiteSpec

A declarative JSON-shaped SiteSpec maps onto both libraries with zero structural change: maps for the spec/pages/sections/objects, lists for ordered sections and pages, scalar leaves for strings/enums/IDs. The two CRDT-relevant hazards in the CURRENT spec shape are both hygiene-fixable without any library: (a) index-derived section IDs (position-dependent identity), and (b) meaning carried by array position (reorder semantics under concurrency). Nothing else in the spec shape fights a CRDT.

---

## 4. Candidate evaluations (required shape)

### Candidate A: Automerge (core library, @automerge/automerge)

PRODUCT NEED → future simultaneous owner/agent/offline editing of SiteSpec drafts (e.g., owner edits copy in a UI while an agent regenerates sections offline, then converge without data loss).
FYD CURRENT IMPLEMENTATION → no-CRDT rule (2026-09-22 lane); the SitePatch seam is the only edit channel, structured patches only; SiteSpec itself is declarative plain JSON with deterministic IDs and a pure validator (verified in source, `~/workspace/fyd-build/src/fyd/sitespec/`).
PING EXISTING IMPLEMENTATION → none. PING's canonical substrate is an append-only event log with replay and witness semantics; CRDT convergence is not a PING capability and must not become one (event log preserves history; CRDT converges state; different problems).
CRX HARVESTABLE IMPLEMENTATION → none. CRX is a deterministic event-sourcing kernel plus constitutional governance; the file-by-file analysis contains no collaborative-editing, sync, or convergence machinery. CRX does not solve this commodity.
EXTERNAL IMPLEMENTATION → `@automerge/automerge` 3.5.0, MIT, verified on npm registry 2026-09-30 (published 2026-09-16). JSON-like CRDT document; same-field conflicts resolve to a deterministic winner with losers retained via `getConflicts`; transport-agnostic delta sync via per-peer SyncState plus Bloom-filter change sets; binary save/load storage.
REACHED/UNREACHED → REACHED (npm registry + primary docs at automerge.github.io verified; version corrected from stale 3.4.1 to 3.5.0).
DUPLICATION RISK → HIGH if we ever hand-roll a SiteSpec draft-merge layer (three-way merge, custom conflict retention, change-log compaction). All of that is commodity inside this library.
SECURITY/TRUST BOUNDARY → CRDT converges data, it does not establish trust. Actor IDs are unauthenticated random hex; accepting peer changes is not authorization. A merged spec must still pass the SiteSpec validator and the owner-approval seam before it becomes canonical; CRDT state must never write directly to the PING event log or bypass capability checks. Unbounded peer updates can bloat history (op bombs); any future sync endpoint needs size/rate caps.
SMALLEST DELTA → zero code today. The SiteSpec hygiene checklist (section 6) is the entire delta; it is conventions plus, at most, a future validator rule. No dependency, no WASM bundle, no sync plumbing now.
ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE → **REFERENCE**. Keep as the primary future option for draft-layer convergence: its data model matches SiteSpec exactly and its conflict retention (losers readable via getConflicts) is semantically safer than silent last-writer-wins for spec fields where two editors' copy both matters.

### Candidate B: Yjs (core library, yjs)

PRODUCT NEED → same as Candidate A.
FYD CURRENT IMPLEMENTATION → same as Candidate A.
PING EXISTING IMPLEMENTATION → same as Candidate A (no Yjs, no CRDT capability in PING).
CRX HARVESTABLE IMPLEMENTATION → same as Candidate A (none; CRX solves replay determinism, not collaborative convergence).
EXTERNAL IMPLEMENTATION → `yjs` 13.6.33, MIT, verified on npm registry 2026-09-30 (published 2026-09-23). Doc of named shared types (Y.Map/Y.Array/Y.Text/Y.Xml*); Y.Map is deterministic last-writer-wins per key (losers dropped silently); Y.Array/Y.Text are YATA list CRDTs with tombstoned deletes; delta sync via state vectors and binary updates; live sync needs a provider (y-websocket/y-webrtc/Hocuspocus), awareness protocol for ephemeral presence kept out of the persisted doc.
REACHED/UNREACHED → REACHED (npm registry + yjs/yjs README + architecture notes synthesizing INTERNALS.md and docs.yjs.dev).
DUPLICATION RISK → HIGH, same as Automerge, for any hand-rolled OT/merge/update-log machinery.
SECURITY/TRUST BOUNDARY → same class as Automerge: client IDs are unauthenticated; merged state is not authorized state; validator plus approval seam stays the gate; update-log persistence means a malicious peer's history persists unless capped/pruned; awareness data must never leak into canonical records.
SMALLEST DELTA → zero code today; same hygiene checklist.
ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE → **REFERENCE**. Keep as the secondary future option: the most battle-proven collaborative-editing primitive in the ecosystem (broad provider/binding ecosystem), but its Y.Map last-writer-wins semantics silently drop a loser's edit, which is the wrong default for SiteSpec fields like headings and copy where both versions matter; it also pulls in the provider/transport layer the moment live sync is wanted.

### Candidate C: "Adopt a CRDT now" (integrate Automerge or Yjs into FYD today)

PRODUCT NEED → none that exists today; the need is a future possibility (simultaneous owner/agent/offline editing), not a reached product arrow.
FYD CURRENT IMPLEMENTATION → the no-CRDT rule plus the SitePatch seam is the standing channel; adding a CRDT write path now would create a second, competing edit channel.
PING EXISTING IMPLEMENTATION → no CRDT capability exists to reuse; integration would be a new subsystem, not reuse.
CRX HARVESTABLE IMPLEMENTATION → none.
EXTERNAL IMPLEMENTATION → the libraries are real and reachable (Candidates A/B), which makes this impulse tempting and therefore worth an explicit verdict.
REACHED/UNREACHED → REACHED as a decision candidate (the libraries exist); the workload it would serve is UNREACHED (no concurrent-editing product flow exists).
DUPLICATION RISK → adopting now creates the opposite problem: a second edit channel duplicating the SitePatch seam's job, plus sync plumbing (transports, providers, storage adapters) duplicating nothing we need.
SECURITY/TRUST BOUNDARY → a live sync endpoint is a new trust surface (unauthenticated actor IDs, op-bomb history growth) with no product need to justify hardening it.
SMALLEST DELTA → do not adopt. The near-zero-cost move is the hygiene checklist.
ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE → **REJECT**. Reason: no simultaneous-editing workload exists today; the SitePatch seam is the only sanctioned edit channel; sync infrastructure is a new subsystem the converge program forbids; a WASM/bundle dependency with zero reached product arrow is the definition of premature. Revisit only when a real concurrent owner/agent/offline flow is specified, and then behind a narrow interface, draft layer only, never the canonical event log.

### Candidate D: Automerge-repo and hosted sync infrastructure (sync servers, network/storage adapters)

PRODUCT NEED → none today; live multi-peer sync is not on the product map.
FYD CURRENT IMPLEMENTATION → same no-CRDT rule as above.
PING EXISTING IMPLEMENTATION → none.
CRX HARVESTABLE IMPLEMENTATION → none.
EXTERNAL IMPLEMENTATION → `@automerge/automerge-repo` plus network/storage adapter packages; Hocuspocus/y-websocket for Yjs. Real, maintained, and previously evaluated.
REACHED/UNREACHED → REACHED as artifacts; UNREACHED as needs.
DUPLICATION RISK → low (we would not duplicate them, we would just not need them).
SECURITY/TRUST BOUNDARY → running sync infrastructure we do not need expands the trust surface for zero benefit.
SMALLEST DELTA → none.
ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE → **REJECT**. Reason: whole sync-server infrastructure around a core we are not using. Consistent with the 2026-09-21 ecosystem harvest's own rejection of automerge-repo and sync servers.

---

## 5. What code can we delete or never write

Nothing exists to delete (no CRDT code is in the tree today). What we must NEVER write, because the ecosystem already solved the commodity part:

1. A custom merge/diff layer for SiteSpec drafts (operational transform, three-way merge, hand-rolled conflict resolution). Automerge and Yjs both solve deterministic convergence of concurrent structured edits.
2. Custom conflict-retention bookkeeping (keeping losing edits for review). Automerge's change graph and `getConflicts` are the commodity.
3. Custom delta-sync protocols (change-set exchange, Bloom filters, state vectors). Both libraries ship them; both are transport-agnostic.
4. Custom offline queues with manual conflict reconciliation for drafts. Offline-first operation with later convergence is the core CRDT promise.
5. Custom update-log compaction for draft history. Automerge saves are concatenable and compactable; Yjs supports update merging.
6. A second edit channel. The SitePatch seam stays the only channel; any future CRDT lives strictly at the draft layer and converges *into* a patch, never around the seam.

The durable harvest result: if simultaneous owner/agent/offline editing ever becomes a real product flow, we WRAP one library behind a narrow "converge drafts, then emit a structured patch" interface. We never build the convergence machinery ourselves.

## 6. SiteSpec hygiene checklist (keeps the CRDT door open at near-zero cost)

Rules for anyone who touches the SiteSpec shape. Each rule names the CRDT property it protects.

1. **Plain data only.** Every field must be JSON-serializable: strings, numbers, booleans, null, arrays, plain objects. No functions, no class instances, no Symbols, no closures in the spec. (Protects: both libraries accept only JSON-like values; non-serializable values cannot enter a CRDT document.)
2. **No embedded behavior.** Component references stay registry-name strings; queries stay data unions; nothing in the spec executes. Already true; keep it true. (Protects: CRDTs converge state, not code.)
3. **Stable IDs, never position-derived identity.** IDs must survive insert, delete, and reorder of siblings. The current `pageSlug:component:index` scheme embeds array position; treat it as a compiler-derivation convenience, and plan for creation-time stable IDs (deterministic content-derived or UUID-style) that do not change when a neighbor moves. (Protects: CRDT lists preserve element identity across concurrent reorders; index-derived IDs break that.)
4. **Never encode meaning in array index.** Order lives in the array; identity lives in element IDs; semantics live in fields. A section's meaning must not depend on being "the 3rd element." (Protects: concurrent reorders interleave deterministically but arbitrarily; index-based semantics are the first casualty.)
5. **Never encode meaning in map key order.** JSON object key order is not semantic; CRDT maps converge on content. (Protects: iteration order under concurrent key insertion is deterministic but not insertion-ordered.)
6. **Prefer explicit null over undefined.** `undefined` has no JSON or CRDT meaning; use explicit `null` for "intentionally empty." (Protects: clean round-trip through both libraries and plain JSON.)
7. **Datetimes as ISO-8601 strings.** Never Date objects in the spec payload (Yjs has no native Date type; Automerge's timestamp type does not round-trip through plain JSON). The existing `generatedAt` string field is the pattern to follow.
8. **Version the format.** Keep the `kind: "fyd.sitespec@N"` marker and the evolution law already in `schemas.ts` (new fields optional; never change a field type; never remove a field; breaking changes mint a new version). (Protects: future draft-layer migration without flag days.)
9. **One document per site, drafts separated from published.** If the CRDT door is ever opened, each site gets one document and draft state is a separate document or branch from the published spec; the published spec remains validator-gated and approval-gated. (Protects: the canonical pipeline from unreviewed convergence output.)
10. **Conflict visibility by design.** Fields where two humans' edits both matter (headings, copy, presentation overrides) must be shaped so a future CRDT layer can surface both versions for review, not silently pick one. This is a modeling preference today (granular fields, not one big string blob) and a hard requirement later. (Protects: Yjs-style silent last-writer-wins is unacceptable for copy; Automerge-style conflict retention is the target semantics.)

Enforcement note: rules 1, 2, 5, 6, 7 are checkable in the existing `validateSiteSpec` today at near-zero cost. Rules 3 and 4 require the ID-scheme decision (the known smell) and should be recorded as a follow-up, not implemented in this lane.

---

## 7. Final classifications

- **Automerge (@automerge/automerge 3.5.0, MIT) → REFERENCE.** Its JSON-like document model matches SiteSpec exactly and its conflict retention (losers readable via getConflicts) is the right semantics for spec fields where both editors' versions matter; no integration now because no concurrent-editing workload exists and the no-CRDT rule plus SitePatch seam stands.
- **Yjs (yjs 13.6.33, MIT) → REFERENCE.** The most proven collaborative-editing primitive in the ecosystem, but Y.Map last-writer-wins silently drops losers and live sync drags in provider/transport infrastructure; same non-adoption rationale as Automerge.
- **"Adopt a CRDT now" → REJECT.** No simultaneous-editing workload exists; the SitePatch seam is the only sanctioned edit channel; sync infrastructure is a new subsystem the converge program forbids; a dependency with zero reached product arrow is premature.
- **Automerge-repo / sync servers / hosted sync infrastructure → REJECT.** Whole sync infrastructure around a core we do not use; consistent with the 2026-09-21 harvest's own rejection.

**Corrections to standing intelligence recorded in this lane:** Automerge latest is 3.5.0 (published 2026-09-16), not 3.4.1; Yjs latest is 13.6.33 (published 2026-09-23); both MIT. Register item 44 (`reg-automerge-draft-reconcile`, the no-CRDT-rule vs draft-layer-Automerge contradiction) remains open pending Nolan's scoping call; this lane recommends the standing guidance be recorded as "no CRDT integration now, declarative-SiteSpec compatibility preserved via the hygiene checklist," which is compatible with either scoping of item 44.
