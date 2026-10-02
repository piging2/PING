# Failure classes found by worker E1 (2026-09-24)

## FL-E1-001: Dangling ALTER after seam narrowing (SUBSTANTIVE)

**What:** `tenanos-wave/integration` (PING repo) contains `src/tenanos/run/schema-attempt-fencing.sql`
(P-20260923-103, integrated as 218db490) whose ONLY base-table statements are
`ALTER TABLE tenanos_run_attempts ADD COLUMN IF NOT EXISTS ...`. No file in the
integration branch creates `tenanos_run_attempts`:

- `git grep CREATE.TABLE.tenanos_run_attempts tenanos-wave/integration -- src/tenanos/` → zero hits.
- 095's `schema.sql` was narrowed at write time to the reconciliation queue only,
  with a binding seam note assigning "Run/Attempt identity + journal" to
  P-20260923-002's `src/tenanos/runs/schema.ts` — which was never written
  (002 had no diff, no writer).
- 103's STATE entry says "Depends on P-20260923-095 ... and ALTERs its
  tenanos_run_attempts table", but the 095 it depended on no longer provides the
  table after narrowing.

**Consequence:** any fresh `psql` application of the substrate schema in dependency
order (095 schema.sql → 103 schema-attempt-fencing.sql) fails: the ALTER targets a
nonexistent table. The attempt-fencing machinery (fence conditions, checkpoint
FK) references a table that was never created. The seam note recorded the
ownership transfer; nothing tracked that the owner (002) had to land for the
dependent (103) to be appliable.

**Fix:** E1's P-20260923-002 integration supplies the missing base CREATE
(`impl/P-20260923-002/src/tenanos/runs/schema.ts`, RUN_IDENTITY_SCHEMA_SQL) with
exactly the columns 103 assumes (attempt_id PK, mission_id, attempt_number,
worker_name, started_at, ended_at, outcome, evidence_refs) plus tenant_id and
journal_ref, omitting 103's mechanics columns.

**Invariant (reusable):** a seam note that narrows a schema MUST be paired with a
tracked deliverable for the receiving owner, and integration of a dependent that
ALTERs a table must verify the CREATE exists in the merged tree (not just in the
pre-narrow diff).

## FL-E1-002: Stale diff file after write-time narrowing (PROCESS)

**What:** `diffs/P-20260923-095.diff` on disk still shows the PRE-narrow
`schema.sql` (defining `tenanos_run_attempts` + `tenanos_reconciliation_queue`),
while the integrated branch (`tenanos-wave/integration @ db80f142`) carries the
narrowed version (reconciliation queue only + binding seam note). Evaluating 002
from the diff file alone yields the wrong verdict ("002's Run row duplicates
095's table"); the integrated branch yields the right one ("002 fills the
missing base table").

**Invariant:** overlap/duplication verdicts must be grounded in the merged
integration-branch tree, never in pre-integration diff files, whenever a
write-time narrowing is recorded.

## FL-E1-003: Negative SQL-text assertions must target the mutation clause (WORKER-LOCAL, minor)

**What:** E1's first `leases.test.ts` draft asserted
`expect(RENEW_SQL).not.toContain('fencing_token =')` — but the P0 renewal
predicate legitimately contains `AND fencing_token = $5`. The intent was "renewal
must not MUTATE the token". Caught by the test run itself (1 failed / 57);
fixed to `not.toContain('SET fencing_token')`.

**Invariant:** when asserting "SQL must not do X", assert on the clause that
performs X (SET/DELETE/INSERT), not on substrings X also uses legitimately in
predicates.
