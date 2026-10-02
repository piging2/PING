# LANE BCQ-AIRBYTE — STATE (sync-concepts harvest worker)

## STATUS: BUILDABLE

Design complete. Nothing implemented by this worker (implementation belongs to
lane CONN adapters + lane M registry, per charter). No code written to any repo.
No credentials touched. No vendor adopted.

## STANDING DECISIONS COMPLIANCE (Nolan 2026-09-23, binding)

1. Connector credentials (queue for morning): NO IMPACT. This lane produced
   design documents only. No connect flow built, no OAuth attempted, no tokens
   handled, no provider accounts touched. Fixtures/recorded-responses only, per
   the order. The state schema proposal references token lifecycle only via the
   already-harvested M11 pattern and lane L custody; it specifies no credential
   handling of its own.
2. Vendor veto (YES adoption / NO experimentation): NO GATE TRIGGERED. The
   harvest recommends ZERO new dependencies: concepts only, no Airbyte code
   copied, vendored, or linked (ELv2 respected by design). Gate questions
   answered in AIRBYTE-HARVEST.md: the wrapper is ~15 KB of hand-written schema
   + types (removes commodity design work, does not add commodity code); the
   URL -> TRUSTED FYD loop is improved (incremental review streams, bounded
   initial sync); everything is removable (state is Class C operational data);
   PING remains the authority (checkpoints can never become truth); the schema
   owns no data; if the design disappeared, connectors would fall back to
   full re-fetch (cost, not breakage); cost at any scale is near-zero (no
   hosted service, no per-call fee).

## DELIVERABLES (this lane, distinct filenames per charter)

- `AIRBYTE-HARVEST.md` — full harvest shape: PROBLEM / PING ALREADY HAS /
  EXTERNAL CANDIDATES / LICENSES / TESTED / WINNER / ADOPT-ADAPT-REJECT /
  CODE WE DO NOT NEED TO WRITE / MINIMAL PING WRAPPER / FAILURE TEST /
  PRODUCT CAPABILITY UNLOCKED / BYTES-DEPENDENCY COST.
- `INCREMENTAL-STATE-SCHEMA-PROPOSAL.md` — the portable incremental-state
  envelope (JSON Schema draft 2020-12): fixed framing, opaque cursor value,
  cursor_kind enum, version + migration history, monotonicity rules, adoption
  rule for replacement connectors, worked GBP-reviews example, open questions
  for lanes M/K/R/J/CONN.
- Research clone (read-only): `~/workspace/ping-build-program/harvest/airbyte`
  @ `a917b497` (2026-09-23), sparse 4.8 MB, disposable.

## KEY DECISIONS (for coordinator convergence)

- DESTINATION as an actor class: REJECTED. FYD has one destination, the
  append-only evidence plane. Adopted instead: commit-before-advance invariant.
- STATE: per-stream opaque (Airbyte STREAM type) ADOPTED; GLOBAL shared state
  and LEGACY untyped blobs REJECTED.
- CHECKPOINTS are operational Class C data (lane M owns the store); the
  contract owns the FORMAT. Checkpoint loss costs a bounded re-fetch, never truth.
- SELECTIVE STREAMS adopted as the product principle: DON'T INGEST EVERYTHING,
  INGEST WHAT THE PRODUCT NEEDS. Controlled initial sync (windowed/from_now/full)
  with an explicit budget line.
- ELv2 recorded: permits use/copy/distribute/derivatives; forbids hosted-service
  competition, license-key circumvention, notice removal. We take concepts only;
  zero encumbrance.
- Sibling BCQ-TESTKIT's kit is PROVEN (18/18). My failure-test cases (cursor
  corruption, state schema drift, lying source) are specified as future kit
  assertions + lane R fixtures; filed as open questions, not duplicated here.

## LANE LEDGER

- RESEARCHED: Airbyte protocol doc (v0.0.0-v0.19.0 changelog), state types +
  principles, socket-mode state coordination, resumability/artificial cursors,
  schema-mismatch policy, LICENSE (ELv2, full text).
- RESEARCHED: PING repo (read-only): zero cursor/checkpoint/sync-state stores;
  no polling scheduler; no connection record. Confirmed gap, no DUP risk.
- RESEARCHED: business-connectors/hidden_files (contract, manifest schema v1.0
  draft, ecosystem-harvest M1/M9/M14); lane M SOURCE-REGISTRY-DESIGN.md §4-§5
  (compatible: registry framing + commit-first advance align with this proposal).
- HARVESTED: 10 concepts with ADOPT/ADAPT/REJECT verdicts (see AIRBYTE-HARVEST.md).
- FALSIFIED: none. Nothing in Airbyte's model contradicted PING's constitution;
  the destination actor was rejected on constitutional grounds, not technical ones.

## NEXT

1. Lane M: confirm registry API shape against the state envelope (propose/commit
   split vs single commit; event names SOURCE_CURSOR_QUARANTINED /
   CURSOR_REGRESSION / STREAM_STATE_RESET vs lane K taxonomy).
2. Lane CONN: first adapter to implement the envelope end to end (GitHub issues
   stream suggested: page_cursor + updated_at).
3. Lane R: fixtures for corrupted state, version-skewed state, lying-source
   page sequence, delta-token-invalid rejection.
4. BCQ-TESTKIT (sibling): fold the four failure-test cases into kit assertions
   when the first real adapter lands.
5. This lane: idle until a consumer (M/CONN/R) files an integration request or
   coordinator assigns the next harvest.
