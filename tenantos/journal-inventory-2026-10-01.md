# Journal truth-split — inventory & fork characterization (2026-10-01 ~18:20 MDT)

Read-only analysis on the Pig. Companion to journal-path-proof-2026-10-01.md.
Nolan's correction applied: forks are characterized, NOT deleted. Unique legitimate
events are preserved as evidence; history is NOT silently merged.

## The three journals

### J1 — canonical (ONLY journal with a serving API)
- Path: `/home/nolan/projects/ping/data/fyd-journal/events.jsonl`
- Served by: fyd-journal-gateway PID 850 on :18199 (self-reports this store)
- Writers: :18199 gateway API appends
- Readers: `/api/mc/today` (via HTTP :18199), `/api/mc/technology` (direct file),
  anything querying :18199
- Events: 65 lines, 65 unique IDs, 0 dup, 0 parse errors
- Types: FYD_SITE_OVERLAY x64, k2-falsifier-probe x1
- First: 2026-09-19T18:30:59.221Z (`fyd-seed-ovl-001`)
- Last: 2026-09-29T00:15:39.542Z (`fyd-ovl-mulxdrme-8013374d3d29`)

### J2 — :18200 fork (no live consumers)
- Path: `/home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl`
- Served by: fyd-journal-gateway PID 40434 on :18200 (self-reports this store)
- Writers: :18200 gateway API appends
- Readers: NONE (verified — nothing consumes it)
- Events: 69 lines, 69 unique IDs, 0 dup
- Types: FYD_SITE_OVERLAY x67, k2-falsifier-probe x1, FYD_VISITOR_INTENT x1
- First: 2026-09-19T18:30:59.221Z (`fyd-seed-ovl-001`, shared with J1)
- Last: 2026-09-30T22:04:10.083Z (`fyd-ovl-muonkdeq-e8b1cc23fba7`)
- Overlap: 65/69 IDs shared with J1. **4 unique IDs**, all absent from J1:
  - `fyd-ovl-mulye7z7-d09630ea3ee7` (2026-09-29, FYD_SITE_OVERLAY, happy-place set_presentation_intent)
  - `fyd-ovl-mulyer3l-992f4e6e6462` (2026-09-29, FYD_SITE_OVERLAY, happy-place clear_presentation_intent)
  - `fyd-ovl-mumzkn87-a211ccecf0aa` (2026-09-29, FYD_SITE_OVERLAY, ping-fyd set_presentation_intent)
  - `fyd-ovl-muonkdeq-e8b1cc23fba7` (2026-09-30, FYD_VISITOR_INTENT, happy-place estimate_request, proof-visitor-001)
- **Classification: ARCHIVAL EVIDENCE.** Legitimate FYD overlay/visitor-intent events
  (real presentation intents + one visitor estimate request) that never reached J1.
  Preserve the file. Do NOT silently merge: event identity is proven (unique IDs),
  but ordering/authority relative to J1's stream is not yet adjudicated.

### J3 — MC writers' journal (invisible to the canonical gateway)
- Path: `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`
- Served by: NO gateway (file only)
- Writers: `mc-dispatch.ts` (appendFileSync), `approval_cli.py` -> emit functions,
  `emit.py` direct CLI
- Readers: `mc-dispatch.ts` (journalHas/dedupe/projection), direct file readers
- Events: 200 lines, 200 unique IDs, 0 dup
- Types: FYD_SITE_OVERLAY x7 (seed overlap with J1), MC_* x193
- First: 2026-09-19T18:30:59.221Z (`fyd-seed-ovl-001`, shared seed)
- Last: 2026-10-01T00:02:06Z (`mc-apr-dafb01475f6c8a07`)
- Overlap: 7/200 IDs shared with J1 (the seed). **193 unique IDs**, none in J1 or J2:
  MC_ARTIFACT_PUBLISHED x59, MC_RUN_QUEUED x16, MC_EXECUTION_STARTED x16,
  MC_MISSION_CREATED x15, MC_AGENT_AUTHORIZED x15, MC_RUN_SUCCEEDED x15,
  MC_GATE_RESULT x8, MC_APPROVAL_REQUESTED x6, MC_FYD_STAGE_STARTED/COMPLETED x6+6,
  MC_APPROVAL_APPROVED x2, MC_APPROVAL_DENIED x2, MC_MISSION_* lifecycle x7,
  MC_PASS_* pipeline x9, MC_HOLD_RAISED x3, MC_LANE_* x5, MC_CHECKPOINT x2,
  MC_APPROVAL_REFUSED x1, MC_RUN_UNKNOWN x1
- **Classification: ARCHIVAL EVIDENCE.** This is the Mission Control operational
  history (dispatches, approvals, mission lifecycle, pass pipeline) — legitimate
  canonical-type events stranded in the wrong journal. Preserve the file.
  Do NOT silently merge: 193 events' ordering/authority vs J1's stream unproven.

## Other events.jsonl files on the Pig
`orca-mc-convergence/hermes-proof/events.jsonl` and
`sprint-2026-09-24/orca/lane-f-harness/out/...` — test-harness outputs, not live
journals. No action.

## Same-ID content check
No event ID appears with different content across journals (0 mismatches).
Identity is stable; the split is purely about which journal holds which events.

## Target invariant (unchanged)
EVERY CANONICAL EVENT -> ONE REACHED JOURNAL AUTHORITY (J1 via :18199) ->
EVERY READER / PROJECTION. Future writes converge; fork files are preserved
as evidence until their unique history is adjudicated, then explicitly
classified archival / invalid / disposable — never silently deleted.
