# SPRINT 2, BLOCK 0–15 — INVENTORY + BASELINE (2026-09-30)

All sources real. No demo data. Inventory driver:
`/tmp/mkos-s2-inventory.cjs` (read-only; ran 2026-09-30 21:18 UTC).

## Sources inventoried

| source | state | evidence grade |
|--------|-------|----------------|
| Pig journal (`ping_runtime`, PG 15.18, `ping-postgres` container) | live, reachable via `~/workspace/bin/pigwsl-exec` | primary (direct read) |
| Oracle journal (`crx_runtime`, PG 17, read-only role `ping`) | live, read-only; inspected via `~/workspace/pig-fb/oracle-ssh.sh -s` | primary (direct read, catalog only) |
| Qdrant (`ping-qdrant` :6333) | live; collections: `constitutional_documents`, `constitutional_memory`, `knowledge` | primary (direct read) |
| Repo (`~/workspace`, branch `orca/effect-ledger-2026-09-30`) | sprint-1 artifacts present; sprint-2 dir `hidden_files/marketingos-100h-s2/` | primary (direct read) |
| GitHub (`piging2/PING`, `ngesk2/crx-runtime` visible; `piging2/fyd` 404) | remote state UNVERIFIED for FYD | not used as evidence |

## Baseline metrics (2026-09-30 ~15:20 MDT)

Journal (`ping_runtime`):
- `ping_missions`: 520 total, 489 completed. Types include
  INTELLIGENCE_RESEARCH (2 completed, 1 created), EXPERIMENT_RUN (4 completed),
  LINEAGE_CREATE (66), PROJECTION_CREATE (68).
- `ping_events`: 2639. Top types: MISSION_CREATED 520, MISSION_ASSIGNED 492,
  MISSION_STARTED 492, MISSION_COMPLETED 489, OBSERVATION_CREATED 106,
  CLAIM_CREATED 97, PROJECTION_CREATED 68, REPLAY_COMPLETED 68,
  RECOMMENDATION_CREATED 68, CLASSIFICATION_CREATED 66, WITNESS_CREATED 66,
  LINEAGE_CREATED 66.
- `knowledge_nodes`: 279. Namespaces: `core::system` 154, `tenant::hpp` 73,
  `core::owner` 14, `marketingos::block20-40` 10, `marketingos::block0-20` 9,
  `marketingos::block80-100` 8, `marketingos::block40-60` 6,
  `marketingos::block60-80` 5.
- `knowledge_edges`: 40.
- No dedicated claim tables. CLAIM_CREATED events (97) carry NULL
  `metadata->>'verdict'` — claim verdicts are NOT queryable from
  `ping_events` metadata. **Observability gap** (candidate for 15–30 wiring).

Qdrant: `constitutional_documents` 26 pts, `constitutional_memory` 0 pts,
`knowledge` 401 pts.

Sprint-1 artifacts (`hidden_files/marketingos-100h/`, 88 files):
- 9 block reports + briefs + attack plan; 23-claim machine-readable ledger
  (`claim-ledger-40-60.json`, all 13 fields); 1 script draft; 1 video artifact
  (322s mp4, 8.4 MB, review-only, headline parameterized);
  learnings/ (schema + 6 LearningRecords + PLAYBOOK.md with 6 CANDIDATE rules
  + outcome-intake seam + validator).
- Claim verdicts sprint 1: C1,C2,C4–C8 CONFIRMED; C3 REFUTED-as-worded
  (refinement CONFIRMED); theses A/B/C-universal/D-as-headline REFUTED;
  E INCONCLUSIVE (this block's U2 mission resolves it).
- Open: U1 (gateway code, deployment-convergence lane), U2 (this mission),
  U3 (PG16/17 parity), U4 (pooler), U5 (disk writes). Zero approvals, zero
  distributions, zero outcome windows opened.

Oracle append-only triggers (read-only capture, 2026-09-30):
- `trg_ping_events_append_only` BEFORE DELETE OR UPDATE ... EXECUTE FUNCTION
  `ping_events_no_mutation()`; `trg_ping_events_append_only_truncate`
  BEFORE TRUNCATE ... same function. Function raises EXCEPTION on any
  DELETE/UPDATE/TRUNCATE. **Pig journal has NO user triggers** — the seal is
  Oracle-only, which is why U2 recreates it on disposable PG.

## Nolan's binding video feedback (recorded for the 45–60 compiler block)

Sprint-1 video (PIL-frame reconstruction) not liked. A separate research
track is surveying video-generator API integrations in parallel. The 45–60
compiler block will plan around a real integration, not re-invest in
reconstruction. No video tooling built in 0–15.

## U2 mission status

Brief committed pre-research: `BLOCK-S2-0-15-RESEARCH-BRIEF.md` (ff6fca5).
Worker dispatched to run U2-C1..C7 on disposable PG (`mkos_u2_disposable`,
dropped at end). Oracle untouched beyond the read-only capture above.
