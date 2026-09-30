# SPRINT 2, BLOCK 0-15, MISSION U2 — REPORT: do the append-only triggers actually bind?

Mission: `8924ebeeb4094c37` (type INTELLIGENCE_RESEARCH, status completed, result verdict SCOPED).
Research brief committed BEFORE research: `BLOCK-S2-0-15-RESEARCH-BRIEF.md` (commit ff6fca5).
Drivers: `drivers/mkos-s2-u2-driver-{a,b,c,d}.cjs` (committed alongside this report).
Journal residue: ping_missions + ping_events (metadata correlation_id = mission id) + 9 knowledge nodes / 8 knowledge edges, namespace `marketingos::s2-block0-15`.
Oracle contact: NONE. The brief's read-only capture is the only Oracle material used.

## Trial substrate

Disposable database `mkos_u2_disposable` on the Pig's postgres (PG 15). Roles `u2_owner` (NOSUPERUSER, table owner) and `u2_normal` (NOSUPERUSER, non-owner, GRANT ALL on the table). The trigger function `ping_events_no_mutation()` and both triggers recreated VERBATIM from the brief's Oracle capture on a `ping_events (event_id uuid PK, body text)` table. Per-trial role context via SET ROLE from the superuser session (no passwords minted; privilege checks evaluate against the current role). Database and both roles dropped at mission end; verified gone (pg_database count 0, pg_roles count 0).

## Per-claim verdicts (all CONFIRMED)

| id | predicted | observed (verbatim) | verdict |
|----|-----------|---------------------|---------|
| U2-C1 | UPDATE raises the append-only exception | `ERROR: ping_events is append-only: UPDATE not permitted (event_id=9b52318b-f094-4c2c-be7e-9a5890f147c5)` | CONFIRMED |
| U2-C2 | DELETE raises the append-only exception | `ERROR: ping_events is append-only: DELETE not permitted (event_id=9b52318b-f094-4c2c-be7e-9a5890f147c5)` | CONFIRMED |
| U2-C3 | TRUNCATE raises the append-only exception | `ERROR: ping_events is append-only: TRUNCATE not permitted` | CONFIRMED |
| U2-C4 | non-superuser non-owner cannot SET session_replication_role | `ERROR: permission denied to set parameter "session_replication_role"` | CONFIRMED |
| U2-C5 | superuser CAN bypass via session_replication_role=replica | trial OK; post-trial row body = `bypassed` (the UPDATE landed, row trigger silent) | CONFIRMED (via correction run; see below) |
| U2-C6 | table owner (non-superuser) CAN DROP TRIGGER | trial OK; post-trial pg_trigger lists only `trg_ping_events_append_only_truncate` | CONFIRMED (via correction run; see below) |
| U2-C7 | trigger still fires under default_transaction_read_only=on + explicit START TRANSACTION READ WRITE | `ERROR: ping_events is append-only: UPDATE not permitted (event_id=9b52318b-...)` | CONFIRMED |

Verdict vocabulary used: CONFIRMED / REFUTED / UNCLEAR only (attachClaimVerdict). 7 claims + 2 correction claims = 9 CLAIM_CREATED events; 3 OBSERVATION_CREATED events (trial matrix, PG docs, correction).

## Thesis-E verdict: SCOPED

Thesis E ("the triggers are the real seal") is SCOPED, not SUPPORTED: the triggers bind exactly the non-owner, non-superuser role class. U2-C1..C4 and U2-C7 CONFIRMED show every write path available to a privileged non-owner non-superuser raises the exception, including under an explicit READ WRITE override (the read-only default is a default; the trigger is the second layer, and it fires). U2-C5 and U2-C6 CONFIRMED put superusers and the table owner outside the seal: a superuser session with `session_replication_role=replica` writes without the triggers firing, and the owner can remove the seal unilaterally. Same scoping pattern as sprint 1's REVOKE finding (C-F2).

Production implication (from sprint 1 C8, which verified the deployed Oracle app role `ping` is a SUPERUSER): the production session sits OUTSIDE this seal. The trigger layer binds the app only via app discipline (never issuing the bypass), not via the database.

## Honest incident log (driver bugs, corrected in the open)

1. PG 15 public-schema default: `CREATE TABLE` as u2_owner failed with `permission denied for schema public` (PG 15 removed the public CREATE grant). Fixed with `GRANT CREATE ON SCHEMA public TO u2_owner`; trial rerun green.
2. Driver-B verdict bug: `trial()` formatted successful multi-statement results as `OK: undefined undefined` (pg returns an array); the U2-C5/U2-C6 predicates expected `OK: UPDATE 1` / `OK: DROP TRIGGER` and mis-verdict both as REFUTED while both trials had succeeded (post-trial state proves it). Driver C (correction run, no re-trials) re-applied corrected predicates to the unchanged recorded trial data, emitted 2 corrected CONFIRMED claims (originals kept as history), re-pointed the 2 knowledge nodes, and completed the mission. Driver B patched in the drivers directory, not re-run (would have duplicated the journal record).
3. Driver-B edge slug collision: all seven finding-to-thesis edges shared one edge_id, so ON CONFLICT kept only one. Driver D inserted the missing edges with unique ids and removed the redundant one; final edge count 8 (verified).

## Version caveat

Trials ran on PG 15 (Pig); Oracle runs PG 17. BEFORE-trigger semantics, `session_replication_role` behavior, and trigger/drop privilege rules are stable across these versions per PG docs, but no direct PG-17 trial was run. U3 still open. Also open (U4): the real Oracle `ping_events` table owner was not captured (brief capture covered only the trigger definitions), so which role could exercise the owner-drop on Oracle is unestablished.

## Learning

A trigger seal is a class-bound seal: state the bound class (non-owner, non-superuser roles) or the claim overreaches. Defense in depth confirmed: `default_transaction_read_only` is a default, the trigger is the second layer that still fires when the default is overridden per transaction.

## Commits

Drivers + this report committed under `goals/ping-agent-execution-stack/hidden_files/marketingos-100h-s2/` with explicit pathspecs (commit law: git status first, no push). SHAs recorded in the parent handoff report.

## Disposal confirmation

`DROP DATABASE mkos_u2_disposable` + `DROP ROLE u2_normal, u2_owner` executed; re-query verified 0 rows in pg_database and 0 matching roles. No Oracle writes were made at any point.
