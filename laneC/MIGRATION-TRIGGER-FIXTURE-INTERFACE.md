# Migration-vs-Trigger Fixture Interface (Lane A produced, Lane C consumes)

**Status: PRODUCED BY LANE A (events lane, 2026-09-19).** The fixture and gate
exist at `ping-runtime/events/migration-certification/` and are owned by the
events lane; Lane C reads them and never rewrites them. The execution portion
of `migration-trigger-gate.js` reports BLOCKED until a Lane A gate result for
the release source SHA exists. The JSON contract below is a PROVISIONAL
adapter contract for Lane C's `--fixture-result` consumer; Lane A's gate
itself reports via exit code + stdout, not JSON. If the two disagree, Lane A's
gate is authoritative.

## Lane A's fixture (authoritative, read-only for Lane C)

- `ping-runtime/events/migration-certification/certify-sequence-migration.js`: the certification gate.
- `ping-runtime/events/migration-certification/oracle-append-only-fixture.sql`: variant A (pre-migration Oracle state): `ping_events` WITHOUT the sequence
  column, representative pre-sequence rows, then the exact live trigger
  function + both triggers installed.
- `ping-runtime/events/migration-certification/variant_b.sql`: variant B
  (Oracle's ACTUAL current state after the failed deploy: nullable sequence
  column + nextval default, no unique index, no NOT NULL, triggers installed).
- `ping-runtime/events/migration-certification/ORACLE-APPEND-ONLY-FIXTURE.md`: provenance and fidelity record.

Fixture provenance (Lane A's record, verified read-only on Oracle 2026-09-19):

- Triggers captured byte-verbatim via `pg_get_triggerdef(oid)`:
  `trg_ping_events_append_only` (BEFORE DELETE OR UPDATE ON ping_events FOR
  EACH ROW) and `trg_ping_events_append_only_truncate` (BEFORE TRUNCATE).
- Trigger function captured byte-verbatim via `pg_get_functiondef(oid)`:
  `public.ping_events_no_mutation()` raises unconditionally; NO maintenance
  exception path.
- Installation provenance: the live trigger/function names appear NOWHERE in
  repository-managed history; installed out-of-band on Oracle; preserved per
  standing law. The migration is the side that changes.

What the gate asserts (Lane A's record):

1. FAIL-BEFORE: the frozen pre-fix migration (verbatim SQL from
   `unified_event_runtime.js` @ 395b9759e) FAILS on variant A with an
   append-only error, leaving historical rows byte-identical.
2. The corrected migration (real `UnifiedEventRuntime.initialize()` code
   path) SUCCEEDS on variant A and on variant B.
3. Post-migration schema: sequence BIGINT NULLABLE with nextval default,
   sequence object owned by the column, unique index present.
4. Historical semantic content UNCHANGED: canonical hash of every
   pre-existing row identical before/after; sequence stays NULL for legacy
   rows (no fabricated ordering positions).
5. Enforcement intact: UPDATE/DELETE on ping_events still raise append-only.
6. New-row semantics: new emits allocate strictly increasing unique
   sequences.
7. Replay contract: legacy rows delivered as an explicit LEGACY segment
   (storage-evidence order, NOT certified execution order).
8. Idempotency: re-running initialize() succeeds without gaps/corruption.

Gate reporting (authoritative): exit 0 = GATE PASS, exit 1 = GATE FAIL with
the first violated assertion on stdout, exit 2 = GATE ERROR. Connection via
`PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD` env (never printed); needs a scratch
Postgres. Lane C does not re-run it; the release process runs it where a
scratch DB is available (the deployment agent's plane, or a CI plane with PG).

## Why this exists

FL-20260919-ORACLE-008: the UnifiedEventRuntime startup migration
(`ping-runtime/events/unified_event_runtime.js`, from ce3f8687c) ran
`UPDATE ping_events SET sequence = ...` as a backfill. Oracle's `ping_events`
has an append-only trigger that rejects all UPDATEs. The closure certifier
checks module membership only; the smoke test runs without Postgres. Neither
gate could see the incompatibility. Fixed by the events lane in 8e2496b14:
the backfill UPDATE is removed (option B: sequence for new events only;
legacy rows keep explicit unknown-ordering semantics), NOT NULL is
conditional on zero NULL rows.

## Provisional adapter contract (v1, consumed via --fixture-result)

Until Lane A's gate emits a result JSON itself, the adapter that runs it
translates the authoritative exit code into this JSON:

```json
{
  "tool": "migration-trigger-fixture",
  "version": "1",
  "sourceSha": "<40-hex git sha the fixture ran against>",
  "triggerPolicyDigest": "<sha256 of tools/distribution/trigger-policy.oracle-canonical.json>",
  "fixtureDb": {
    "image": "postgres:16",
    "enforcement": { "ping_events": ["REJECT_UPDATE", "REJECT_DELETE"] }
  },
  "migrations": [
    {
      "id": "<stable migration unit id, e.g. uer.ensureSchema.sequence-backfill>",
      "statementDigest": "<sha256 of the exact statement text executed>",
      "result": "PASS",
      "error": null
    }
  ],
  "verdict": "PASS"
}
```

Translation rule (provisional, this lane only): Lane A exit 0 maps to
`verdict: PASS`; exit 1 maps to `verdict: FAIL` with the violated assertion
in `migrations[].error`; exit 2 maps to `verdict: ERROR` (consumer FAIL:
GATE_ERROR). The adapter must set `sourceSha` to the commit the gate
actually ran against and note the translation in the JSON.

Rules the consumer enforces:

- `tool` must be exactly `migration-trigger-fixture` and `version` exactly
  `"1"`; anything else is a FIXTURE_CONTRACT_VIOLATION (FAIL).
- Every migration in `migrations` needs `result` PASS or FAIL and a
  `statementDigest`; a FAIL anywhere, or `verdict` anything but PASS, is a
  FIXTURE_MIGRATION_FAILED (FAIL).
- `triggerPolicyDigest` must equal the sha256 of the trigger policy document
  the gate scanned against; a mismatch is FIXTURE_POLICY_MISMATCH (FAIL,
  re-run the fixture against the current policy).
- `sourceSha` mismatch against the release source SHA is a WARNING recorded
  in the release artifact, not a FAIL (the fixture may legitimately run on
  the deploy commit while the gate scans the worktree, or vice versa).

## What Lane C owns vs Lane A

- Lane C: `migration-trigger-gate.js` (static statement scan + contract
  verification), this interface document, the trigger policy document,
  the release-artifact slot for the migration compatibility result.
- Lane A: the fixture database, the execution harness
  (`certify-sequence-migration.js`), the fixture result. Lane C reads Lane
  A's output files only and never rewrites them.

## Acceptance for unblocking

The BLOCKED status on the migration compatibility gate clears when a Lane A
gate result for the release source SHA exists (exit 0, or an adapter JSON
satisfying the provisional contract with verdict PASS). A fixture FAIL keeps
the release blocked; that is the gate working as designed.
