# LANE H  -  HARVEST REPORT: ElectricSQL / PGlite

## PROBLEM
PING's future reactive surfaces (instant FYD edits, offline owner console,
desktop PING, local object cache, reactive projections, collaborative
SiteSpec editing) need a sync boundary: local reads that stay fresh without
polling, and local mutations that never corrupt canonical truth. The question
is whether ElectricSQL (reactive Postgres sync) and/or PGlite (embedded
Postgres) earn a place behind that boundary. Sub-questions from the program:
should lane R adopt PGlite for deterministic DB fixtures? Should the hot path
adopt ElectricSQL sync? Can Electric's sync semantics teach lane O anything?

## PING ALREADY HAS
- The constitutional event plane: source truth lives in events with identity,
  hash, and sequencing (phase0's verdict: UnifiedEventRuntime in the
  ping-gateway container, event_id = SHA-256 content hash, persist =
  INSERT INTO ping_events ON CONFLICT (event_id) DO NOTHING).
- Real Postgres as the durability story: ping-postgres container. Committed
  events survive process death; in-process handler state and the
  IntegrationManager poll position do not.
- The proposals-only discipline: nothing writes canonical state except the
  authorized write path. This lane's SyncPort encodes exactly that.
- No existing local-cache or reactive-subscription infrastructure to displace.
- Lane R already has a PROVEN zero-dep fixture lab (HTTP replay); lane O
  already has a PROVEN zero-dep dependency index (46/46 assertions).

## EXTERNAL CANDIDATES
- ElectricSQL "Postgres Sync": read-path sync engine, Shapes over HTTP/SSE,
  Apache-2.0, GA since Mar 2025. Company pivoted 2026 toward the Electric
  Agents platform; Sync still maintained.
- Electric Durable Streams: MIT append-only offset log over HTTP with
  idempotent producers and forks. The more interesting 2026 primitive for a
  proposal/accept journal; not spiked yet.
- PGlite 0.5.8: WASM Postgres (PG 18.3), Apache-2.0, live queries, file/idb/
  OPFS persistence. Alpha-grade durability story.
- @electric-sql/pglite-sync 0.6.9: one-way shape-to-PGlite streaming, alpha,
  no write-back, no conflict resolution.
- Considered and NOT needed: PowerSync (FSL license, write-back we do not
  want to outsource), Zero/Replicache (managed-service gravity).

## LICENSES
- ElectricSQL (electric-sql/electric): Apache-2.0. Clean.
- Durable Streams: MIT. Clean.
- @electric-sql/pglite: Apache-2.0 (package.json; upstream docs say
  Apache-2.0/PostgreSQL dual). Clean.
- No license kill criterion fires on any candidate.

## TESTED
- SyncPort interface + 4 providers (spike/): stub, PGlite, Electric
  shape-log applier, pgoutput logical-replication applier.
- One 9-assertion conformance suite run identically against all providers:
  stub 8/8, electric-shape 8/8, pg-logical 8/8, pglite 9/9 PASS (file://,
  executed 2026-09-23 ~21:30 on a quiet VM; the earlier memory block is
  closed). Live execution caught two real adapter bugs the prior code review
  missed: synchronous initial live-callback fire swallowing the first change
  per subscribe (silent event loss), and Map-entry iteration in the delete
  diff emitting bogus deletes + malformed keys.
- MEASURED (PGlite 0.5.8): cold boot 10.9-12.2s fresh initdb / 0.6s warm /
  0.9s from template-datadir copy; RSS 734MB process (128MB WASM floor);
  26MB on disk, 10.1MB pglite.wasm; file:// 445 rows/s single inserts,
  ~1ms/row in-tx.
- DURABILITY KILL-TEST (own harness, 15 trials, awaited write then
  process._exit with no db.close()): awaited transaction() + hard exit =
  2/15 rows LOST (pglite#1065 reproduced); top-level query() + hard exit =
  0/15; transaction() + dummy top-level SELECT 1 + hard exit = 0/15
  (verified workaround: post-tx sync forces syncToFs).
- Red-team from upstream evidence (not assumptions): PGlite #1065
  (transaction resolves before fsync), #1049 (stale tx handle silently
  writes), #1048 (unsubscribe kills all listeners; defended in our
  implementation), relaxedDurability flush lag (reproduced by adopter),
  WAL-corruption trap with no upstream recovery (#994 closed), macOS WAL
  loss, shutdown races.
- Falsified: "PGlite can be an Electric source" (no walsender, single-user
  mode). "Code review is sufficient for the live-query adapter" (two bugs
  survived review, died on execution).

## WINNER
The SyncPort INTERFACE is the winner, not a provider. No provider is
adopted. The interface proves all three sync transports (Electric shapes,
raw pgoutput, in-memory) are interchangeable behind it.

## ADOPT-ADAPT-REJECT
- REJECT (for now): any core dependency on ElectricSQL or PGlite. The
  non-adoption criteria in REACTIVE-SPIKE.md section 6 are binding.
- REJECT: lane R adopts PGlite for deterministic DB fixtures. Lane R's lab
  is HTTP-replay, zero-dep by standing decision, and has no SQL-backed
  connector under test. PGlite would add 26MB / 128MB WASM floor /
  10.9-12.2s cold boot for a nonexistent need, and its tx-fsync gap
  (2/15 rows lost after awaited commit + hard exit) makes awaited-tx
  fixture setup non-deterministic under crash. Kill criteria firing:
  "PING already solves it" (the lab) and "weight dwarfs value".
- REJECT: ElectricSQL sync in any hot path. Needs wal_level=logical +
  replication slot + an Elixir service in front of the URL->trusted-FYD
  loop, which needs no row-level read sync; PING's canonical truth is the
  event plane, not a PG WAL.
- ADAPT: the SyncPort contract (subscribe/read/propose/applyAccepted/
  durabilityProbe, proposals-only mutations) is a sound seam for PING's
  future reactive layer and can be reused when the criteria are met.
  ADAPT (mechanism only, zero code): Electric's offset-addressed
  append-only log confirms lane O's watermarked replay; must_refetch
  confirms lane O's full-resync-on-definition-change. The negative result
  stands: Electric answers which rows changed, not which derived artifacts
  depend on them; lane O's problem stays lane O's.
- WATCH: Durable Streams (MIT) for the agent/collaboration journal; PGlite
  upstream fixes for #1065/#1048/#1049; Electric's Postgres Sync maintenance
  post-pivot. NEW WATCH trigger: if lane CONN ever tests a Postgres-backed
  source, PGlite as hermetic fixture DB via the measured template-datadir
  pattern (~1.05s/test: 39MB template, 146ms cp, 0.9s boot) with the
  verified post-tx sync wrapper (0/15 loss). Reopen on demonstrated need.

## CODE WE DO NOT NEED TO WRITE
- A reactive query engine: PGlite's live extension already diffs result sets
  and pushes changes. Our subscribe() is a thin diff-to-event adapter.
- A shape-application protocol: Electric's /v1/shape log format maps 1:1
  onto insert/update/delete cache events; the applier is ~20 lines.
- A logical-decoding consumer shape: pgoutput messages map onto the same
  events; no new protocol design needed.

## MINIMAL PING WRAPPER
spike/sync-port.mjs IS the wrapper: ~350 lines defining the interface and
four providers. If PING ever adopts, the production wrapper is this file's
contract minus the test shims, with PING's event authority as the
proposal acceptor.

## FAILURE TEST
- Conformance test 4 (propose-does-not-write) is the constitutional failure
  test: a provider that lets proposals touch the cache fails closed.
- Conformance test 6 is the upstream-regression test: selective unsubscribe
  must keep other listeners alive (catches pglite#1048 class bugs).
- Kill harness (spike/_killtest pattern, rerunnable): awaited transaction()
  + hard exit loses 2/15 rows on PGlite 0.5.8 (fails on the non-adoption
  criterion until fixed upstream or the post-tx sync wrapper is proven in
  the adopting lane); the same harness passes 0/15 with the workaround.
  EXECUTED here, not documented-and-hoped.

## PRODUCT CAPABILITY UNLOCKED
None tonight, by design (P2 spike, no core dependency). Optionality proven:
when the non-adoption criteria clear, PING can take PGlite as a local cache
and/or Electric shapes (or plain pgoutput) as the change feed with a
constructor-argument swap, instant FYD edits and the offline owner console
become buildable, and no provider can become canonical because the
interface forbids it.

## BYTES-DEPENDENCY COST
- Spike: @electric-sql/pglite 26MB on disk in the lane dir only; zero bytes
  in PING. Nothing installed, vendored, or imported into the repo.
- If ever adopted: ~3MB gzipped WASM per client, 128MB WASM linear-memory
  floor per PGlite instance (the binding constraint, more than bytes -
  OOM-killed 8 boots on the shared 8GB VM); 10.9-12.2s cold boot per fresh
  datadir, reducible to ~1.05s/test with the measured template-datadir
  pattern. Electric self-host = one Elixir container + wal_level=logical +
  REPLICATION role + replication-slot lag monitoring. Client-side cost at
  10/1k/100k FYDs is ~zero marginal for Electric reads; PGlite cost is
  per-client memory, not bytes.
