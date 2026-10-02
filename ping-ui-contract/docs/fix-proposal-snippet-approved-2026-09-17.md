# Reviewed fix proposal: SNIPPET_APPROVED ordinary-path dispatch

**Status:** PROPOSAL, reviewed. Not applied. Requires an authorized host with backend worktree access. No commit without Nolan's explicit word (Phase D commit allowlist).

## Evidence of the defect

- The gate logic is PROVEN: KnowledgePromoter.handle() flips a candidate node to `approved` with confidence 1.0, verified live through an in-container harness against real deployed code and real Postgres (playbook/REPORT.md Phase 11).
- The ordinary production route is broken: `SNIPPET_APPROVED` is in neither `EVENT_MISSION_MAP` nor `MISSION_WORKER_MAP`, so the normal runtime cannot dispatch to the promoter (evidence-question-answers-2026-09-17.md:42; playbook/REPORT.md finding 2/3, "Proven by code inspection"). The only proven path today is the harness invocation, not the HTTP event or scheduler path.
- Classification: P0. Every component exists and tests green; the route A -> B -> C does not.

## Exact files

1. `ping-runtime/orchestration/event_to_mission_bridge.js` (contains EVENT_MISSION_MAP; bridge subscribes to all map types at :96-100, creates one mission per event at :104-138). NOTE: this file was never captured to this host; full literal map contents are UNVERIFIED here.
2. `ping-runtime/orchestration/mission_scheduler.js` (contains MISSION_WORKER_MAP, fully captured: drift-sources/mission_scheduler.js.live-20260917:41-76). `KNOWLEDGE_PROMOTE` is absent from both the live capture and the HEAD-099927152 baseline. The map's doc-contract (:27-43) declares it is labeling/assignment metadata only; canonical execution routing is WorkerRuntime.dispatch().

## Precise diff

File 1, in EVENT_MISSION_MAP (insertion point UNVERIFIED; place adjacent to the other pipeline-chain entries):

```diff
+  SNIPPET_APPROVED: { missionType: 'KNOWLEDGE_PROMOTE', priority: 2 },
+  SNIPPET_REJECTED: { missionType: 'KNOWLEDGE_PROMOTE', priority: 2 },
+  AI_RESPONSE_ACCEPTED: { missionType: 'KNOWLEDGE_PROMOTE', priority: 2 },
+  AI_RESPONSE_REJECTED: { missionType: 'KNOWLEDGE_PROMOTE', priority: 2 },
```

File 2, in MISSION_WORKER_MAP under `// Knowledge missions` (:52-53):

```diff
   // Knowledge missions
   KNOWLEDGE_EXTRACT: 'observation',
   KNOWLEDGE_INDEX: 'projection',
+  KNOWLEDGE_PROMOTE: 'knowledge-promotion',
```

## Why surgical

- The maps are the documented dispatch configuration seam; no handler logic changes. The worker, the promoter, the dispatch loop, and the bridge's _handleEvent are untouched. The phase-5 trace confirms "no new worker or dispatcher was needed" (phases3-6/PHASES3-6_P0_FIXES_2026-09-17.md:89-91).
- The `knowledge-promotion` worker (KnowledgePromoter) is already registered for the four approval event types and the scheduler dispatches on the original business event_type (phases3-6:89-91).
- No loop hazard: the promoter emits no SNIPPET_* events (canonical downstream evidence is the mission completion record, phases3-6:114-117).
- Idempotency is structural: mission ids are sha256(missionType:event_id)[0:16] with ON CONFLICT DO NOTHING (drift-sources/mission_runtime.js.live-20260917:74-84); re-emitting an approval cannot double-promote.
- The human-approval security property is unchanged: approval events still require the established authenticated /events action; the maps only route arrivals (phases3-6:99-100).
- Acceptance receipts already exist: approval event b6816f11... -> bridge log `SNIPPET_APPROVED -> mission 6e8c020c8abbb9f9 (KNOWLEDGE_PROMOTE)` -> mission completed -> node approved at confidence 1.0 (phases3-6:103-112). Verification is a replay of a known-good experiment, not new design.

## Caveat

A phase-5/6 hunk adding exactly these entries exists as uncommitted branch work plus a live-Oracle deploy (phases3-6 report). The live-container capture at 2026-09-17 05:40 MDT predates or lacks it, so canonical-branch status is "absent". Before applying, diff the working tree: the hunk may already be present in the branch working copy.

## Application route

Cannot be applied from the cloud host. Apply in the backend worktree on an authorized host with backend access (`/home/nolan/ping`, branch constitutional-convergence-v2, where the phase-5/6 hunks already live) as two one-line map hunks. No commit without Nolan's explicit word. After landing: redeploy via the established release-tree mechanism (release tree edit + docker compose up -d --build gateway, gateway only, per event-boundary/REPORT.md), then verify by replaying the phase-5 receipt (SNIPPET_APPROVED -> KNOWLEDGE_PROMOTE mission completed -> node approved, deterministic mission id predicted exactly).
