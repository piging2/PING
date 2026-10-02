# LANE M — Source Registry — STATE

## Status: PROVEN (spike level, isolated harvest area)

Lane: P0 INFRA cross-cutting. Mission: source registry as OPERATIONAL
metadata, NOT a truth authority. Design (SOURCE-REGISTRY-DESIGN.md +
REGISTRY-API-DRAFT.md, earlier pass) now backed by a working zero-dep Node
spike: `harvest/registry/` (registry.mjs, taxonomy.mjs, fake-connectors.mjs,
demo.mjs, redteam.mjs, run-all.sh). `run-all.sh` green 2026-09-23 night:
8 proof scenarios + 17 red-team cases pass. No repo writes; PING repo
read-only search done; constitutional sprint WIP untouched.

## Boundaries (standing, unchanged)
- Registry owns: source instance records, health (computed, never asserted),
  checkpoints/cursors (opaque blobs, framing only), budgets, lifecycle,
  connection-handle refs. Owns NOTHING canonical: no business facts, no event
  payloads, no secrets, no ids/hashes/sequences (phase0), no custody (lane L),
  no failure codes of its own (lane K v1.0.0 via lane J's taxonomy.mjs).
- Lane J owns the raw run stream; lane M owns the registry projection.
  Confirmed via INTEGRATION-REQUEST-lane-m.md filed in lane-j/ (2026-09-23).
  Registry never stores full RunRecords, never re-implements the run ledger.
- Manifest = what a connector IS (BCQ); registry record = how an INSTANCE
  is doing. No convergence risk with src/lib/registries.ts (content
  registries, unrelated domain).

## Research ledger
- RESEARCHED: PING repo @ e48ef710 (fyd-factory, Pig WSL, read-only): no
  source/connector registry, no cursor/checkpoint store exists. `src/lib/
  registries.ts` = services/cities/materials config; `src/lib/oauth.ts` =
  OAuth provider authority config; `src/fyd/acquisition/acquisition-adapter.ts`
  = types only. Gap is real; nothing to converge on.
- RESEARCHED: connector-manifest-schema.md v1.0 (design spec, unimplemented):
  registry consumes manifests, does not re-author them. Airbyte protocol docs
  (harvest/airbyte): STREAM/GLOBAL STATE messages = per-stream opaque state
  (mechanism adopted as Checkpoint framing); the read.request.state "opaque
  per-stream watermark" field matches the design §5 exactly.
- HARVESTED: Airbyte M9 mechanism (opaque delta watermarks, platform rolls
  back to last committed state on failure) + Singer-style state-checkpoint
  emission. ADAPTED, not imported.
- LICENSES: Nango ELv2, Airbyte ELv2 (source-available, not copyleft; no
  vendoring into PING per program rules). Harvest is mechanism-only (ideas,
  not code). Singer spec Apache-2.0. No dependency adopted.
- REJECTED: Nango as registry (holds raw secrets = lane L territory; hosted
  sync engine, weight dwarfs value; no taxonomy-driven health concept).
  Temporal / Trigger.dev (orchestration, not operational metadata; weight
  dwarfs value). Any external registry product (all would hold canonical
  state or demand secret custody = kill criteria).
- IMPLEMENTED: harvest/registry/ spike (~600 lines, zero deps).
- TESTED: run-all.sh green. demo.mjs: 3 fake sources (git repo, GitHub repo,
  business API) registered; health healthy->RATE_LIMITED->down->recovered;
  crash-before-commit leaves checkpoint unmoved; stale-floor rollback
  refused; budget exhaustion blocks scheduling; terminal PERMANENT retires
  source; sha-corruption auto-quarantines then full re-derive re-anchors;
  registry loss rebuilds identically from the event log.
- RED-TEAMED: 17 cases hold — cross-tenant isolation (NOT_FOUND, never leak),
  cursor forgery (sha mismatch, cross-lease commit, floor rollback), health
  gaming (no setHealth API, RunReport health assertion rejected, override
  requires acknowledging reason), secret stash in cursor/connectionHandle
  rejected, quarantined-checkpoint misuse refused, taxonomy drift rejected.
- FIXED (during spike): emit() now applies to the in-memory projection
  (log + projection advance together, single-writer); lease survives
  multi-stream commitCheckpoint, closed by heartbeat; decommissioning sources
  evaluate to down/retired, not healthy; redteam harness wired to the shared
  journal seam (registry and connectors must share the commit-range source);
  registered->active transition now emits SOURCE_PATCHED (the S8 replay test
  caught a silent mutation — every mutation is an event, no exceptions).
- PROVEN: the spike demonstrates every mission requirement in §5 of the lane
  brief. Status PROVEN at spike level; repo integration stays gated on design
  sign-off (lane CONN + lane J review of REGISTRY-API-DRAFT.md).
- FALSIFIED: none. (Hypothesis "PING already has a registry" falsified by
  the repo search; "an external product fits" falsified by the kill criteria.)

## Convergence / integration requests filed
- lane-j/INTEGRATION-REQUEST-lane-m.md (2026-09-23): J owns raw run stream,
  M owns registry projection; RunReport.runId = lane-J run_id; registry never
  stores full RunRecords; journal commit-range seam stays phase0's.
- Still open from earlier pass: phase0 canonical event-name reservations
  (SOURCE_REGISTERED, SOURCE_CHECKPOINT_ADVANCED, SOURCE_HEALTH_TRANSITIONED,
  SOURCE_PAUSED, SOURCE_RESUMED, SOURCE_DECOMMISSIONED,
  SOURCE_CURSOR_QUARANTINED, SOURCE_RECONNECTED); lane L handle-lifecycle API;
  lane CONN + lane J review of REGISTRY-API-DRAFT.md.

## NEXT
1. Lane CONN: build first real adapter against the registry spike + BCQ test
   kit (GitHub connector is the charter's first candidate).
2. Phase0: reserve the SOURCE_* event names; confirm the commit-range seam.
3. Lane R: failure-injection fixtures for cursor corruption mid-commit and
   quarantine paths (the spike's crash/quarantine steps are the fixture
   templates).
4. Repo integration (isolated worktree) only after design sign-off; still no repo writes made or requested.
5. Kill criteria hold: if any proposal puts business state in the registry,
  reject with a pointer to the object graph.
