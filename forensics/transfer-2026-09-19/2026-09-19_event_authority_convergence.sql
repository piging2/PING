-- ============================================================================
-- Additive convergence migration: event authority convergence Phases 3/4/5
-- Date: 2026-09-19
--
-- Governing law: "Refactor authority, preserve mechanism." ONE DECISION ->
-- ONE OWNER. ONE LOGICAL EVENT -> ONE CANONICAL IDENTITY. ONE AUTHORITATIVE
-- RUNTIME COMMIT. MANY PRESERVED REPRESENTATIONS.
--
-- This migration is ADDITIVE and REVERSIBLE:
--   - No rows are modified, deleted, or rewritten. No historical identities change.
--   - New columns are NULLABLE so pre-convergence rows remain valid untouched.
--   - Every statement is idempotent (safe to re-run; envelope initialize()
--     applies this file on every boot).
--   - Reversal = DROP the added columns/indexes (historical data unaffected).
--
-- Identity roles after this migration (see also Phase 4):
--   canonical_events.event_id
--     Row identity. ERA-DEPENDENT, documented per era:
--       * ingress era (pre-convergence): the ingress UUID (UUID v5 minted by
--         the old envelope path, or producer-supplied). Historical; never rewritten.
--       * converged era (UER-first derivation): the canonical logical identity
--         carried from the authoritative commit (event_<16hex> from
--         IdentityAuthority via UnifiedEventRuntime). Carried, never reminted.
--     Widened UUID -> TEXT so converged-era rows can carry event_<16hex>
--     identities. All historical UUIDs remain valid verbatim as text.
--   canonical_events.envelope_id (UUID, NULL for historical rows)
--     Identity of the CERTIFIED REPRESENTATION (this row as an envelope
--     artifact), deterministic UUID v5 derived from the canonical identity.
--     NEVER presented as the logical event's identity.
--   canonical_events.source_event_id (TEXT, NULL for un-converged ingress rows)
--     EXPLICIT cross-reference to the authoritative commit in
--     ping_events.event_id. Populated by envelope derivation
--     (acceptCanonicalEvent) and by legacy-ingress convergence
--     (LegacyIngressAdapter._markAccepted). Round-trip is deterministic both
--     directions by explicit identity: ping_events.event_id <->
--     canonical_events.source_event_id. No timestamp/payload/sequence joins.
-- ============================================================================

-- 1. Widen event_id UUID -> TEXT (preserves every historical UUID verbatim).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canonical_events'
      AND column_name = 'event_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE canonical_events
      ALTER COLUMN event_id TYPE TEXT USING event_id::text;
  END IF;
END
$$;

-- 2. Relax sequence NOT NULL: derived rows carry the canonical log position
--    when known (NULL when the commit had no pool/sequence). Legacy rows
--    always have a value; none are modified.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canonical_events'
      AND column_name = 'sequence'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE canonical_events ALTER COLUMN sequence DROP NOT NULL;
  END IF;
END
$$;

-- 3. envelope_id: certified representation identity (Phase 4).
ALTER TABLE canonical_events
  ADD COLUMN IF NOT EXISTS envelope_id UUID;

-- 4. source_event_id: explicit cross-reference to ping_events.event_id (Phase 5).
ALTER TABLE canonical_events
  ADD COLUMN IF NOT EXISTS source_event_id TEXT;

-- 5. One canonical event -> at most one derived representation row.
--    Partial index: NULLs (pre-convergence ingress rows) are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_canonical_events_source_event_id
  ON canonical_events (source_event_id)
  WHERE source_event_id IS NOT NULL;

-- 6. Lookup of a representation by its representation identity.
CREATE INDEX IF NOT EXISTS idx_canonical_events_envelope_id
  ON canonical_events (envelope_id)
  WHERE envelope_id IS NOT NULL;

-- 7. Era documentation on the columns themselves.
COMMENT ON COLUMN canonical_events.event_id IS
  'Row identity, era-dependent. Ingress era (pre-convergence): the ingress UUID, historical and never rewritten. Converged era (UER-first): the canonical logical identity carried from the authoritative commit (event_<16hex>), never reminted by the envelope.';
COMMENT ON COLUMN canonical_events.envelope_id IS
  'Identity of the CERTIFIED REPRESENTATION (UUID v5 derived deterministically from the canonical identity). Never presented as the logical event identity. NULL for pre-convergence rows.';
COMMENT ON COLUMN canonical_events.source_event_id IS
  'Explicit cross-reference to the authoritative commit in ping_events.event_id. Populated by envelope derivation (acceptCanonicalEvent) and legacy-ingress convergence. NULL for ingress rows not yet converged. Round-trip: ping_events.event_id <-> canonical_events.source_event_id.';

-- 8. Era documentation: receipt vs constitutional semantics per column.
--    Standing distinctions (never collapsed): receipt_order != canonical event
--    sequence; receipt timestamp != constitutional acceptance timestamp;
--    envelope_id != canonical event_id.
COMMENT ON COLUMN canonical_events.sequence IS
  'Era-dependent ordering. Ingress era: RECEIPT ordering (per-tenant MAX(sequence)+1), never the canonical order. Converged era: the canonical log position allocated by PostgreSQL at the authoritative commit (UER acceptance). The era marker (metadata.envelope.era) says which semantics a row carries.';
COMMENT ON COLUMN canonical_events.timestamp IS
  'Era-dependent. Ingress era: RECEIPT timestamp (when the envelope receipted the row). Converged era: the constitutional acceptance timestamp assigned by UnifiedEventRuntime at acceptance.';
COMMENT ON COLUMN canonical_events.tenant_id IS
  'Era-dependent. Ingress era: tenant CLAIM as supplied by the producer (unverified at receipt; the adapter resolves the canonical namespace separately at convergence). Converged era: the canonical namespace (tenant::<id> | core::system) resolved at the UER acceptance choke point, carried verbatim.';
COMMENT ON COLUMN canonical_events.actor IS
  'Actor CLAIM (producer-supplied, unverified). No constitutional principal exists on UER events (F3 frozen finding); converged rows record the claim when present, otherwise unspecified.';
