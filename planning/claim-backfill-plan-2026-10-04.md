# Claim backfill plan — 18 historical CLAIM_CREATED events (BOUNDED, NOT EXECUTED)

Status: PLAN ONLY. Read-only live enumeration completed 2026-10-04 ~20:15 MDT
(SELECT queries only, zero database writes; no projection run, no backfill).
Execution of the live run requires Nolan's explicit authorization. The
backfill itself is a production write and stays parked until he says go.

## What this is

The claim-projection lane found 18 CLAIM_CREATED events in the live event
spine with zero consumers: no claims table exists and the knowledge graph had
no claim nodes or SUPPORTED_BY edges. The live wiring is now proven
(`ping-runtime/knowledge/claim_wiring_live.test.js`, 2/2 green, falsifiable):
new CLAIM_CREATED events project through `registerCanonicalWorkers` at the
gateway composition site. This plan covers only the 18 historical events.

Prerequisite (Nolan's call, open decision #1): the claim-projection worker
currently lives only on branch `orca-c/claim-projection` in the Pig worktree.
The served branch must carry it before backfill, otherwise new claims still
will not project after the backfill runs.

## The 18 exact event IDs

Enumerated read-only on 2026-10-04 ~20:15 MDT against live `crx_runtime`
(via `docker exec ping-postgres psql -U crx_user -d crx_runtime`, SELECT-only,
from Pig WSL through `~/workspace/bin/pigwsl-exec` — the same table the
projector's own `readEvent` queries; zero writes made). Count verified: exactly
18. Every row carries `payload.upstreamEventId`.

| # | event_id | timestamp (UTC) | namespace | upstreamEventId |
|---|----------|-----------------|-----------|-----------------|
| 1 | 052ec0a2b16814515a572fe32fd98e5f36366d95ba1cf6585e8bef5b711d6496 | 2026-09-16 17:50:29.963 | tenant::hpp | 365ed89810a69cc3fee178ff905544fe2d941b850fc64314554da0c2791fc6bb |
| 2 | 05d2216a1d3de9fbb4233f6c00409604d51f5f1ae7f8229d46b29edea5a77419 | 2026-09-16 17:50:24.962 | tenant::hpp | 63848c2c2913ad91209cefafb9e563247ef7dbb1282d1f840603e683592ce97a |
| 3 | 25595abf39aa03743a5fef272ddd038109bc2194c832deb84e276631a6c62441 | 2026-09-16 17:50:44.912 | tenant::hpp | 756a5aee4343926138120f15a35b94bbf398598fcd2132042fb918b310890355 |
| 4 | 2c12683b21ede58860fde7259bb09a6f393f39454aa8b21b63c8fa85864a81e0 | 2026-09-16 17:50:39.963 | tenant::hpp | ca9842085bc39c3892abe72e93281d5f0fec1e7e1ca0ff9611ad7a197ff77e0b |
| 5 | 4682b7145ce748e9c556864e87b0d338e4bbe6dee0c410d253ae520ec7fe9e29 | 2026-09-16 17:50:34.864 | tenant::hpp | 806ec7648750d88630f07574b773b5341fdb46bd135e53a93fd53098ecb8b466 |
| 6 | 4e5d450ad041fb3b8b59f35729d2abe938dfef5aed51c9560dacc82512442baa | 2026-09-16 17:50:34.959 | tenant::hpp | c7c2da0876fd32730477d93e6e28127104a2e1b89bbacef042c7bc90edc449b9 |
| 7 | 61b0a1231e64dcfe36002b465d228ec4afbe887904fcad07c108f385e8498f57 | 2026-09-16 17:50:24.913 | tenant::hpp | 7b08ea6729092ab28f87fe71b4e972c374d304f006e4acf7e93f348772148f23 |
| 8 | 6eab43ccead20b12cc8d8560af2aa2129350b17020c5f85c00f9d524a142e09b | 2026-09-16 17:51:44.926 | tenant::hpp | c5535c3a609cbca0291f6ab3e1d28b9fa122c84ee34004c25e52a4e87f863ca6 |
| 9 | 74669513a65a7965494b35922a76f0d8ec282681c9e709c4c688387e7dfca74f | 2026-09-16 17:50:44.959 | tenant::hpp | 05da34ba08ed1a259e1dd53a9353b4feb98c9447ec6441eb0b459da8c1a0ebea |
| 10 | 877e69f76bbce513165772b45ef654cbec6ec80e8bdf54421745ee9179d25666 | 2026-09-16 17:50:29.863 | tenant::hpp | d71e2e2cbab95cbc3199cc39bb36a0e93f03c0d1c6fd4d0c7b4001bdf96f07b5 |
| 11 | 9f3f36e38795379b85ff44d9f6f38becc772d370152c699f7050291fe0f48d3c | 2026-09-16 17:50:29.914 | tenant::hpp | 6bc6f3ed6b76fe3897a2da5bc5acf2752eb1a0b310bf01c9c06a500c918d1bce |
| 12 | a6afb27023cd6f8302439dc9101c7257ed41f86f1d7efbb3dea7e25de3f6953d | 2026-09-16 17:50:39.913 | tenant::hpp | ed83da3d3732658d9568804f22788ad7b9a7650cfa5feece37df3062a2676d24 |
| 13 | b9ee29306842264345ce57b34ed3f705f13b6a1b9b04eece02af3c3f5d401dd5 | 2026-09-16 17:50:39.863 | tenant::hpp | 36f30626d2fc2965f232adb822f222f3f208d7fb132bbd0619d8426616f6e4b1 |
| 14 | c3200a2ddc3e98218ced48d8b2ffb1f74137bae57f5be455c3fd3c7cf75e43f8 | 2026-09-16 17:50:24.862 | tenant::hpp | 87fce860f2f0ea3de8e1880357231eb5722de34396e575b21373201f51d74809 |
| 15 | cd0ac02dd3237750d126bb96c0c1e00067112f67f1eea5f160412f066bbc3f60 | 2026-09-16 17:53:49.882 | core::owner | acd26e2d16ad07cbcdb3e56bfd01a90c082f4570db2a80b6367c508cfdec5b72 |
| 16 | ea1976038d49b543df23f90f524f3b9b2c4b7ae99c010e7de5cbefaf4b81c49e | 2026-09-16 17:51:44.872 | tenant::hpp | ead473e006c178556a10e93ac5f941e8b354f466a556b16d7776143b64b5bd7c |
| 17 | ecbc660f226a809688fec064d44886cc2bd59f0fe12c5a18b6320ea1d203ad4a | 2026-09-16 17:50:44.864 | tenant::hpp | 2184b9d87118e33ca1511e9bb8a56b5d35aff5f867859c3a58a5fcb405381265 |
| 18 | fdc95f937feb9119f519fb388d9f7494be74256bfac4c302a6f3d483256bf746 | 2026-09-16 17:50:34.911 | tenant::hpp | 1ef158c54453e26a6a85bfc4c539e2eb296ffe2b32cd42da9f48b1968470dd6b |

Notes: 17 events in namespace `tenant::hpp`, 1 in `core::owner`
(cd0ac02dd3237750d126bb96c0c1e00067112f67f1eea5f160412f066bbc3f60).
All timestamps within 2026-09-16 17:50–17:54 UTC.

Enumeration query (read-only, this is exactly what was run):

```sql
SELECT count(*) FROM ping_events WHERE event_type='CLAIM_CREATED';
SELECT event_id, timestamp, namespace, payload->>'upstreamEventId' AS upstream_id
FROM ping_events
WHERE event_type = 'CLAIM_CREATED'
ORDER BY event_id;
```

If a future re-run returns a count other than 18, STOP and re-scope: this
plan is bounded to exactly the enumerated set above, no discovery, no new
events.

## Current graph baseline (captured 2026-10-04 ~20:15 MDT, read-only)

| metric | baseline |
|---|---|
| `knowledge_nodes` total | 68 |
| `knowledge_edges` total | 0 |
| `knowledge_nodes` where `node_type = 'claim'` | 0 |
| `knowledge_edges` where `edge_type = 'SUPPORTED_BY'` | 0 |
| nodes with `node_id LIKE 'claim:%'` or `'event:%'` | 0 |

Zero prior claim projection artifacts: the backfill is starting from a clean
slate. Expected post-run: claim nodes = 18, SUPPORTED_BY edges = 18 (all
upstreams resolve, see below).

```sql
SELECT count(*) FROM knowledge_nodes WHERE node_type = 'claim';
SELECT count(*) FROM knowledge_edges WHERE edge_type = 'SUPPORTED_BY';
SELECT count(*) FROM knowledge_nodes
  WHERE data->>'projected_by' = 'claim-projection';
```

Record the three numbers. Post-run deltas must match the expected counts below.

## Idempotency proof (code-level, no live run needed)

- Claim node id is deterministic: `claim:<event_id>`. `addNode` runs
  `ON CONFLICT (node_id) DO UPDATE` touching only data/namespace/status/
  correlation_id/confidence_provenance/updated_at. Re-running never duplicates.
- Evidence node id is deterministic: `event:<upstream_event_id>`. Same
  upsert semantics.
- Edge id is deterministic: `sha256("<claimNodeId>:<evidenceNodeId>:SUPPORTED_BY")`
  sliced to 16 hex chars, `ON CONFLICT (edge_id) DO NOTHING`.
- `ClaimProjector.handle` refuses (does not fabricate) when `event_id` is
  missing, and projects the claim node WITHOUT the edge when the upstream
  event cannot be resolved, recording `evidence_resolved: false` honestly.

Consequence: the backfill is safely re-runnable. The worst case of a double
run is refreshed node data, never duplicate nodes or edges.

## Expected nodes/edges (bounded, verified read-only 2026-10-04)

Dry resolution check (no projection writes):

```sql
SELECT count(*), count(DISTINCT c.event_id)
FROM ping_events c
LEFT JOIN ping_events u ON u.event_id = c.payload->>'upstreamEventId'
WHERE c.event_type='CLAIM_CREATED' AND u.event_id IS NULL;
-- result: 0, 0 -> every upstreamEventId resolves to a live ping_events row

SELECT u.event_type, count(*)
FROM ping_events c
JOIN ping_events u ON u.event_id = c.payload->>'upstreamEventId'
WHERE c.event_type='CLAIM_CREATED' GROUP BY 1;
-- result: OBSERVATION_CREATED | 18
```

All 18 upstream events exist and are all `OBSERVATION_CREATED`, so every
event will produce the full triad: claim node + evidence node + edge.
Bounded exactly:

- 18 claim nodes `claim:<event_id>` — one per enumerated event.
- 18 evidence nodes `event:<upstream_id>` + 18 `SUPPORTED_BY` edges.
- Zero `evidence_resolved: false` cases expected.

Per event, bounded by what the event carries:

- 1 claim node `claim:<event_id>` — ALWAYS (18 max).
- 1 evidence node `event:<upstream_id>` + 1 `SUPPORTED_BY` edge — ONLY when
  `payload.upstreamEventId` resolves to a real `ping_events` row.
- Events with no `upstreamEventId` or an unresolvable one: claim node only,
  `evidence_resolved: false` in node data. No edge fabricated. (None of the
  18 fall in this class.)

Upper bound: 18 claim nodes, 18 evidence nodes, 18 edges. The dry run below
produces the exact split before anything touches live.

## Dry run (no live writes)

1. Read-only: copy the 18 event rows plus every referenced upstream
   `OBSERVATION_CREATED` row into scratch (same shape as
   `claim_projection_e2e.proof.js`).
2. Seed an empty graph (PGlite or scratch PG), run each of the 18 events
   through `ClaimProjector.handle` (or the registered worker's `handle`).
3. Collect per-event: `projected`, `evidenceResolved`, `edgeId`, `refused`.
   Assert: zero throws, 18 `projected: true`, `evidenceResolved` count = the
   exact expected edge count.
4. Only if the dry run is fully green does the live run proceed.

## Live run (authorized only)

For each of the 18 enumerated event IDs, in `event_id` order:
read the event row (read-only) and dispatch it through the live
claim-projection worker's `handle` (same code path the gateway uses for new
events). Collect the same per-event stats. Bounded: exactly the 18 IDs,
sequential, no concurrency beyond the worker's own `maxConcurrent: 2`.

## Post-run digest (must match)

```sql
-- per-event proof: every backfilled claim node exists
SELECT node_id FROM knowledge_nodes
  WHERE node_id LIKE 'claim:%' AND data->>'projected_by' = 'claim-projection';
-- totals
SELECT count(*) FROM knowledge_nodes
  WHERE node_type = 'claim' AND data->>'projected_by' = 'claim-projection';
SELECT count(*) FROM knowledge_edges
  WHERE edge_type = 'SUPPORTED_BY' AND data->>'projected_by' = 'claim-projection';
```

Claim-node count must equal 18. Edge count must equal the dry run's
`evidenceResolved` count. Baseline deltas must equal these counts.

## Rollback / rebuild strategy

Rollback is exact because every artifact the projector writes carries
`data->>'projected_by' = 'claim-projection'`, and `claim` node_type is
written by nothing else (verified: sole `addNode('claim', …)` caller is
`claim_projector.js`):

```sql
-- edges first (explicit; FK cascade would also handle it)
DELETE FROM knowledge_edges WHERE data->>'projected_by' = 'claim-projection';
-- evidence event nodes created by the projector (orphans only, to be safe)
DELETE FROM knowledge_nodes n
  WHERE n.node_type = 'event'
    AND n.data->>'projected_by' = 'claim-projection'
    AND NOT EXISTS (
      SELECT 1 FROM knowledge_edges e
      WHERE e.source_id = n.node_id OR e.target_id = n.node_id);
-- claim nodes
DELETE FROM knowledge_nodes
  WHERE node_type = 'claim' AND data->>'projected_by' = 'claim-projection';
```

Verify with the baseline queries: counts return to pre-run values.
Rebuild = re-run the live run (idempotent by the proof above).

## What is NOT in this plan

- No schema changes, no new tables, no new authority, no new scheduler.
- No backfill of anything other than the 18 enumerated CLAIM_CREATED events.
- The live run does not emit new canonical events; it projects existing ones.
