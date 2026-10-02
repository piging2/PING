# Phase 9: Append-Only Hardening (TRUNCATE Protection) — 2026-09-17

**Status:** COMPLETE. TRUNCATE protection is live on Oracle; full certification matrix passes.
**Operator:** Pigi (Phase 9 subagent). No commits, no pushes, no secret exposure.
**Window:** 2026-09-17 ~05:50 to ~06:20 MDT.

## 1. Certification verdicts

| Check | Verdict | Evidence |
|---|---|---|
| UPDATE denied (live `ping_events`) | PASS | `ERROR: ping_events is append-only: UPDATE not permitted (event_id=e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18)` |
| DELETE denied (live `ping_events`) | PASS | `ERROR: ping_events is append-only: DELETE not permitted (event_id=e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18)` |
| TRUNCATE denied for runtime authority | PASS | Disposable probe table reproducing production config (owner `ping`, both triggers): `ERROR: phase9_probe_events is append-only: TRUNCATE not permitted`, fired inside a rolled-back transaction, row intact |
| INSERT works | PASS | Probe table: 1 row inserted; scratch DB: 1 row inserted |
| ON CONFLICT idempotency works | PASS | Probe table and scratch DB: re-insert with `ON CONFLICT DO NOTHING` leaves exactly 1 row |
| Fresh initialization installs invariant | PASS (executed) | Scratch database `phase9_scratch`: fresh `ping_events` table, v2 DDL applied verbatim via the runbook pipe command, full matrix passes, scratch DB dropped afterward |
| Live data integrity after all tests | PASS | `ping_events` row count 1380 before and after; target row present; gateway healthy |

Honest note on the zero-row predicate: `UPDATE ... WHERE 1=0` and `DELETE ... WHERE 1=0`
succeed with 0 rows affected rather than raising. That is correct PostgreSQL semantics:
a `FOR EACH ROW` trigger never fires when no row is matched, and with no row matched
there is nothing to protect. The true denial proof is the no-op-value UPDATE/DELETE on a
real row (set `event_id = event_id`), which fires the trigger, raises, and aborts with
the row byte-identical afterward.

## 2. Live inspection findings (before change)

Connected as the runtime role `ping` via `docker exec -i ping-postgres psql -U ping -d crx_runtime`
(the same role the gateway connects as, per the Phase 0 rotation report):

- `ping_events` table owner: `ping`.
- Role `ping`: `rolsuper = t` (superuser), `rolcanlogin = t`. The runtime role is a
  database superuser.
- Grants on `ping_events` to `ping`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
- Existing trigger: `trg_ping_events_append_only` (enabled, `BEFORE UPDATE OR DELETE`,
  `FOR EACH ROW`), function `ping_events_no_mutation()` owned by `ping`.
- No TRUNCATE trigger existed.

Consequence for the design: because `ping` is a superuser, `REVOKE TRUNCATE` (or any
privilege revocation) is a no-op against the runtime role. The trigger is the only
enforcement layer that binds a superuser table owner. Deliberate bypass remains possible
only via an explicit `DROP TRIGGER` plus reissue, which is the DBA path and is auditable.
That satisfies the requirement that legitimate migration/DBA recovery stays possible.

## 3. Design: smallest safe protection

Defense in depth, in this order:

1. **Trigger/DDL protection (implemented):** added a `BEFORE TRUNCATE ... FOR EACH STATEMENT`
   trigger. TRUNCATE cannot be covered by the existing row-level trigger (PostgreSQL only
   fires statement-level triggers for TRUNCATE), so a second trigger reusing the same
   function is the minimal addition. The function now branches on `TG_OP = 'TRUNCATE'`
   first (so `OLD`/`NEW` are never touched on the statement path, where they are
   unavailable) and names `TG_TABLE_NAME` in messages so the function is reusable.
2. **Runtime role permissions:** evaluated and deliberately NOT changed. Revoking from a
   superuser is theater. A least-privilege runtime role (non-superuser gateway role with
   INSERT+SELECT only, trigger owned by a separate DBA role) is recorded below as a
   follow-up track, not smuggled into this change.
3. **Runbook coverage (implemented):** versioned DDL artifact plus exact placement
   instructions for from-scratch init (section 6).

## 4. Exact SQL applied live

File: `/home/hatch/workspace/ping-overnight/event-boundary/trigger-append-only-v2.sql`
(the sprint's v1 file `trigger-append-only.sql` was NOT overwritten).

```sql
CREATE OR REPLACE FUNCTION ping_events_no_mutation()
RETURNS trigger AS $func$
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
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ping_events_append_only ON ping_events;

CREATE TRIGGER trg_ping_events_append_only
BEFORE UPDATE OR DELETE ON ping_events
FOR EACH ROW EXECUTE FUNCTION ping_events_no_mutation();

DROP TRIGGER IF EXISTS trg_ping_events_append_only_truncate ON ping_events;

CREATE TRIGGER trg_ping_events_append_only_truncate
BEFORE TRUNCATE ON ping_events
FOR EACH STATEMENT EXECUTE FUNCTION ping_events_no_mutation();
```

Applied from the Oracle host (`ubuntu@129.146.60.17`) via:

```
docker exec -i ping-postgres psql -U ping -d crx_runtime -v ON_ERROR_STOP=1 < trigger-append-only-v2.sql
```

Result: exit 0. Only output was the expected
`NOTICE: trigger "trg_ping_events_append_only_truncate" for relation "ping_events" does not exist, skipping`
from the idempotent `DROP TRIGGER IF EXISTS`.

Reversal (DBA path, documented): drop the two triggers named above. The function can stay;
it is inert without triggers.

## 5. Live verification (exact)

All statements run as role `ping` (the runtime authority) against live `ping_events`
(1,380 rows). Target row used: `e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18`.

1. UPDATE denied:
   `UPDATE ping_events SET event_id = event_id WHERE event_id = 'e34007dd...';`
   Result:
   ```
   ERROR:  ping_events is append-only: UPDATE not permitted (event_id=e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18)
   CONTEXT:  PL/pgSQL function ping_events_no_mutation() line 6 at RAISE
   ```
2. DELETE denied:
   `DELETE FROM ping_events WHERE event_id = 'e34007dd...';`
   Result:
   ```
   ERROR:  ping_events is append-only: DELETE not permitted (event_id=e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18)
   CONTEXT:  PL/pgSQL function ping_events_no_mutation() line 6 at RAISE
   ```
3. Integrity after denials: `SELECT count(*)` = 1380; target row present (count 1).
4. Zero-row predicates: `UPDATE ... WHERE 1=0` and `DELETE ... WHERE 1=0` complete with
   0 rows affected (no trigger fire, nothing to protect); count still 1380.

No TRUNCATE was ever issued against live `ping_events`.

## 6. Disposable verification (production config reproduced)

Probe table `phase9_probe_events` created as role `ping` via
`CREATE TABLE phase9_probe_events (LIKE ping_events INCLUDING ALL)` (owner `ping`,
same constraints/indexes), with both triggers installed using the same function,
then dropped after the run (`pg_tables` confirms 0 afterward).

- INSERT: 1 row inserted. PASS.
- `ON CONFLICT DO NOTHING` re-insert: still 1 row. PASS.
- UPDATE: `ERROR: phase9_probe_events is append-only: UPDATE not permitted (event_id=e34007dd...)`, line 6. PASS.
- DELETE: `ERROR: phase9_probe_events is append-only: DELETE not permitted (event_id=e34007dd...)`, line 6. PASS.
- TRUNCATE inside `BEGIN ... ROLLBACK`: `ERROR: phase9_probe_events is append-only: TRUNCATE not permitted`,
  `CONTEXT: PL/pgSQL function ping_events_no_mutation() line 4 at RAISE`; rollback
  completed; row count still 1. PASS (denial fires before any damage; rollback is belt and suspenders).

## 7. From-scratch initialization test (executed, scratch database)

Because the deployment assembly currently has no wired init hook (section 8), the
init path was proven against a scratch database in the same cluster, which never
touched production data:

1. `CREATE DATABASE phase9_scratch;`
2. `CREATE TABLE ping_events (event_id TEXT PRIMARY KEY);` (stands in for the
   gateway's runtime table bootstrap on a fresh build)
3. Applied `trigger-append-only-v2.sql` verbatim with the runbook pipe command,
   `-d phase9_scratch`: exit 0, both `DROP TRIGGER IF EXISTS` notices as expected
   on first install.
4. Verified both triggers present: `trg_ping_events_append_only`,
   `trg_ping_events_append_only_truncate`.
5. Full matrix: INSERT 1 row; `ON CONFLICT (event_id) DO NOTHING` re-insert still 1 row;
   UPDATE denied (`... UPDATE not permitted (event_id=scratch-evt-001)`, line 6);
   DELETE denied (line 6); TRUNCATE denied inside rolled-back transaction
   (`... TRUNCATE not permitted`, line 4); 1 row intact.
6. `DROP DATABASE phase9_scratch;` confirmed gone from `pg_database`.

## 8. Runbook: where the invariant must live on fresh init

Findings that shape the placement:

- The deployment assembly is `infrastructure/oracle/` in the `oracle-assembly` worktree
  (`/home/nolan/ping/worktrees/oracle-assembly/infrastructure/oracle/`).
- Its `schema.sql` is STALE: it defines `evidence_events`/`witness_store`/etc. and does
  NOT define `ping_events` at all. Nothing in the current assembly creates `ping_events`.
- `docker-compose.oracle.yml` mounts no `initdb.d` directory and neither compose nor
  `bootstrap.sh` applies `schema.sql`. On a fresh build, `ping_events` is created by the
  gateway's own runtime bootstrap code (verified: table exists live, absent from schema.sql).
- Therefore a container-init hook is the WRONG place: the table does not exist when the
  postgres entrypoint would run it. The trigger must be installed as a post-boot step,
  after the gateway has created `ping_events`.

Exact placement instructions (for the commit allowlist; nothing committed by this phase):

1. Add `infrastructure/oracle/append-only-invariant.sql` to the `oracle-assembly`
   worktree: byte copy of `/home/hatch/workspace/ping-overnight/event-boundary/trigger-append-only-v2.sql`.
2. Add a post-boot step to `infrastructure/oracle/bootstrap.sh` (new Step 8, after the
   health-check helper; it must run only after the gateway is healthy, i.e. after its
   runtime bootstrap has created `ping_events`):
   ```bash
   # Step 8: Append-only invariant (TRUNCATE protection included)
   # Runs only after the gateway is healthy so ping_events exists.
   until curl -sf http://localhost:8080/health >/dev/null; do sleep 5; done
   docker exec -i ping-postgres psql -U "${POSTGRES_USER:-ping}" -d "${POSTGRES_DB:-crx_runtime}" \
     -v ON_ERROR_STOP=1 < "$PING_ROOT/infrastructure/oracle/append-only-invariant.sql"
   ```
   (Adapt `$PING_ROOT` to wherever the assembly is checked out on the target host;
   on Oracle today the compose project dir is the releases tree holding
   `infrastructure/oracle/`.)
3. Verification block for the runbook (run after step 8; all read-only except the
   disposable probe, which is dropped):
   ```sql
   SELECT tgname FROM pg_trigger
   WHERE tgrelid = 'ping_events'::regclass AND NOT tgisinternal ORDER BY tgname;
   -- expect: trg_ping_events_append_only, trg_ping_events_append_only_truncate
   ```
   plus the probe-table denial matrix from section 6 (create probe, INSERT, ON CONFLICT,
   UPDATE/DELETE/TRUNCATE denials, drop probe).
4. Note in the runbook that `infrastructure/oracle/schema.sql` is stale relative to the
   live schema and is NOT the install path for this invariant.

## 9. Residuals and follow-ups (not done in this phase)

- Role `ping` remains a superuser and table owner; it can `DROP TRIGGER`. The trigger
  blocks every casual application-path mutation (the actual threat: gateway bugs,
  runaway workers, mistaken operator commands as the runtime role). A least-privilege
  runtime role is a separate, larger track (new role, grant migration, gateway
  reconnect, container recreate) and needs Nolan's call.
- `infrastructure/oracle/schema.sql` staleness is pre-existing (it never defined
  `ping_events`); flagged for the drift-reconciliation decision, not changed here.
- Playbook revision `194a2b85bde957ed` untouched. Gateway and Qdrant containers
  untouched (gateway `/health` 200 after the work; all three containers healthy).
- `ping-oci-queue.timer` not enabled. No Git operations performed.

## 10. Constraints honored

No commit, push, merge, reset, history rewrite, branch deletion, or worktree cleanup.
No destructive database operations: no TRUNCATE/DELETE/UPDATE ever succeeded against
live data; the only writes were DDL (trigger install), a disposable probe table
(created and dropped), and a scratch database (created and dropped). No credential
value printed or written anywhere; the DB password was never needed (all psql ran via
`docker exec` as the container-local `ping` role). No em dashes in this report.
