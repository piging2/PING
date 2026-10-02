# LANE H  -  LOCAL/REACTIVE FUTURE SPIKE  -  STATE

Mission: research ElectricSQL + PGlite for the reactive Postgres future; spike
a SyncPort interface behind which PING could program, with dual (actually
quad) implementations proving provider isolation. No core dependency, no
constitutionalization, nothing cloned into PING.

## Status: PROVEN (2026-09-23 ~21:30 MDT) - all four SyncPort providers conform
by LIVE EXECUTION. PGlite: 9/9 PASS on file:// (prior memory block cleared).
Two real adapter bugs were found AND fixed by execution, not review (the
prior session's code review missed both). Durability kill-test: awaited
PGlite transaction + hard exit loses 2/15 rows (upstream #1065 reproduced
in our harness); post-tx sync workaround loses 0/15. Verdicts recorded:
PGlite for lane R = REJECT (numbers below); ElectricSQL for hot path /
lane O = REJECT (mechanism harvest only). REJECT is the successful outcome:
a rejected dependency is 20x value.

## Ledger
- RESEARCHED 2026-09-23: ElectricSQL current state (GA 1.0 Mar 2025, Apache-2.0,
  read-path sync engine, Shapes over HTTP/SSE; 2026 pivot: "Electric Agents"
  agent platform + MIT-licensed Durable Streams protocol; Postgres Sync still
  maintained, @electric-sql/client v1.5.23). PGlite current state (0.5.8,
  Apache-2.0, PG 18.3, WASM in-process, single-user mode, no walsender so it
  can NEVER be an Electric source). Durability/transaction/protocol edge cases
  verified from upstream issues, not assumed.
- IMPLEMENTED 2026-09-23: SyncPort interface + 4 providers in spike/:
  StubSyncPort, PGliteSyncPort, ShapeSyncPort (Electric shape-log applier),
  LogicalSyncPort (pgoutput applier). Same 9-assertion conformance suite for all.
- TESTED 2026-09-23: stub 8/8, electric-shape 8/8, pg-logical 8/8 PASS
  (node run-all.mjs, re-verified after suite hardening). PGlite provider:
  boot/query/close proven once; full-provider run BLOCKED by sandbox memory
  (8GB VM, 120-230MB free across 18 samples, WASM boot needs 128MB
  contiguous; OOM-killed 8 attempts; 20-min background retry saw no window
  and was stood down). PGlite provider bugs found by code review and fixed:
  phantom baseline insert events on subscribe, live-diff op coalescing
  (suite now separates write ticks).
- FALSIFIED 2026-09-23: "file:// datadir gives us a durable local cache we can
  verify here"  -  cannot verify in this sandbox; recorded as environment-blocked,
  not as proven. "PGlite can serve as an Electric sync source"  -  false,
  single-user mode has no walsender (upstream-confirmed).
- TESTED 2026-09-23 ~21:30 (follow-up pass, quiet VM): pglite 9/9 PASS on
  file:// (run-pglite.mjs memory:// + run-all.mjs file://). Two REAL adapter
  bugs caught by LIVE EXECUTION that the prior session's code review missed:
  (a) live extension's initial callback fires SYNCHRONOUSLY inside live.query()
  before promise resolution; baseline stored on liveSub._last threw on null
  liveSub, the empty catch swallowed it, initialized stayed false, and the
  FIRST change after every subscribe was silently absorbed into the baseline
  and never emitted (silent event loss); fixed by closure-scoped baseline
  state. (b) delete-diff iterated Map ENTRIES (for (const k of last)) instead
  of keys: emitted a bogus delete on every update (cur.has(entryArray) always
  false) and malformed delete keys; fixed with last.keys().
- MEASURED 2026-09-23: PGlite 0.5.8 cold boot 10.9-12.2s (fresh initdb),
  warm boot 0.6s (existing datadir), RSS 734MB process (WASM 128MB floor),
  26MB on disk / 10.1MB pglite.wasm / 395KB initdb.wasm, file:// inserts
  445 rows/s single / ~1ms/row in-tx. Template-datadir pattern (initdb once,
  cp per test): 12.5s once, 39MB template, 146ms copy, 0.9s boot ->
  ~1.05s per hermetic fixture DB.
- TESTED 2026-09-23: kill-test harness (child: awaited write then
  process._exit, parent reopens datadir, 15 trials): awaited transaction() +
  hard exit = 2/15 rows LOST (pglite#1065 reproduced in our harness:
  transaction() resolves before syncToFs); top-level query() + hard exit =
  0/15 lost; transaction() + one dummy top-level SELECT 1 + hard exit =
  0/15 lost (VERIFIED workaround: post-tx sync forces the flush).
- VERDICT 2026-09-23: lane R adopts PGlite for DB fixtures = REJECT (lab is
  HTTP-replay, zero-dep by standing decision, no SQL-backed connector under
  test; PGlite adds 26MB/128MB/11s-cold-boot for a need that does not exist).
  WATCH: template-datadir PGlite as hermetic fixture DB if lane CONN ever
  tests a Postgres-backed source (~1.05s/test, 0/15 loss with the post-tx
  sync wrapper). Hot-path ElectricSQL sync = REJECT (needs wal_level=logical
  + replication slot + Elixir service; PING's canonical truth is the event
  plane, not a PG WAL; buys nothing for URL->trusted-FYD). Lane O harvest =
  mechanism confirmation only (offset-addressed append-only log = lane O's
  watermarked replay; must_refetch = full-resync on definition change;
  Electric tells you WHICH ROWS changed, not WHICH DERIVED ARTIFACTS depend
  on them - the incremental-refresh problem stays ours).

## Next
1. Hand REACTIVE-SPIKE.md + HARVEST-REPORT.md to coordinator. Lane verdicts
   (lane R: REJECT; hot-path Electric: REJECT; lane O: mechanism-only) are
   final pending a demonstrated SQL-backed connector need. STOP unless directed.
2. WATCH triggers that would reopen: upstream fixes #1065/#1048/#1049 with
   tests; PGlite leaves alpha with a written durability contract; lane CONN
   takes on a Postgres-backed source (then: template-datadir pattern +
   post-tx sync wrapper, both measured here).

## Files
- spike/sync-port.mjs  -  SyncPort interface + 4 providers
- spike/conformance.mjs  -  provider-agnostic 9-assertion suite
- spike/run-all.mjs, run-pglite.mjs, pglite-smoke.mjs  -  runners
- REACTIVE-SPIKE.md  -  research + spike results + non-adoption criteria + optionality
- HARVEST-REPORT.md  -  harvest verdict
