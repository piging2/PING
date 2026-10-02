# Transition log (I4) — spec for P-20260923-099

Date: 2026-09-23 (swarm-05). Status: SPEC, no diff. Coordinator decision required
on the storage form (M1 events vs a `knowledge_transitions` table).

## Problem (from CONVERGED-PIPELINE.md I4)

Corrections are events first, projections second. Today the promoter's
`updateNodeBySourceEvent` overwrites `status`/`confidence` in place: prior
lifecycle states are lost (only `updated_at` moves). The correction *signal*
survives in M1 (`SNIPPET_APPROVED`/`SNIPPET_REJECTED` rows), but the
materialized M2 row cannot prove its own history. Correction survival is
convention-only, not replayable.

## Recommended form: KNOWLEDGE_TRANSITIONED events in M1 (zero new tables)

Rationale: no new store, no new authority; consistent with the converged
pipeline's "corrections are events first" and with M1's existing role as the
append-only source truth. The alternative (a `knowledge_transitions` table)
is a second lifecycle store and needs a writer-ownership decision; the
coordinator makes that call.

### Event shape

- `event_type`: `KNOWLEDGE_TRANSITIONED`
- `source`: `knowledge-promoter`
- `namespace`: the node's namespace (tenant boundary preserved)
- `payload`:
  - `node_id` (string, required)
  - `from_status`, `to_status` (strings from the status taxonomy, required)
  - `from_confidence`, `to_confidence` (number|null, required; null is a value)
  - `actor` (string, required: the human/owner identity behind the transition)
  - `reason` (string, optional: e.g. "owner correction", "re-promotion")
  - `supersedes_node_id` (string, optional: for the SUPERSEDED transition —
    links the superseded node to its replacement; the superseding node's own
    transition carries the forward link)
  - `schema_version`: `"1.0.0"`
- Identity: deterministic `event_id` over
  `{eventType, source, namespace, node_id, to_status, to_confidence, actor}` —
  the same human decision re-emitted yields the same event (idempotent,
  consistent with M1's content-identified design). The timestamp orders
  transitions; identity never depends on it.

### Emission point

Inside the promoter's lifecycle-write path (`updateNodeBySourceEvent`):
emit the `KNOWLEDGE_TRANSITIONED` event FIRST, then apply the row update.
Events first, projections second. If emission fails, the row update must not
proceed (fail closed: a transition with no event is exactly the unprovable
state we are removing).

### Reduce semantics (the replay proof)

The materialized node row is a pure function of the ordered transition
events for its `node_id`:

```
state(node_id) = fold(ordered KNOWLEDGE_TRANSITIONED events for node_id,
                      initial = OBSERVED/UNKNOWN,
                      apply = take to_status/to_confidence of last event)
```

Rules:
- Out-of-order delivery resolves by event timestamp, then by event_id
  (deterministic tiebreak).
- Duplicate re-emission (same event_id) is a no-op (M1 `DO NOTHING`).
- A re-emission that is NOT a transition event (e.g. the graph-projection
  subscriber's `addNode` conflict path, P0-fixed) can never alter lifecycle
  state: it is not in the transition event set.
- Backward transitions (e.g. VERIFIED -> OBSERVED) are rejected unless the
  event carries an explicit human-correction marker (`reason` starting with
  `correction:` and a non-empty `actor`). "No transition may move backward
  except through an explicit human correction event" (status taxonomy).

### Coordination with P-20260923-009 (swarm-14, bitemporal supersession)

009 owns the store-side representation (`src/tenanos/memory/invalidation.ts`,
bitemporal memory). This spec owns the event/replay level for the M2
lifecycle. The seam: the `supersedes_node_id` link in the transition event
is the input 009's bitemporal model consumes; 009 must not invent a second
transition vocabulary. No duplication: one event vocabulary, one store
mechanism, different layers.

## I4 acceptance test (for the writer)

1. Emit transitions for a node: candidate -> approved (actor: owner) ->
   rejected (actor: owner, reason: correction:wrong-approval).
2. Replay the transition events out of order, with a duplicate of the first
   event and an interleaved non-transition re-emission (graph-projection
   `addNode` conflict).
3. Assert: final reduced state == last human transition (rejected, 0.2);
   assert the full ordered history is recoverable from M1 alone.
4. Assert: a backward transition without a correction marker is rejected.

## What the coordinator must decide

1. M1 `KNOWLEDGE_TRANSITIONED` events (recommended: zero new tables, zero
   new authorities) vs a `knowledge_transitions` table.
2. Whether the promoter gains the emit-then-update ordering as a hard
   gate (fail-closed on emission failure) or a best-effort side emission.
3. Backfill policy for pre-log transitions: none required (M1 already holds
   the SNIPPET_APPROVED/REJECTED signals; the log starts at landing).
