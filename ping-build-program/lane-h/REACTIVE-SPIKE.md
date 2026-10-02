# LANE H  -  REACTIVE-SPIKE: ElectricSQL / PGlite research + SyncPort spike

Date: 2026-09-23. Status: spike behind interface, NOTHING adopted, NOTHING in core.
Final verdicts (bottom of this doc): PGlite for lane R = REJECT, hot-path
ElectricSQL = REJECT, lane O harvest = mechanism confirmation only.

## 1. Research: current state (verified 2026-09-23, not assumed)

### ElectricSQL
- What it is: a read-path sync engine for Postgres (Elixir service). It tails
  the Postgres WAL via logical replication and re-serves subsets ("Shapes")
  to clients over plain HTTP (long-poll/SSE), keyed by a resumable offset.
  It is NOT a database, NOT a write path. Writes go through your own backend;
  Electric streams the committed rows back down.
- License: Apache-2.0. Repo: electric-sql/electric. GA 1.0 released March 2025.
  Client: @electric-sql/client (v1.5.23, 2026-07-02). Self-host = one Docker
  image; requires Postgres 14+ with wal_level=logical and a REPLICATION role.
- 2026 pivot (material): Electric's positioning moved to "the first agent
  platform built on sync" (blog 2026-04-29, "Introducing Electric Agents").
  The original product continues as "Postgres Sync" and is maintained, but the
  company's center of gravity is now Durable Streams: an MIT-licensed,
  append-only-log-over-HTTP protocol ("the data primitive for the agent loop",
  durable-streams/durable-streams) with idempotent producers
  (Producer-Id/Epoch/Seq, stale epoch fenced 403), opaque monotonic offsets,
  and stream forks. Client matrix: TS, Python, Go, Rust, Java, Swift, PHP,
  Ruby, Elixir, .NET.
- PGlite integration: @electric-sql/pglite-sync (0.6.9) streams shapes
  server-to-client into local PGlite tables (syncShapesToTables, transactional
  multi-shape). It is explicitly one-way and alpha: local writes are NOT
  replicated upstream and there is no conflict resolution (confirmed by
  multiple 2026 adopter specs, e.g. syncnapse 2026-07-05).
- Hard constraint for PING: PGlite can NEVER be an Electric source. PGlite
  runs Postgres in single-user mode with no walsender, so it serves no
  logical-replication slot. Confirmed by adopter gate 2026-06-16.

### PGlite
- What it is: real Postgres (17.5 in 0.4.x, 18.3 in 0.5.x) compiled to WASM,
  packaged as a TS library (~3MB gzipped, 26MB on disk with all builds).
  In-process, single backend, no postmaster: Emscripten cannot fork, so it
  runs Postgres single-user mode with a JS I/O pathway.
- License: Apache-2.0 (package.json of @electric-sql/pglite@0.5.8; upstream
  docs describe Apache-2.0/PostgreSQL dual). Latest npm: 0.5.8.
- Persistence: memory:// (default), file:// (Node), idb:// / opfs-ahp://
  (browser). OPFS/IndexedDB survive reload but the browser may EVICT under
  storage pressure unless the origin is persisted (navigator.storage.persist()).
- Live queries: @electric-sql/pglite/live extension gives reactive
  db.live.query(sql, params, callback). This is the reactive primitive a
  SyncPort subscribe() would build on.

### PGlite durability / transaction / protocol edge cases (upstream evidence)
1. Transaction fsync gap (electric-sql/pglite#1065, v0.5.4, open): with
   relaxedDurability:false, top-level query()/exec() await syncToFs() before
   resolving, but transaction() COMMITs while #inTransaction is still true and
   returns WITHOUT calling syncToFs(). An awaited transaction can resolve
   before its commit reaches the filesystem; a worker/tab/process kill in
   that window loses work the caller believed durable.
2. relaxedDurability flush lag: with relaxedDurability enabled, the IndexedDB
   flush can lag seconds behind query resolution; an immediate reload after
   INSERT reproducibly drops the row (adopter regression test, 2026-07-09).
   With relaxedDurability:false, queries resolve only after flush.
3. WAL corruption recovery: no WAL-durability/fsync/NODEFS crash-safety fix
   shipped in any release 0.3.16 to 0.5.2; upstream PR #994 ("recover data
   dirs with corrupt WAL") was closed 2026-05-25. Corrupt WAL = RuntimeError
   unreachable trap; adopters build their own snapshot+restore layers.
4. macOS WAL durability bug: WAL writes lost on macOS 26.3 without a manual
   pg_switch_wal() before db.close() (adopter fork patch, 2026).
5. Stale transaction handle writes leak (electric-sql/pglite#1049, v0.5.4):
   tx.sql on an ended transaction handle silently writes to the auto-commit
   connection instead of rejecting. A "rolled back" mutation can still commit.
6. Live unsubscribe tears down all listeners (electric-sql/pglite#1048):
   unsubscribe(callback) on a shared live query removes EVERY subscriber due
   to a shadowed arrow parameter. Our spike defends by giving each subscriber
   its own live query (conformance test 6 proves it).
7. Single-writer lock contention; 4GB WASM heap ceiling; ~210KB/page observed
   growth in one adopter (5k pages ~ 1GB, revisit threshold).
8. Graceful-shutdown races: SIGTERM killing the host before db.close() flushes
   loses the write tail on every deploy (adopter postmortem).

Bottom line of the red-team: PGlite is genuine Postgres semantics for SQL,
but its durability story is "you own the fsync boundary, the shutdown path,
and the corruption recovery." That is a heavy custody burden for anything
PING treats as truth.

## 2. SyncPort interface (the spike)

PING programs against SyncPort, never against a provider. File:
spike/sync-port.mjs.

- start() / stop(): lifecycle. stop() must flush before release.
- read(table): rows from the LOCAL cache only. Never hits the network.
- subscribe(table, onChange): returns unsubscribe. onChange receives
  { op: insert|update|delete, table, key, row }. One live query per
  subscriber (defends against #1048).
- propose(mutation): records { op, table, key, row|patch } as a proposal
  with status 'proposed'. MUST NOT change the cache. PING's write path
  decides; the provider only mirrors accepted writes.
- applyAccepted(proposal): mirror an accepted write into the cache inside a
  transaction + notify subscribers. The ONLY cache-write path for PING-origin
  mutations.
- durabilityProbe(): provider self-report { durable, detail }, verified by
  test, never trusted on claims.

Constitutional note: a SyncPort cache is a PROJECTION, never canonical truth.
Connector data is observation; the sync cache is a materialized observation.
Canonical objects, events, and identity stay in PING.

## 3. Implementations (four, not two)

1. StubSyncPort: in-memory Map + EventEmitter. Zero dependencies. The
   reference implementation and the test double.
2. PGliteSyncPort: @electric-sql/pglite@0.5.8, relaxedDurability:false, live
   extension. Proposals live in a sync_proposals table; business tables are
   (pk, data JSONB); applyAccepted runs in a real transaction.
3. ShapeSyncPort: applies ElectricSQL /v1/shape log entries
   { key, value, headers: { operation } } to a local cache. The HTTP/SSE
   ShapeStream transport is deliberately not run; the APPLY semantics are
   what SyncPort owns, and they are transport-independent.
4. LogicalSyncPort: applies pgoutput change messages
   { action: I|U|D, table, columns, key } exactly as pg_recvlogical
   --plugin=pgoutput decodes them. The replication WIRE is shimmed (no live
   Postgres in this sandbox); the DECODE-to-APPLY path is real.

## 4. Spike results (final: all four providers executed, 2026-09-23 ~21:30)

Conformance suite: spike/conformance.mjs, 9 assertions run IDENTICALLY
against every provider (subscribe insert/update/delete, read currency,
propose-does-not-write, applyAccepted mirrors + notifies, selective
unsubscribe, durability self-report, restart behavior, clean stop).

- stub: 8/8 PASS (restart test skipped, N/A by design)
- electric-shape: 8/8 PASS
- pg-logical: 8/8 PASS
- pglite: 9/9 PASS on file:// (run-pglite.mjs memory:// also 9/9). The
  earlier sandbox-memory block cleared on a quiet VM; the suite ran end to
  end. The prior session's code review did NOT catch two real adapter bugs
  that live execution did:
  1. Synchronous initial live-callback fire: the live extension fires the
     subscription callback synchronously inside live.query(), before the
     returned promise resolves. The old code stored the baseline on
     `liveSub._last`; on that first synchronous fire `liveSub` was still
     null, the deref threw, the empty catch swallowed it, `initialized`
     stayed false, and the FIRST real change after every subscribe was
     absorbed into the baseline and never emitted. Silent per-subscriber
     event loss. Fixed: closure-scoped baseline state (diffCb reads `last`,
     never the liveSub object).
  2. Map-entry iteration in the delete diff: `for (const k of last)` walks
     ENTRIES, not keys. Every update fire emitted a BOGUS delete
     (cur.has(entryArray) is always false) and real deletes carried
     malformed keys (the [key, row] tuple). Fixed: `for (const k of
     last.keys())`. Both bugs are now covered by conformance tests 2 and 6.

What the spike PROVES: the same PING-side consumer code runs unchanged
against an Electric shape-log applier, a raw pgoutput applier, an in-memory
stub, and real embedded Postgres. Swapping the sync provider is a
constructor-argument change, not a rewrite. PING stays the authority;
providers are projections.

### 4b. PGlite measurements (0.5.8, this sandbox, Node 24)

| measure | value |
|---|---|
| cold boot, fresh initdb (file://) | 10.9-12.2 s |
| warm boot, existing datadir (file://) | 0.6 s |
| boot from template-datadir copy | 0.9 s (template cp 146 ms, template size 39 MB) |
| process RSS after boot | 734 MB (WASM linear-memory floor ~128 MB is the binding constraint) |
| on-disk (node_modules/@electric-sql/pglite) | 26 MB; pglite.wasm 10.1 MB (~3 MB gzipped), initdb.wasm 395 KB |
| file:// insert throughput | 445 rows/s single (2.25 ms/row); ~1 ms/row inside one tx |
| API surface | PGlite.create, query, exec, transaction, live.query, close + extensions (live). Small, but every call crosses the WASM/JS boundary. |

Durability kill-test (own harness, 15 trials each; child does an AWAITED
write then process._exit with NO db.close(), parent reopens the datadir):
- awaited transaction() + hard exit: **2/15 rows LOST**. pglite#1065
  reproduced: transaction() resolves before syncToFs() runs.
- top-level query() + hard exit: **0/15 lost** (top-level writes await the
  flush per #1065).
- transaction() + one dummy top-level `SELECT 1` + hard exit: **0/15 lost**.
  VERIFIED workaround: a post-transaction top-level query forces syncToFs
  before the caller may claim durability. Any PGlite adoption must wrap
  every transaction this way; the wrapper is in the lane notes, not shipped.
- WASM-crash mid-transaction (beyond our harness, upstream evidence):
  PGlite is in-process; a WASM trap kills the host process. Unflushed
  Emscripten FS state is torn; corrupt WAL surfaces as a RuntimeError
  "unreachable" trap with NO upstream recovery shipped (PR #994 closed).
  Adopters own snapshot+restore. That custody burden stands.

### 4c. PING's durability story (SEARCH PING FIRST - what the spike must answer)

This sandbox has no /home/nolan/projects checkout, so the PING-side story is
sourced from phase0's read-only container forensics (ping-gateway +
ping-postgres, up 34h, inspected via docker exec, nothing written):
- Canonical event authority = UnifiedEventRuntime in the ping-gateway
  container. Persist = INSERT INTO ping_events ON CONFLICT (event_id) DO
  NOTHING, event_id = deterministic SHA-256 content hash. Dedup suppresses
  redelivery.
- So PING ALREADY HAS real Postgres as its durability story (ping-postgres
  container). What survives process death today: committed events in
  ping-postgres (container volume). What does NOT: in-process handler state,
  the IntegrationManager 5s-poll position, unflushed SQLite outbox rows
  (runtime/messaging/outbox.py callers still ambiguous per phase0).
- Consequence for this lane: PGlite is not filling a durability hole in
  PING's core; it would only ever be a leaf cache / test fixture. The
  question it must answer is the fixture/lab one (lane R), not "give PING
  a database" - PING already has one.

## 5. Evaluation

What breaks:
- Durability is the provider's weakest claim. PGlite: transaction fsync gap
  (#1065), flush lag under relaxedDurability, WAL-corruption trap with no
  upstream recovery, macOS WAL loss, shutdown races. None of these are fixed
  upstream as of 0.5.8. Any PGlite cache holding PING-important state needs
  our own snapshot/restore + shutdown discipline; that is real engineering,
  not free.
- Conflict resolution: Electric shapes are read-path only; the PGlite sync
  plugin does no write-back and no merge. Multi-writer (owner console +
  agent + desktop PING editing the same SiteSpec) needs a writer-arbitration
  layer we would have to build (single-writer invariant, LWW with causal
  metadata, or CRDT doc layer). Electric does not give us this.
- Schema sync: shapes are per-table with manual local DDL; there is no
  schema-migration channel. PING's schema evolution would need its own
  versioned migration feed.
- PGlite cannot be a sync SOURCE (no walsender). The topology is always
  hub-and-spoke: real Postgres (or Electric) is the hub, PGlite is a leaf
  cache. A "desktop PING with local PGlite as primary" cannot sync outward
  via Electric; outward sync would need our own write-back pipeline.

What it unlocks (if the criteria below are ever met):
- Instant FYD edits: local PGlite cache + live queries = sub-100ms reactive
  reads for the owner console with zero network.
- Offline owner console: PGlite in the browser (OPFS) keeps working offline;
  Electric shapes catch up on reconnect (read path).
- Reactive projections: SyncPort.subscribe drives projection invalidation
  (feeds lane O's dependency index) without polling.
- Collaborative SiteSpec editing: Durable Streams (MIT) is the more
  interesting 2026 primitive here than Shapes: offset-addressed append-only
  log with idempotent producers and forks maps cleanly onto a proposal/
  accept journal. Worth a separate spike if collaboration becomes real.

Dependency weight:
- @electric-sql/pglite: 26MB on disk, ~3MB gzipped WASM, Apache-2.0.
  Runtime cost is memory (128MB WASM linear memory minimum) more than bytes.
- Electric server: Elixir service, one container, Apache-2.0 self-hosted;
  needs wal_level=logical + REPLICATION role on our Postgres. Operational
  surface: replication slot lag monitoring, or the slot fills pg_wal.
- Licenses are clean (Apache-2.0 / MIT). No license kill criterion fires.

## 6. NON-ADOPTION criteria (binding until proven otherwise)

PING takes NO core dependency on ElectricSQL or PGlite until ALL of these
are true, with evidence in the lane dir:
1. Durability proof: a PGlite file-backed cache survives kill -9 mid-write
   and unclean shutdown in OUR harness, across 100 randomized trials, with
   zero silent loss; the #1065 transaction fsync gap is fixed upstream or
   worked around with a verified wrapper (test must fail on 0.5.8 today).
2. Protocol stability: #1048 (unsubscribe) and #1049 (stale tx handle writes)
   fixed upstream and covered by upstream tests; no open data-loss issues
   older than 90 days.
3. Maintenance health: Electric's Postgres Sync still receives feature work
   (not only the agent-platform pivot); PGlite leaves alpha with a
   durability contract in writing.
4. Write-back story: either Electric ships supported two-way sync with
   conflict semantics, or PING's own write-back pipeline (propose/accept +
   idempotent applier) is built and failure-tested first. No silent
   "local writes just appear upstream."
5. Schema evolution: a versioned migration channel for shape/table schemas
   exists and is tested, not hand-rolled per table.
6. Vendor-gate answers (Nolan's veto gate): PGlite removes commodity code
   (local cache + live queries we would otherwise hand-roll); it improves
   the URL-to-trusted-FYD loop (owner console latency); it is removable
   (SyncPort proves it); PING remains the authority (proposals only);
   it owns NO canonical data; if it disappears, PING rebuilds the cache
   from the source of truth; cost at 10/1k/100k FYDs is ~zero marginal
   (WASM is client-side; Electric self-host is one container).

Until then: SyncPort stays an interface, providers stay spikes, and any
production use goes through the veto gate.

## 7. Optionality analysis

The optionality test was executed, not asserted. The SAME conformance suite
passes against ShapeSyncPort (Electric shape-log entries) and
LogicalSyncPort (raw pgoutput messages): the apply path behind SyncPort does
not care whether changes arrived via Electric's HTTP shape protocol or via
plain Postgres logical replication. Concretely:

- Replace Electric with pg_recvlogical/pgoutput: YES. Write a walsender
  client that decodes pgoutput and calls applyLogicalBatch; the consumer,
  cache, subscription, and proposal code do not change. You lose Electric's
  resumable-offset HTTP fan-out and CDN cacheability; you keep full control
  and zero extra services.
- Replace PGlite with SQLite/OPFS-direct for the local cache: YES, behind
  the same interface (the stub proves the seam; a SQLite provider would be
  a fourth implementation of the same 9 assertions).
- Replace Electric shapes with Durable Streams for the agent journal: YES
  in principle (both are offset-addressed append-only logs); needs its own
  spike because producer fencing and forks change the applier.
- Rebuild the projection from evidence: YES, always. The cache is a
  projection of an ordered change log; PING's event plane remains the
  source of truth. If every provider vanished tomorrow, PING replays and
  rebuilds.

The interface holds. No provider became canonical. That was the whole point.

## 8. Verdicts: lane R, lane O, hot path (2026-09-23 ~21:30, with numbers)

### Should lane R adopt PGlite for deterministic DB fixtures? NO - REJECT.
- Lane R's lab is an HTTP-replay fixture system (ping.ingest.fixture@1:
  recorded responses, deterministic replay, failure injection at the
  transport layer), PROVEN tonight, zero dependencies BY STANDING DECISION
  ("The lab adopts no vendor: zero dependencies, own code"; vendor veto
  gate answered). No SQL-backed connector is under test in the lab.
- PGlite would add 26 MB on disk, ~128 MB WASM memory floor (the binding
  constraint - it OOM-killed 8 boot attempts on the shared 8 GB VM), and
  10.9-12.2 s cold boot per fresh datadir, to serve a need that does not
  exist. Kill criterion "PING already solves it" fires: the lab's
  determinism comes from recorded fixtures + virtual clock + seeded PRNG,
  not from a database.
- The durability edge cases make it actively wrong for fixtures-as-truth:
  an awaited transaction can resolve before its commit is flushed (2/15
  rows lost in our kill harness). Fixture setup/teardown that trusts an
  awaited tx is not deterministic under crash.
- WATCH, not adopt: if lane CONN ever tests a Postgres-backed source (a
  self-hosted app DB), PGlite becomes the right hermetic fixture DB, and
  this lane has already measured the viable pattern: initdb once (12.5 s),
  snapshot a 39 MB template datadir, cp per test (146 ms), boot in 0.9 s
  => ~1.05 s per hermetic, resettable, real-Postgres fixture DB, with the
  post-tx sync wrapper (0/15 loss proven) closing the fsync gap. Reopen on
  that demonstrated need, not before.

### Should anything in the hot path adopt ElectricSQL sync? NO - REJECT.
- Electric is a read-path sync engine: it needs Postgres with
  wal_level=logical + a replication slot + the Electric Elixir service in
  front. PING's canonical truth is the event plane (content-hashed event
  IDs, idempotent INSERT ... ON CONFLICT DO NOTHING into ping-postgres),
  not a Postgres WAL. Electric would add an entire sync tier (Elixir
  service, slot-lag monitoring or pg_wal fills) in front of a hot path
  (URL -> trusted FYD) that does not need row-level read sync to clients.
- The reactive-projection use case (owner console, instant FYD edits) is a
  P2 future, explicitly not the hot path. When it arrives, SyncPort proves
  the provider is a constructor-argument swap; the veto gate (section 6)
  still applies.

### Can ElectricSQL's sync semantics teach lane O anything? Mechanism harvest only - no adoption.
Verified against current protocol docs + the shape applier in our spike:
- Offset-addressed append-only log (immutable (handle, offset) chunks,
  snapshot at offset=-1 then incremental log, gap-free stitch):
  CONFIRMS lane O's "watermarked stream replay" + atomic pin+watermark
  (applyTickResults). Same mechanism family, independently derived.
- must_refetch (server tells clients to resync from scratch when the shape
  definition changes): CONFIRMS lane O's full-rebuild-on-definition-change
  path (rebuildIndex). Same mechanism family.
- THE NEGATIVE RESULT (the actual teaching): Electric tells you WHICH ROWS
  changed, in WAL order, with a resumable offset. Lane O's incremental
  refresh problem is WHICH DERIVED ARTIFACTS DEPEND ON those rows (the
  reverse dependency index over objects -> sections -> pages -> contexts).
  Row-level change delivery does not answer the dependency question; no
  adoption of Electric would move lane O's problem. Lane O's hand-rolled
  index (46/46 assertions, zero deps) stays. Nothing to import.
