# P1 — Promote the append-only trigger to the live journal

**Status:** PROPOSED ONLY (live DB — not applied). **No new canonical database created.**

## WHY

The live canonical journal `brain-postgres` / `ping_runtime` / `ping_events` (2,429 rows, written
today) has **no DB-level guard against UPDATE/DELETE/TRUNCATE**. The only protection is code
discipline (`ON CONFLICT DO NOTHING` on insert). The append-only trigger that the 2026-09-16
incident response built (`trg_ping_events_append_only` → `ping_events_no_mutation()`) exists in
three staging DBs and nowhere in source — production never received it. Any holder of the app DB
credentials (or Pig docker access) can silently mutate the journal of record. This is the single
highest-severity durability hole found by Agent 13.

## EVIDENCE

- `information_schema.triggers` for `brain-postgres.ping_runtime.ping_events`: **empty**
  (evidence: `pg-triggers2.out`).
- Trigger present: `ping-postgres/lanea_gate`, `ping-rc-postgres/lanea_gate`,
  `ping-rc-postgres/rc_staging` — `trg_ping_events_append_only [BEFORE]` on UPDATE and DELETE,
  executing `ping_events_no_mutation()`.
- `grep -rn trg_ping_events_append_only` over `/home/nolan/ping` (`--include='*.js,*.ts,*.py,*.sql,*.sh'`,
  excluding node_modules/.git/worktrees): **0 hits** — the trigger is not defined in source.
- Live table definition has no `sequence` column while staging has `sequence BIGINT` +
  `idx_ping_events_sequence` (evidence: `pg-schema.out`).
- The staging function (authoritative text, via `pg_get_functiondef` on `rc_staging`):

```sql
CREATE OR REPLACE FUNCTION public.ping_events_no_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION '% is append-only: TRUNCATE not permitted', TG_TABLE_NAME;
  END IF;
  RAISE EXCEPTION
    '% is append-only: % not permitted (event_id=%)',
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(OLD.event_id, NEW.event_id);
  RETURN NULL;
END;
$function$;
```

- Dead branch: the `TG_OP = 'TRUNCATE'` check can never fire — a `FOR EACH ROW` trigger cannot be
  attached to TRUNCATE (Postgres rejects `CREATE TRIGGER … BEFORE TRUNCATE … FOR EACH ROW`).
  TRUNCATE on the staging tables is therefore NOT blocked today despite the function's intent.

## MINIMUM CHANGE

Apply to `brain-postgres`, database `ping_runtime` (run by whoever holds the credential — the
proposer does not):

```sql
-- 1. Fixed function (dead TRUNCATE branch removed; TRUNCATE blocked by a statement trigger instead)
CREATE OR REPLACE FUNCTION public.ping_events_no_mutation()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  RAISE EXCEPTION '% is append-only: % not permitted (event_id=%)',
    TG_TABLE_NAME, TG_OP, COALESCE(OLD.event_id, NEW.event_id);
  RETURN NULL;
END;
$function$;

CREATE TRIGGER trg_ping_events_append_only
  BEFORE UPDATE OR DELETE ON public.ping_events
  FOR EACH ROW EXECUTE FUNCTION public.ping_events_no_mutation();

-- 2. Statement-level TRUNCATE guard (the row trigger cannot cover this)
CREATE OR REPLACE FUNCTION public.ping_events_no_truncate()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  RAISE EXCEPTION '% is append-only: TRUNCATE not permitted', TG_TABLE_NAME;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER trg_ping_events_no_truncate
  BEFORE TRUNCATE ON public.ping_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.ping_events_no_truncate();
```

**Open decision (coordinator):** the `sequence BIGINT` divergence. Either
(a) add `ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS sequence BIGINT` + index to live
(aligns with staging; enables the stronger ordering story EVENT-FORENSICS §2E calls for), or
(b) drop it from staging as an abandoned experiment. Do not leave the divergence.

**Follow-up (source of truth):** check the trigger definition into source (e.g. a migration file
owned by the schema agent) so the next re-initialized DB gets it — ad-hoc application is how
production lost it in the first place.

## TEST

On a scratch database (never the live one), or in a rolled-back transaction against a staging copy:

```sql
BEGIN;
UPDATE ping_events SET processed = TRUE WHERE event_id = (SELECT event_id FROM ping_events LIMIT 1);
-- expect: ERROR: ping_events is append-only: UPDATE not permitted
ROLLBACK;
BEGIN;
DELETE FROM ping_events WHERE event_id = (SELECT event_id FROM ping_events LIMIT 1);
-- expect: ERROR: ping_events is append-only: DELETE not permitted
ROLLBACK;
TRUNCATE ping_events;  -- expect: ERROR: ping_events is append-only: TRUNCATE not permitted
-- normal path still works:
INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
  VALUES ('test_' || md5(random()::text), 'TEST', 'p1-verify', NOW(), '{}', '{}', 'core::system')
  ON CONFLICT (event_id) DO NOTHING;
-- expect: 1 row inserted; then ROLLBACK or DELETE it before finishing (delete will now fail by design — use a scratch DB).
```

Also verify EventBridge's `UPDATE canonical_events SET processed …` (event_bridge.js:300) is
unaffected (different table — yes), and that no live code path UPDATEs `ping_events`
(verified: none in non-test source).

## RESULT

Not executed (live-DB DDL is out of scope for Agent 13). Expected result after application:
UPDATE/DELETE/TRUNCATE on the live journal raise; INSERT/SELECT unaffected; the journal becomes
append-only at the DB layer in production, matching staging. The backup/replica hole is NOT closed
by this patch — that belongs to the recovery domain.
