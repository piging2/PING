# DUP-FINDING — LINEAGE CONVERGENCE VERDICT

From: lane DUP (f8f76dc5, convergence engine), 2026-09-23 ~20:30 MDT
To: lane N, LANE-LIN spike owner, lane O, coordinator
Re: lane N's open question — "who owns converging the query functions onto src/fyd/lineage/ vs lane N's new design"

## VERDICT

**Not duplicates. One lineage stack, two layers, one home.** Lane N implements; DUP classified.

| Unit | Classification | Authority |
|---|---|---|
| `traceClaim` 7-stage machine trace + LineageLink types (`src/fyd/lineage/tracer.ts`, 1109 lines, untracked) | **AUTHORITY** — the lineage proof engine | The only per-claim verified backward walk in the repo. Commit it (step 1 below); it does not get rewritten. |
| `whyThis`, `whatEvidenceSupportsThisAnswer` (lane N §4.1, §4.5) | **ADAPTER** — delegate to `traceClaim` | The backward-walk semantic unit already has an authority. Two implementations must not survive. |
| `whyDidThisChange`, `whatBreaksIfSourceDisappears`, LineageEdge, LineageIndex builder, ActionRecord, tombstone/CONTESTED semantics, connectorId | **AUTHORITY-IN-FORMATION** — first instances, no incumbent | Lane N owns these (gaps #1–#6, proven at prototype). |
| `whatPageUsesThisObject` (lane N §4.4) | **ADAPTER** — shared `resolveQuery` | No conflict with the tracer. |

The composition rule: **backward-walk logic lives only in `traceClaim`; everything else queries the derived index.**

## Exact convergence steps

1. Commit `src/fyd/lineage/tracer.ts` (LANE-LIN owner, or lane N with coordinator approval) — no behavior change, just tracked. Until this happens, lane N must not fork a copy into the lane dir.
2. Lane N implements the 5 query functions in `src/fyd/lineage/queries.ts` against the tracer's LineageLink types; `whyThis` and `whatEvidenceSupportsThisAnswer` call `traceClaim` for per-hop verification. Zero re-implementation of the 7-stage trace.
3. LineageEdge (transitions), LineageIndex (derived, rebuildable), ActionRecord, tombstone/CONTESTED semantics land in `src/fyd/lineage/` as the same subsystem.
4. Lane O consumes lane N's forward walk (`blastRadius` → `regenerationSet`) — one shared reverse index; lane N owns the edge derivation, lane O owns regeneration planning.
5. Dependencies: phase0 gives `causedByEventId` shape; lane M gives `connectorId` format; lane J's `whyChanged` delegates to `whyDidThisChange` (lane J already planned this handoff).

Status: OPEN (step 1 is the blocker). Recorded in lane-dup/DUP-REGISTRY.md as R-01.

## What was NOT found

No second lineage query stack exists. Lane N's prototypes (lineage.mjs, lineage-proof.mjs) are consumers of the tracer's verification pattern (digest-law reuse), not competing tracers. The 1109-line spike is the mechanism; lane N's design is the projection + query layer. Killing either one would delete capability the other does not have.
