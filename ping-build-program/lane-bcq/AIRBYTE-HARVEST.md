# AIRBYTE SYNC CONCEPTS — HARVEST (lane BCQ, worker: airbyte lane)

Date: 2026-09-23. Repo: `~/workspace/ping-build-program/harvest/airbyte` (sparse, read-only).
Clone: `a917b49745b1bc3052fad7614ca8c9d143cb6efd` (2026-09-23), 4.8 MB, 31 files.
Sources read: `docs/platform/understanding-airbyte/airbyte-protocol.md` (full, incl. v0.0.0–v0.19.0 changelog),
`resumability.md` (full), `LICENSE` (full), `jobs.md` + `high-level-view.md` (selective-stream mentions),
`beginners-guide-to-catalog.md` (scanned). The Python CDK no longer lives in the monorepo
(moved to `airbyte-python-cdk`, MIT, not cloned); `airbyte-cdk/python/` here contains only a README.

Prior art inside PING already harvested: `~/workspace/business-connectors/hidden_files/ecosystem-harvest.md`
M1/M9/M14 (Airbyte protocol lifecycle, delta watermarks, record coercion), `connector-contract.md`,
`connector-manifest-schema.md` v1.0 draft (already contains the four-verb lifecycle and an opaque `state`
field in `read`), lane M `SOURCE-REGISTRY-DESIGN.md` §4–§5 (checkpoint durability, corruption handling).

## PROBLEM

FYD connectors must pull provider data repeatedly (reviews, listings, posts) without
re-ingesting everything every time, survive crashes mid-sync, let the PRODUCT choose which
data to watch per business, and keep every connector replaceable. Airbyte is the mature
reference implementation of exactly this: per-stream cursors, opaque sync state, checkpoint
messages interleaved with records, selective stream configuration, and schema-resilient syncs.

## PING ALREADY HAS

- `connector-contract.md` §5: per-attempt terminal fetch states (NOT_STARTED/STARTED/SUCCEEDED/
  FAILED/OUTCOME_UNKNOWN); §6: governor with priority tiers, token buckets, kill switch.
- `connector-manifest-schema.md` v1.0 draft: `lifecycle` (spec/check/discover/read),
  `streams[]` (stream_id, sync_modes incl. `incremental`, `incremental_cursor`, json_schema,
  degradation), `read.request.state` (opaque per-stream sync state), `read.response.messages`
  with `kind: record|state_checkpoint|trace`. These are DECLARATIONS; no runtime implements them yet.
- `refresh/snapshot-store.ts` + `diff.ts` + `conflict.ts`: durable snapshots, temporal diff,
  conflict records (second-source merge), all tested.
- `tandem/emit-observation.py`: duplicate-emission guard via sha256 (idempotent ingestion).
- `fyd/social/attestation-gate.ts`: journal-first reads, never report success without journaled evidence.
- Lane M `SOURCE-REGISTRY-DESIGN.md` §4–§5: registry durability classes (A/B/C), checkpoint model
  (opaque value + registry framing + valueSha256 + eventSeqFloor), commit-first advance invariant,
  cursor-corruption quarantine protocol. Lane M owns the STORE; this lane owns the FORMAT CONTRACT.
- PING repo greps (read-only, 2026-09-23): zero hits for watermark/sync_state/last_synced/resume_token/
  delta_token anywhere in `src` or `packages`. No cursor/checkpoint store exists. No polling scheduler
  exists. No connection record exists. Confirmed gap, no duplication risk (DUP lane note).

## EXTERNAL CANDIDATES

1. Airbyte platform (ELv2): per-stream state, checkpoint-on-commit, selective streams, resumability.
2. Airbyte Python CDK (MIT, separate repo, not cloned): IncrementalMixin, lookback windows,
   per-stream state migration helpers. Mechanism reference only.
3. Microsoft Graph deltaLink (already harvested, M9): opaque provider-owned watermark; token
   invalidation is a typed FULL_RESYNC event, not an error.
4. RFC 9110 conditional requests (already harvested, M10): ETag/Last-Modified as cheap cursors.

## LICENSES

- `airbytehq/airbyte` repo: **Elastic License 2.0 (ELv2)**. Permits: use, copy, distribute,
  make available, prepare derivative works (royalty-free, worldwide). Forbids: (a) providing
  the software to third parties as a hosted/managed service where the service exposes a
  substantial set of the software's features; (b) circumventing license-key functionality;
  (c) removing/altering license or copyright notices. Patent grant with retaliation clause.
- `airbyte-python-cdk`: MIT (separate repo; not cloned, not vendored).
- What we take: CONCEPTS (protocol shape, state model, checkpoint discipline). Ideas and
  interface patterns are not copyrightable expression; no Airbyte code is copied, vendored,
  or linked. Zero ELv2 encumbrance on the design. The clone exists for reading only.

## TESTED

- Sparse clone verified: HEAD pinned above; protocol doc changelog read end to end (v0.0.0 through
  v0.19.0); State Types (STREAM/GLOBAL/LEGACY), State Principles 1–6, Socket-mode state
  coordination, Resumable Full Refresh / artificial cursors, schema-mismatch table read in full.
- Negative verification on PING repo (read-only): no existing cursor/checkpoint/state store,
  no stream-selection record, no incremental-sync runtime. The manifest draft declares the shape;
  nothing executes it.
- Did NOT run Airbyte's own test suite (Gradle/JVM platform; out of scope for a concepts harvest;
  the mechanism evidence is the protocol spec text, which is the contract Airbyte's own CDK enforces).
- Cross-checked against lane M's registry design: checkpoint model (§5.1) and commit-first advance
  (§5.2) are compatible with the state envelope proposed here; no contradictions found.

## WINNER

Airbyte's per-stream opaque state + commit-gated checkpointing + selective stream configuration,
adapted into PING's **portable incremental-state contract**: a standardized state envelope whose
framing is fixed (so the registry and any replacement connector can handle it) while the cursor
value stays provider-opaque. The single most portable idea: the platform never interprets state;
it only stores, checksums, orders, and gates advancement on committed evidence.

## ADOPT-ADAPT-REJECT

### SOURCE — ADAPT (already partially in manifest)
The four-verb actor (spec/check/discover/read) is the right machine-checkable contract. PING's
manifest already declares it mapped onto PING event vocabulary. Remaining work is runtime, not
shape: implement the verbs as pure functions behind the governor (lane CONN builds adapters;
BCQ owns the contract test kit). Do not re-derive a fifth verb; Airbyte's decade of iteration
says four is sufficient.

### DESTINATION — REJECT as an actor class; ADOPT the commit-before-advance invariant
Airbyte needs destinations because it moves rows into warehouses. FYD has exactly one
destination: the canonical evidence plane (journal), and it is append-only by constitution
(evidence is immutable; owner corrections layer on top). Airbyte destination sync modes map as:
`append` = the only legal ingestion mode; `overwrite`/`append_dedup` = projection rebuilds,
owned by lane O's dependency index, never ingestion. There is no provider-shaped truth in
canonical objects, ever. What we keep: Airbyte's core durability insight — a checkpoint may
advance only over records the destination has committed (protocol: "destination confirms all
records before the state message were committed"). Lane M §5.2 already encodes this; this lane
supplies the message format that makes it enforceable.

### CONNECTION — ADOPT (as operational record; lane M owns the store)
A connection = one connector manifest instance bound to one business + credential + configured
stream selection + cadence. Airbyte's CONNECTION is what makes per-business budgets, per-business
schedules, and selective streams addressable. PING has gradedLink (identity) and governor
dispatch (admission) but no connection record. BCQ defines the connection shape; lane M stores it.
Without this, selective streams have nothing to attach to.

### STREAM — ADOPT
Stream = the typed unit of sync: stream_id, JSON schema, supported sync modes, cursor declaration,
stream class (business-identity/reviews/web-presence/social-presence per manifest). Streams are
the product's vocabulary: review-triggered outreach subscribes to the reviews stream, identity
verification to the business-identity stream. The manifest already declares streams; adopt means
treat the stream (not the connector) as the unit of selection, scheduling, reset, and health.

### SCHEMA — ADAPT
Airbyte: `discover` advertises provider-observed schema; destination validates against the
configured catalog; schema mismatches never fail a sync (best effort: persist what matches,
ignore the rest). FYD adaptation is stricter because our destination is an evidence plane:
- DECLARED schema (connector-authored, versioned, in the manifest) is authoritative for normalization.
- `discover` returns the PROVIDER-OBSERVED schema; the adapter diffs declared vs observed.
- A diff emits a typed `SCHEMA_CHANGED` event (lane K taxonomy), never a silent normalization change.
- Records failing the declared schema are quarantined with envelope + raw payload (manifest already
  requires this); scalar mismatches go through coerce-then-quarantine (M14, already in manifest).
- One Airbyte rule we adopt verbatim: a schema mismatch never blocks replication of data that is
  present. Degrade per-stream, quarantine per-record, keep the sync alive.

### CHECKPOINT — ADOPT (operational, never canonical truth)
Checkpoint = durable progress marker: "the provider had given us everything before X."
Durability semantics, stated plainly:
- Checkpoints live in lane M's registry (operational metadata). They are Class C data:
  rebuildable by doing the work again.
- A checkpoint is not evidence, cannot be cited, never appears in a projection, and its loss
  changes what FYD believes by exactly nothing. Corruption costs a bounded re-fetch, never
  wrong business facts.
- Every checkpoint carries: cursor value (opaque, provider-shaped), sha256 of the value
  (corruption detector), connector id + version that wrote it, state schema version,
  journal event-seq floor (commit proof), committed timestamp, quarantine flag.
- Advancement rule (commit-first, from Airbyte via lane M §5.2): a checkpoint may only move
  forward over observations the journal has committed. Emission of a `state_checkpoint` message
  by a connector is a PROPOSAL; the registry commits it only after verifying the lease, the
  checksum, monotonicity, and the seq floor.
- Checkpoint frequency is a cost knob (Airbyte: emit when meaningful to resume; platform may
  discard overly frequent state). Default: per page of provider results or per N records,
  whichever is cheaper; never per record on high-volume streams.

### INCREMENTAL SYNC — ADOPT
Per-stream cursors with at-least-once delivery and idempotent ingestion:
- Cursor kinds (declared enum, value opaque): `updated_at`, `created_at`, `delta_token`
  (provider-owned watermark), `page_cursor` (artificial cursor for pagination), `etag`,
  `sequence_id`, `none` (stream is full-refresh-only).
- Cursor resolution order (from Airbyte): source-defined (connector knows best) >
  configured override (operator/product) > declared default. Illegal to have none of the three
  for an incremental stream; admission rejects it.
- At-least-once is the contract (Airbyte resumability doc). Duplicates are absorbed by
  content-derived event ids (phase0) and the emit-observation sha256 guard. The destination
  never assumes exactly-once.
- Full refresh is allowed only where no cursor exists, and then only with a bounded window
  and resumable artificial cursors (pagination). Unbounded full re-ingest is a budget defect.
- Lookback overlap: every incremental fetch re-reads a short trailing window (e.g. 24–72h for
  reviews) to catch late/out-of-order provider records; dedup makes the overlap free.

### DISCOVER — ADOPT
`discover` answers "what does this source HAVE for this business": available streams, their
schemas, their supported sync modes, deterministic ordering. Two FYD-specific uses beyond
Airbyte's: (1) it drives the selective-stream UX (the product can only offer what discovery
found); (2) discovery diffs over time detect new provider capabilities (e.g. a Page that
newly exposes reviews) and emit typed events. Discovery is cheap, read-only, and never
mutates state.

### STATE — ADOPT per-stream opaque state; REJECT GLOBAL and LEGACY
- STREAM type is the only acceptable shape: per-stream isolation gives per-stream reset,
  per-stream selection, and per-stream health. This is also what makes connectors replaceable:
  state is keyed (connection_id, stream_id), never (connection) alone.
- REJECT GLOBAL shared state: it exists for CDC WAL-style cursors; none of FYD's provider
  streams need cross-stream shared cursors. If a future provider forces it, it arrives as a
  new proposal, not a default.
- REJECT LEGACY untyped blobs: every state carries the versioned envelope (see the portable
  schema proposal). Unversioned state is a migration hazard we refuse to create.
- The portability rule (the point of this harvest): the envelope is STANDARD (fixed fields,
  declared cursor_kind enum, version); the cursor VALUE is opaque. A replacement connector
  for the same stream_id may adopt existing state iff it declares the same cursor_kind and
  a compatible state schema version; otherwise the host orders a bounded full re-derive
  (typed event, not an error). State never becomes a lock-in mechanism.

### SELECTIVE STREAMS — ADOPT as the headline product principle
Airbyte's ConfiguredAirbyteCatalog (user-selected streams from the discovered catalog) maps
directly onto the FYD product rule: DON'T INGEST EVERYTHING, INGEST WHAT THE PRODUCT NEEDS.
- Selection record per (connection, stream): enabled, sync_mode, cursor override,
  initial-sync policy, priority tier. Defaults ship per connector; the product/owner can change them.
- Controlled initial sync: the first sync for a stream is BOUNDED by policy, not by provider
  history. Policies: `windowed` (last N days, e.g. reviews 90d), `from_now` (no history, watch
  forward; right for webhooks), `full` (only where the stream is tiny and the product needs history).
  Initial sync is the most expensive sync a stream will ever do; it gets an explicit budget line.
- Product UX implication: the business profile shows "what FYD watches" as a stream list with
  plain-language labels ("Google reviews", "Facebook posts", "Website changes"), each toggleable,
  each with a freshness indicator. Selection changes are owner/operator actions, recorded as events.
- Anti-pattern this kills: the "connect everything, figure it out later" ingestion sprawl that
  burns quota, stores hostile payloads, and creates liability without product value.

## CODE WE DO NOT NEED TO WRITE

- The Airbyte CDK or platform (scheduler, orchestrator, socket-mode transport, worker pool).
- Destination connectors (warehouses, lakes); FYD's destination is the journal and already exists.
- Normalization/dbt-style transforms; PING's adapter normalization (contract §2) already owns this.
- A new database: checkpoint state lives in lane M's registry design; event durability lives in
  the journal (phase0). No new authority, no new store.
- OAuth/token lifecycle machinery beyond what M11 already specified (lane L owns custody).
- A schema registry service: declared schemas live in connector manifests (versioned documents).

## MINIMAL PING WRAPPER

All new surface is small and specified in the companion proposal
(`INCREMENTAL-STATE-SCHEMA-PROPOSAL.md`):
1. The versioned state envelope JSON Schema (fixed framing, opaque value, cursor_kind enum,
   migration metadata). Validated at admission and on every checkpoint commit.
2. The stream-selection record shape (per connection+stream: enabled, sync_mode, initial-sync
   policy, priority). Consumed by the scheduler; stored by lane M.
3. The commit-first advancement rule as a registry API precondition (lane M implements;
   this lane specifies the message contract).
4. Contract-test-kit cases (BCQ kit): checkpoint proposal/commit round-trip, corruption
   quarantine, version-skew migration, lying-source overlap absorption. Lane R owns fixtures.

Estimated hand-written surface: one JSON Schema (~120 lines), TS types generated from it,
and test-kit assertions. Everything else is composition of existing PING machinery.

## FAILURE TEST

Red-team of each adopted concept (detailed cases belong in lane R's connector lab as fixtures;
assertions belong in BCQ's contract test kit):

1. CURSOR CORRUPTION (registry blob bit-flipped, or provider rejects the cursor as invalid).
   How it fails: the next fetch would start from a wrong position, silently skipping provider
   history or re-ingesting from zero. Detection: valueSha256 mismatch on load; schema-invalid
   framing; provider `delta-token-invalid` rejection (manifest failureMode). Response (lane M
   §5.3, adopted here as contract): quarantine the checkpoint, refuse incremental sync on it,
   run a bounded full re-derive, re-anchor with a fresh provider-issued value, keep the
   quarantine event in the journal forever. Never invent a cursor; no API sets checkpoint values
   except commit-from-live-run. Blast radius: extra bytes and a recorded gap window. Truth impact: zero.
2. STATE SCHEMA DRIFT BETWEEN CONNECTOR VERSIONS (v1 wrote `{cursor: <ts>}`, v2 expects
   `{cursor: {ts, tz}}`, or a replacement connector uses a different cursor_kind).
   How it fails: silent misinterpretation (ts read as ms vs s; token parsed as timestamp) causes
   skipped records or infinite re-ingest. Detection: `state_schema_version` mismatch at admission;
   `cursor_kind` mismatch on adoption attempt. Response: declared migration functions run when
   available (connector declares `migrates_from: [versions]`); when no migration exists, the host
   orders a bounded full re-derive and emits a typed event. Monotonicity guard: the registry
   rejects any checkpoint that moves a comparable cursor backwards unless accompanied by a
   typed CURSOR_REGRESSION event with evidence. A human cannot hand-edit state.
3. LYING SOURCE (API returns inconsistent `updated_at`: future-dated records, out-of-order
   pages, records older than the watermark arriving late, or a cursor that silently resets).
   How it fails: watermark = max(updated_at) skips late records forever; a reset cursor causes
   unbounded re-ingest. Defenses, all adopted: (a) lookback overlap on every incremental fetch
   (re-read trailing window; dedup absorbs); (b) never advance the watermark on a single field
   alone — require (cursor, record_id) and treat cursor ties by id ordering; (c) regression
   detection: if the provider's max cursor moves backwards by more than the lookback window,
   quarantine the stream's checkpoint and alert (typed event), do not chase it; (d) future-dated
   records (> clock skew tolerance) are quarantined with evidence, not trusted; (e) provider
   data is observation-grade (INFERRED at best for third-party claims), so a lying source can
   waste budget but cannot plant canonical facts. The evidence plane's immutability is the
   backstop: even a confused sync cannot rewrite history.

## PRODUCT CAPABILITY UNLOCKED

- Review-triggered outreach becomes real: incremental review streams with resumable checkpoints
  mean "a new 2-star review appeared" is a durable, gap-recorded signal, not a polling accident.
- Controlled initial sync: onboarding a business costs a bounded, budgeted first sync (e.g. last
  90 days of reviews), not an unbounded history crawl. The owner sees exactly what FYD watches.
- Connector replaceability: swap the GBP adapter for a new implementation without losing sync
  position, as long as the cursor_kind contract holds. No vendor lock-in at the state layer.
- Per-stream health and reset: one sick stream (e.g. reviews leg 403s) degrades to UNKNOWN while
  the others keep syncing; an owner can reset a single stream without touching the rest.
- Cost honesty: selective streams + bounded initial sync + checkpointed resumes turn "ingestion"
  from an open-ended liability into a budgeted line item per business.

## BYTES-DEPENDENCY COST

- New dependencies: ZERO. No Airbyte code vendored, linked, or imported (ELv2 respected by
  design; concepts only).
- Research clone: 4.8 MB sparse checkout, read-only, disposable (deletable after this harvest;
  kept for audit trail).
- Hand-written surface: one JSON Schema + generated TS types + contract-test-kit assertions
  (est. < 15 KB). Consumes: lane M registry (checkpoints), phase0 journal (commit proof,
  content-derived event ids), lane K taxonomy (typed failure events), lane R fixtures.
