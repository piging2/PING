# INTEGRATION-REQUEST — LANE N (data lineage)

To: LANE-LIN spike owner (src/fyd/lineage/), lane O, lane M, phase0
From: lane N — 2026-09-23 ~19:55 MDT
Status of lane N: PROVEN at prototype level (see STATE.md ledger)

## What is proven (lane dir, no repo writes)
- `prototype/lineage.mjs` — schema-true worked-example scenarios (rewrite, conflict, pre-lineage gap, tombstone, ACTION link), 5 query functions, red-team self-checks green.
- `prototype/lineage-proof.mjs` — REAL Coppersmith ids from the LANE-LIN verify-test expectations, real sha256 digests, backward walk ANSWER→SOURCE (identity+hash+timestamp per hop), forward walk (blast radius → regenerationSet), source-change simulation (supersede chain, old chain intact), red-team R1–R5 green (forgery→missing verdict, expiry→typed gap, cross-tenant→scoped, secrets→absent, pre-lineage→no invention).

## Requests (not writes — owners decide)
1. **LANE-LIN spike owner**: converge the proven query functions (whyThis, whyDidThisChange, whatBreaksIfSourceDisappears, whatPageUsesThisObject, whatEvidenceSupportsThisAnswer) onto the spike's LineageLink types once `src/fyd/lineage/` is committed. Lane N does not duplicate the tracer; the query layer is a consumer of it. Open question from the design: who owns this convergence — lane N or DUP?
2. **Lane O**: the forward walk (`blastRadius` → `regenerationSet`) is your dependency-index input. Same index, shared derivation (journal + observations + SiteSpec). Coordinate so we do not build two reverse indexes.
3. **Lane M**: confirm `connectorId` registry key format (`<provider>-<surface>`, e.g. `facebook-graph`) before acquisition records start carrying it. Lineage carries the key only — never tokens (lane L boundary).
4. **Phase0**: `causedByEventId` on every LineageEdge must match the canonical event-id shape; pending your WHO-CREATES-EVENT-ID answer. Until then, lineage edges on pre-authority data carry `gap` (LINEAGE_GAP), never forged ids.

## Constraints both sides must hold
- Lineage is a derived projection (index digest + builtFrom), never a second authority; the index is rebuildable from journal + observations and dies without mourning.
- Missing links are first-class typed gaps with `needed`; never synthesize, never backfill silently.
- No customer bytes, no secrets in lineage records — hashes and pointers only.

## What lane N still needs to prove in-repo (read-only)
Run the proof walk against real pipeline fixtures (pinned raw bytes + persisted observations + real projections) to replace the synthetic supporting records in `prototype/lineage-proof.mjs`. Needs: read access to the LANE-LIN fixture paths on the Pig (no repo writes).
