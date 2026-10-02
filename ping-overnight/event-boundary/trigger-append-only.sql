-- PING append-only enforcement (Agent A, 2026-09-16)
-- Applied live on Oracle ping-postgres/crx_runtime ~20:36 MDT via:
--   docker exec -i ping-postgres psql -U ping -d crx_runtime -v ON_ERROR_STOP=1 < trigger-append-only.sql
-- Additive and reversible: DROP TRIGGER trg_ping_events_append_only ON ping_events;
-- Re-apply after any from-scratch DB rebuild (not part of the container image).
-- Verified: UPDATE/DELETE rejected with zero row change; INSERT, ON CONFLICT
-- idempotency, and traversal unaffected.
CREATE OR REPLACE FUNCTION ping_events_no_mutation()
RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION
    'ping_events is append-only: % not permitted (event_id=%)',
    TG_OP,
    COALESCE(OLD.event_id, NEW.event_id);
  RETURN NULL;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ping_events_append_only ON ping_events;

CREATE TRIGGER trg_ping_events_append_only
BEFORE UPDATE OR DELETE ON ping_events
FOR EACH ROW EXECUTE FUNCTION ping_events_no_mutation();
