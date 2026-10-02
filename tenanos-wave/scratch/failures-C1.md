# failures-C1.md — worker C1 failure classes

## FC-C1-01: re-entrant claim by the holder rejected as a second claim (FOUND, FIXED, VERIFIED)

- **Detected:** first jest run, property (4) — `out.won` false on resume.
- **Diagnosed:** the winner's claim from property (3) persisted (lock file +
  `claimed` status). The resume path re-invoked `claimOrphan()`, hit the
  existing lock, and returned `won:false` — a holder re-entering its own
  claim was misclassified as a competing claimant.
- **Fix implemented:** `claimOrphan()` now reads the lock content on EEXIST;
  if the lock's claimer matches the caller, it returns
  `{won:true, already_held:true}` with the current fencing token instead of
  losing. A different claimer still loses.
- **Verified:** two consecutive 5/5 runs after the fix; property (3)'s
  late-claimer (different id) still loses.
- **Generalized invariant:** a claim primitive must distinguish *holder
  re-entry* from *competitor claim*; conflating them turns a successful
  recovery into a spurious loss.

## FC-C1-02: 103 transition table has no orphan re-claim edge (OBSERVED, NOT A DEFECT — SEAM NOTE)

- **Observed:** `ATTEMPT_TRANSITIONS` in `attempt-fencing.ts` has no edge for
  "orphaned `running` attempt re-claimed by a new coordinator" (`running`
  only offers complete/fail/timeout/expire/supersede; `claim` only leaves
  `created`). The harness's `claimOrphan()` implements recovery as
  token-rotation + status `claimed`, which is the *supersede* semantic
  (A-1: zombie writes match zero rows), not a vocabulary transition.
- **Status:** not a failure of the substrate — recovery claim is a
  coordinator-level action outside the attempt's own lifecycle machine —
  but any future writer of a recovery path must not invent a `running→claimed`
  edge ad hoc; it goes through the 103 owner or the vocabulary guard.
- **Recommendation for the wave:** if 103's owner wants the recovery claim
  modeled in the table, add an explicit `reclaim` event; until then the
  supersede-semantic stands.

## FC-C1-03: SQL-enforced claim atomicity untested — no Postgres in this environment (KNOWN LIMITATION)

- **What:** this test proves atomic re-claim with a real OS-level race, but
  the enforcer is the filesystem O_EXCL lock. The production enforcer per
  103 is the SQL conditional UPDATE carrying the fencing token
  (`buildFenceCondition` / `interpretFenceResult`). Its atomicity is the
  database's and is NOT exercised here — no Postgres/PG client exists on
  the Pig in this environment.
- **What would close it:** run the same four-property battery against a
  real Postgres with `tenanos_run_attempts` /
  `tenanos_attempt_checkpoints` from the integrated schemas, racing two
  `psql` sessions on the conditional UPDATE and asserting rowCount 1/0.
- **Not faked:** property (3) is marked PASS for the protocol + OS-level
  race; the SQL-enforcement layer is explicitly out of scope (see
  TEST-REPORT.md limitations).

## FC-C1-04: inline checkpoint record pending P-20260923-005 integration (DEPENDENCY, OPEN)

- **What:** the checkpoint record used here is defined inline in the
  harness, shaped per the 005 proposal notes (LangGraph shape). 005 is
  `proposed`, not integrated; there is no canonical
  `src/tenanos/checkpoint/schema.ts` yet.
- **Risk if 005 integrates differently:** the harness shape drifts from
  canonical; the test would pin the wrong record.
- **Action:** when 005 integrates, replace the inline record with an import
  of the canonical schema and re-run this battery. Until then this file and
  TEST-REPORT.md carry the dependency note.
