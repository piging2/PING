-- MC-1 harness schema: the legacy ingress surface.
--
-- canonical_events is the UPSTREAM INGRESS STORE / LEGACY INGRESS SURFACE.
-- It is NON-CANONICAL UNTIL CONVERGED: rows here become canonical only after
-- the LegacyIngressAdapter carries them through UnifiedEventRuntime.emit()
-- into ping_events. This DDL is the exact table definition the 2026-09-18
-- MC-1 certification ran against (verbatim from the attested cert script).
--
-- ping_events is NOT created here: UnifiedEventRuntime.initialize() creates
-- and owns it, exactly as in production bootstrap.
--
-- Applied by setup.sh against a scratch database only. Never against
-- production crx_runtime.

CREATE TABLE canonical_events (
  event_id uuid NOT NULL PRIMARY KEY,
  event_type varchar NOT NULL,
  event_version varchar NOT NULL,
  tenant_id varchar NOT NULL,
  timestamp timestamptz NOT NULL,
  sequence bigint NOT NULL,
  source varchar NOT NULL,
  actor varchar NOT NULL,
  causation_id uuid NULL,
  correlation_id uuid NULL,
  payload jsonb NOT NULL,
  metadata jsonb NOT NULL,
  processed boolean NULL,
  processed_at timestamptz NULL,
  worker varchar NULL,
  retries integer NULL,
  last_error text NULL,
  created_at timestamptz NULL
);
