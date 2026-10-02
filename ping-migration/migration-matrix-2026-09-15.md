# PING migration matrix — night shift 2026-09-15

Branch: `night-shift-2026-09-15`. Main untouched. No pushes.
Compiled from coordinator-verified evidence (every row was independently re-run or re-grep'd by the coordinator, not taken on worker word).

## Mechanical migration matrix

| Area | Current | Target | Action | Dependency | Status |
|---|---|---|---|---|---|
| Gateway dead routes (mcp.js, connectors.js) | Unmounted, `require` of missing `route_middleware` / `mcp_registry` | Archived with history | `git mv` to `archive/dead-routes-2026-09-15/` + README | none | DONE (`59ddede3`) |
| Gateway dashboard.js | Unmounted, zero callers, `require` fails MODULE_NOT_FOUND | Archived with history | `git mv` to `archive/dead-routes-2026-09-15/` + README note | none | DONE (`128119da`) |
| Gateway startup | Crash on missing `bootstrap.js` (TS source only) | Honest degraded state + `/healthz` | Guarded `require`, typed degraded runtime, `GET /healthz` 200/503 | none | DONE (`59ddede3`) |
| Gateway `/healthz` healthy | 503 degraded | 200 healthy | Real build step for bootstrap + gateway server deps (`pg`) + live PG | TS build (none sanctioned), `pg` install, PG | NOT STARTED — proven out of scope tonight (see notes) |
| Event identities (`event-sourcing.ts`) | `Date.now()`/`Math.random()` IDs at 7 sites | Content-addressed via DeterministicID authority | Replaced 7 sites, injected DeterministicClock for 10 timestamp sites | `fc4c53de` pattern | DONE (`719b53ce`), 7/7 tests green |
| Scheduler worker identities | `worker_<type>_<Date.now()>_<Math.random()>` | `worker_<type>_<16hex>` content hash | New `constitutional-compiler/deterministic-ids.ts` consumer adapter; replaced queue/task/worker IDs | `88bc51bd` pattern | DONE (`a70d9f86`) |
| Clock/random sweep (`constitutional-compiler/`) | 26 nondeterministic identity sites | Deterministic or justified-leave | Replaced 26, deleted 4 dead generators, fixed idempotency-key bug | none | DONE (`a70d9f86`); 1 regression caught and fixed (`e794da25`) |
| Marketing compiler passes | Spec only (`AutomationPass` docs-only) | 8-pass implementation | New `constitutional-compiler/marketing-compiler/` module, 19 tests | none | DONE (5 commits `961a3b21`..`067d3270`) |
| Event-spine convergence | 5 implementations, 2 dead | 1 canonical store + adapters + testing doubles | Archived 2 dead with reasons, kept rest with classification | none | DONE (`ef52e12b`) |
| `evidence_events` dual writer | `EventStore` and `PostgresAppendStore` INSERT different column sets | Single writer contract | Production rewiring decision | event-sourcing/bootstrap owners | FLAGGED, not started |
| CI gate (`replay-integrity.yml`) | Stale paths, no-op ts-node step | Runnable gate on real suites | Rewrote + expanded: 11 suites + forbidden-import grep on `dist/runtime/replay` | none | DONE (`cd10e385`, `16e08c41`), all green locally |
| CLEANUP_PROPOSAL Phases 1-3 | 14 files proposed for archive | Verified | All already absent from tree, zero live callers; record in `archive/cleanup-2026-09-15/README.md` | none | DONE (verified negative, `cd10e385`) |
| Pre-existing test failures | `consensus_stats` 115/118, `event_collision` failures, `benchmark`/`canonical_json`/`determinism`/`witness_equivalence` MODULE_NOT_FOUND, `replay/*.test.ts` no runner | Green or explicitly tracked | Triage: fix, repoint, or document | test-infra owner | DONE (`44d16b3f`): 3 fixed and in CI; 4 dead suites documented with evidence in workflow comments |
| Observation determinism | `fc4c53de` committed | Regression-covered | `gateway/tests/observation_idempotency.test.js` green | none | DONE (pre-existing, re-verified tonight) |
| ProductionReplayEngine replay | Engine implemented earlier | Mechanically true replay (original IDs/timestamps preserved, derived artifacts deterministic) | Code-reading verification; live PG replay proof | PG | PARTIAL (see notes) |
| Root README | Was `# crx-runtime` stub | Current repo map | Rewrote | none | DONE (`81ebe99d`) |
| CodeRabbit config | No config | Independent review layer | `.coderabbit.yaml` (app install is Nolan's call) | Nolan | DONE (`fb998f64`) |

## Authority table (migration scope, not exhaustive)

| Owner | Invariant | Reads | Writes | Mutation jurisdiction | Callers | Dependencies | Status |
|---|---|---|---|---|---|---|---|
| `DefaultDeterministicID` (`packages/constitutional-runtime/authorities/deterministic-id.ts`) | ID = sha256(canonical({parent, aggregate, eventType, payload})) | any ID minter | n/a (pure) | constitutional-runtime package | EventSourcingSystem, deterministic-ids adapters, engines | HashAuthority, CanonicalSerializer | CANONICAL, enforced |
| `constitutional-compiler/deterministic-ids.ts` | Consumer-side adapter; delegates all hashing to the authority | runtime layer files | none | n/a (adapter) | scheduler-runtime, engines, routers, bus | DeterministicID, HashAuthority, CanonicalSerializer | CANONICAL ADAPTER (new, `a70d9f86`) |
| `workers/canonical/determinism.ts` | Same adapter pattern, worker domain | workers | none | n/a (adapter) | canonical worker | same authorities | CANONICAL (`88bc51bd`, preserved) |
| `EventSourcingSystem` (`runtime/event-sourcing/event-sourcing.ts`) | Constitutional emit path; content-addressed event/envelope/projection IDs; timestamps via injected clock | AuthorityEngine, engines | `evidence_events (canonical_bytes, metadata)` | EventSourcingSystem | bootstrap, engines | DeterministicID, DeterministicClock, PG | CANONICAL EMIT PATH (deterministic as of `719b53ce`) |
| `PostgresAppendStore` (`packages/postgres/append_store.ts`) | Pipeline-internal append path (agent-bus, replay engine) | agent-bus, production-replay-engine | `evidence_events` (full evidence schema) | PostgresAppendStore | agent-bus, replay engine, scripts | PG | LIVE — dual-writer caveat FLAGGED |
| `ConstitutionalRuntime` (`gateway/constitutional_runtime.js`) | Gateway integration; honest degraded state, never crash | gateway server | none (runtime state) | gateway | `server.js` (`/initialize`, `/healthz`) | bootstrap (optional) | CANONICAL gateway owner, degraded-honest |
| `InMemoryEventStoreAdapter` (`packages/constitutional-runtime/adapters/EventStoreAdapter.ts`) | Testing double only | 3 proof test files | n/a | test files | `authority-proof`, `replay-determinism`, `mutation-proof` tests | none | LEGITIMATE, kept (`ef52e12b`) |
| Marketing compiler passes (`constitutional-compiler/marketing-compiler/`) | 8-pass pipeline; deterministic content-addressed IDs; honest thin-spot labels | business intent fixture | in-memory event log / knowledge index | pipeline orchestrator | sample driver, tests | node builtins only | NEW, 19/19 green |

## Notes

- Gateway `/healthz` healthy was proven out of scope tonight: tsc compiles the bootstrap closure to /tmp cleanly (only pre-existing type errors), but the repo's own `tsconfig.json` includes only `runtime/replay/**` and `tests/**` (no sanctioned bootstrap build exists), the compiled bootstrap requires `pg` (not installed for the gateway), and healthy needs live PostgreSQL plus the full service graph. The honest-degraded state is the correct tonight outcome.
- `evidence_events` dual-writer: `event-sourcing.ts:175` writes `(canonical_bytes, metadata)`; `packages/postgres/append_store.ts:38` writes a different column set. Same table, two writers, two schemas. Needs a production-rewiring decision; deliberately not touched tonight.
- Pre-existing failures excluded from the CI gate are named in the workflow comments so the gate stays green without hiding them.
- Workstream C's `a70d9f86` shipped 3 broken files (dangling `SequenceIdGenerator` refs); coordinator verification caught it and `e794da25` repaired it. The verify step is load-bearing.
- ProductionReplayEngine (`constitutional-compiler/pipeline/production-replay-engine.ts`, 198 lines) code reading: original event IDs ARE preserved (`ordering.push(event.eventId)`, line 76); original timestamps are NOT surfaced (replay witness stamps literal `'constitutional-replay'` instead, lines 101/115); derived `replayId` is deterministic (hash of eventCount + first/last event hashes); `verifyDeterminism()` exists but was not executed against live PG tonight. Unused `const startTime = Date.now()` at line 56 (dead variable, noted not fixed).
