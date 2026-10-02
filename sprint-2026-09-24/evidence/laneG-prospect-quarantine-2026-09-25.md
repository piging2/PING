# Lane G verification: prospect/PING boundary + cap (2026-09-25 ~12:45-13:10 MDT)

Lane: PING observation quarantine + producer boundary + prospect cap.
Lane G's 10:15 MDT checkpoint claimed producer gate + cap DONE (commit 6e65505).
This pass VERIFIED every claim against live state and closed the one live gap found.

## 1. The 8 wrong-domain observations: identified

All emitted 2026-09-25 03:22-03:23 MDT (09:22-09:23Z) under brief `b-new-business-radar`
(discovery family, prospect-store-only) via tandem/emit-observation.py, before the
domain gate existed. Sidecar:
`goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260925-090421-b-new-business-radar.provenance.json`.

| # | event_id (prefix) | business named | grade |
|---|---|---|---|
| 1 | c195d2b2 | Western Brass Plumbing LLC, Naturita CO | CONFIRMED |
| 2 | 409eed52 | PEAX MECHANICAL LLC, Delta CO | CONFIRMED |
| 3 | 4cc2f295 | Eagle Eye Contracting Services, LLC, Montrose CO | CONFIRMED |
| 4 | 21cae210 | LYE Martinez Home Improvements, LLC, Montrose CO | CONFIRMED |
| 5 | 23714c0a | Madrid Construction Ltd., Austin CO | STRONG INDICATION |
| 6 | 2bbdb6bb | K2 Builders LLC, Montrose CO | CONFIRMED |
| 7 | a4fd2ace | Rageth Hauling LLC, Montrose CO | CONFIRMED |
| 8 | 3aefabb6 | Prairie Dog One, LLC, Olathe CO | CONFIRMED filing, trade UNKNOWN |

Full event_ids in the sidecar transitions (accepted_by_ping, 8x) and in PING ping_events.

## 2. Quarantine state (VERIFIED live on the Pig, gateway host postgres ping_runtime)

For EACH of the 8 (checked individually via docker exec ping-gateway node queries):

- **ping_events**: OBSERVATION_CREATED row present, IMMUTABLE, preserved (no deletion).
  8/8 rows exist with the sidecar event_ids.
- **knowledge_nodes**: one node per source event, `status=rejected`, `confidence=0.2`,
  label `OBSERVATION_CREATED <eventid-prefix>`. Verified 8/8 via updateNodeBySourceEvent
  (the existing knowledge-lifecycle mechanism; the SNIPPET_REJECTED events also drive
  the canonical knowledge-promotion worker).
- **SNIPPET_REJECTED audit events**: 8/8 emitted 2026-09-25 09:58 MDT (15:58:19Z),
  each payload `sourceEventId` maps 1:1 to the 8 originals. Reason recorded:
  WRONG_INGESTION_DOMAIN, canonical home = prospect store.
- **knowledge_edges**: 0 edges touch any of the 8 nodes (no relationship propagation).
- **qdrant `knowledge` collection**: the 8 were embedded BEFORE quarantine (namespace
  core::system, kind OBSERVATION_CREATED). This was a LIVE semantic-search leak:
  EvidenceAuthority.verify() traces hits to ping_events only and does not consult
  knowledge_nodes.status, so the rejected observations could still surface via the
  semantic leg. **Closed in this pass**: the 8 derived vectors were deleted via the
  qdrant points/delete API (delete_status=ok); re-scroll confirms 0 points remain.
  Originals untouched (no evidence destroyed). Sidecar records the removal
  (quarantined_lane_g transitions, 16 total: 8 reject + 8 vector-removal).
- **Outreach**: reads western-co-prospects.jsonl only, never PING. 7 of the 8
  businesses are in the canonical store through the normal prospect merge (their
  correct home); Prairie Dog One (trade UNKNOWN) was correctly never merged.
  No PING-driven send path exists.

**Residual (honest, not patched here)**: hybrid_search's knowledge-graph context leg
calls queryNodes({search, namespace, limit}) with no status filter, so a rejected node
can appear in hybrid_search results — but WITH the visible `status: 'rejected'` marker
in the result payload. This is Lane G's coordinator-deferred "Task 3 read-side
lifecycle gap"; the Pig repo tree is hot (integration in flight), so no code was
touched. Recommended follow-up: default status filter in the knowledge leg.

## 3. Producer gate (VERIFIED)

tandem/emit-observation.py `_require_ping_domain()`: only `^learn-[A-Za-z0-9][A-Za-z0-9_-]*$`
briefs pass; discovery families (a/b/c/d/e/f/g/h/...) are refused with exit 2
BEFORE `_require_verified` and BEFORE any network POST. Verified in main() order
(line 534 precedes POST construction) and by live unit probes: 2 learn- briefs pass,
5 discovery briefs refused exit 2. `--force` does NOT bypass; `--drill` bypasses by
design (isolated aggregate). No other /events POST paths exist in tandem/ or
outreach/ (all emissions funnel through emit-observation.py).

## 4. Cap: 307 -> 300 ACTIVE (VERIFIED, test matrix re-run)

- Canonical `your_files/western-co-prospects.jsonl`: 305 total, **300 active**
  (5 SUPPRESS excluded by active_count). 0 duplicate business_names.
- Archive `outreach/prospect-archive.jsonl`: 83 total; 7 archived 2026-09-25 with
  full records + archived_at + archive_reason. Protection re-check on all 7:
  all WATCH, zero protect_reasons (no ladder, no sent-awaiting-followup, no
  queued drafts, no owner-pending, no unknown-effect, no email route, not fresh).
  Archived: Four Seasons Plumbing Heating; Mesa Cleaning Co. LLC; Simply Mini
  Splits Ltd; Airstream Plumbing & Heating, Inc.; APX Roofing;
  Bailey's Garage Doors and More, Inc.; Black Canyon Landscape, LLC.
- Overlap canon/archive: NONE. Nothing deleted (archive, not destroy).
- Mechanism: outreach/prospect_store.py (existing authority): capacity check in
  admit() BEFORE merge, weakest-WATCH archive via exclusive fcntl lock, .tmp +
  verify + atomic os.replace. enforce-cap-2026-09-25.py idempotent (second run:
  "cap satisfied, nothing to do").
- **Test matrix re-run**: test-cap-matrix-2026-09-25.py => 20/20 PASS
  (299+7 archives 6; 300+7 archives 7; dup handling; ineligible pool raises;
  protected never archived; deterministic selection; concurrent workers final
  active <=300 with no dupes; retry idempotent; canon valid jsonl; no leftover tmp).
- Digest regenerated (prospect-digest.md, sha f5d21f3c) and goal mirror synced
  (both local copies d15e4e40).
- **Pig deliverables were STALE** (Lane G's "matching checksums" claim did not hold:
  Pig copy dated Sep 21). Re-synced in this pass: ~/ping/deliverables/ on the Pig
  now matches local (JSONL d15e4e40, digest f5d21f3c).

## Open items

1. Read-side status filter in hybrid_search knowledge leg (coordinator-deferred Task 3).
2. Nothing else open in this lane: quarantine complete, gate green, cap at 300.
