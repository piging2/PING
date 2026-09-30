# SPRINT 2, BLOCK 0–15 — RESEARCH BRIEF (committed before research)

Mission type: INTELLIGENCE_RESEARCH. Topic: U2 — do the append-only triggers
actually bind? (Sprint 1, thesis E "the two-layer seal" was INCONCLUSIVE for
lack of this test.)

## Source material (captured read-only from Oracle, 2026-09-30)

Oracle `crx_runtime`, table `public.ping_events`, two triggers:

```sql
CREATE TRIGGER trg_ping_events_append_only
  BEFORE DELETE OR UPDATE ON public.ping_events
  FOR EACH ROW EXECUTE FUNCTION ping_events_no_mutation();

CREATE TRIGGER trg_ping_events_append_only_truncate
  BEFORE TRUNCATE ON public.ping_events
  FOR EACH STATEMENT EXECUTE FUNCTION ping_events_no_mutation();

CREATE OR REPLACE FUNCTION public.ping_events_no_mutation()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION '% is append-only: TRUNCATE not permitted', TG_TABLE_NAME;
  END IF;
  RAISE EXCEPTION '% is append-only: % not permitted (event_id=%)',
    TG_TABLE_NAME, TG_OP, COALESCE(OLD.event_id, NEW.event_id);
  RETURN NULL;
END;
$function$
```

Oracle was inspected read-only only. No Oracle writes. No Oracle state changes.

## Falsifiable claims

| id | claim | method |
|----|-------|--------|
| U2-C1 | UPDATE on a trigger-protected table raises the append-only exception | trial, disposable PG |
| U2-C2 | DELETE on a trigger-protected table raises the append-only exception | trial, disposable PG |
| U2-C3 | TRUNCATE on a trigger-protected table raises the append-only exception | trial, disposable PG |
| U2-C4 | a non-superuser, non-owner role CANNOT bypass via `SET session_replication_role` (permission denied) | trial, disposable PG |
| U2-C5 | a superuser CAN bypass via `SET session_replication_role = replica` (triggers do not fire) | trial, disposable PG |
| U2-C6 | the table owner (non-superuser) CAN `DROP TRIGGER` on its own table | trial + PG docs |
| U2-C7 | with `default_transaction_read_only=on` + explicit `START TRANSACTION READ WRITE`, the trigger still fires on UPDATE (defense in depth, trigger is the second layer) | trial, disposable PG |

Verdicts: CONFIRMED / REFUTED / UNCLEAR per claim. Primary sources:
the Oracle definitions above, disposable-PG trials, PG docs for
owner/superuser semantics (cite as docs where not trialed).

## What would falsify thesis E

Thesis E ("the triggers are the real seal") is SUPPORTED only if the
triggers bind every role that can reach the table. It is FALSIFIED (or
scoped) if U2-C5 or U2-C6 is CONFIRMED: a superuser bypass or an
owner-drop means the triggers bind only non-owner, non-superuser roles —
the same scoping pattern as sprint 1's REVOKE finding (C-F2).

## Constraints

- Disposable database on the Pig's postgres ONLY
  (`CREATE DATABASE mkos_u2_disposable`, dropped at mission end).
  Recreate the function + triggers verbatim on a `ping_events`-like table.
- NO Oracle writes. Oracle state untouched. The definitions above are the
  only Oracle contact, and they were read-only.
- Trials run on PG 15 (Pig); Oracle runs PG 17. Trigger/BEFORE semantics
  and `session_replication_role` are stable across versions, but record the
  version caveat (U3 still open).
- Residue: ping_missions / ping_events / knowledge_nodes+edges,
  namespace `marketingos::s2-block0-15`. No new authorities, stores, writers.
- Commit law on every writer. No push without Nolan's explicit authorization.
