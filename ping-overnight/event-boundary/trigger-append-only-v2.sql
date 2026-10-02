-- PING append-only enforcement v2 (Phase 9, 2026-09-17)
-- Extends trigger-append-only.sql (v1, Agent A, 2026-09-16): v1 covered
-- UPDATE/DELETE only. v2 adds TRUNCATE coverage and reuses the same
-- trigger function for any table (message now names TG_TABLE_NAME).
--
-- Apply on a live Oracle host from the compose project dir, e.g.:
--   docker exec -i ping-postgres psql -U ping -d crx_runtime -v ON_ERROR_STOP=1 < trigger-append-only-v2.sql
-- (pipe this file into the container's psql stdin)
--
-- Additive and reversible:
--   DROP TRIGGER trg_ping_events_append_only_truncate ON ping_events;
--   DROP TRIGGER trg_ping_events_append_only ON ping_events;
-- Re-apply after any from-scratch DB rebuild (not part of the container image).
--
-- Verified 2026-09-17: UPDATE/DELETE/TRUNCATE rejected with zero row change;
-- INSERT and ON CONFLICT idempotent replays unaffected.
--
-- Documented residual (accepted): role ping is table owner AND superuser, so
-- REVOKE-based privilege hardening is a no-op against it and the owner can
-- DROP TRIGGER. The trigger blocks every casual application-path mutation;
-- deliberate bypass requires an explicit DROP TRIGGER plus reissue (DBA path,
-- auditable). A future least-privilege runtime role is a separate track.
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
