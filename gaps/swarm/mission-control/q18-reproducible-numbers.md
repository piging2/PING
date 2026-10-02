# Q18 — REPRODUCIBLE NUMBERS INVENTORY (Mission Control)

Method: :3100 down (18:00-18:03 MDT), so numbers reproduced by direct read-only
queries against the same sources the API routes read. MC API envelopes carry NO
projection_version field (grep over src/app/api/mc: zero hits) — reproduction is
not pinned to a code version. FAIL-grade gap for the "PROJECTION VERSION"
column: every number below is version-unpinned.

Sources keyed: CJ = canonical journal file
`/home/nolan/projects/ping/data/fyd-journal/events.jsonl` (67 events; note the
served route reads it via HTTP :18199, not the file); FL = fleet ledger
`~/workspace/ping-build-program/fleet/ledger.jsonl`; IP = inprogress dirs
`~/workspace/ping-build-program/fleet/inprogress/`; CD = `~/workspace/cron.d/`;
GB = `~/workspace/GRILLING-BRIEF.md`.

## /api/mc/today numbers (src/app/api/mc/today/route.ts)

| Displayed number | Source query | Filter | Time window | Repro |
|---|---|---|---|---|
| overlayEventCount | CJ, last 15 events of type FYD_SITE_OVERLAY | event_type=FYD_SITE_OVERLAY | last 15 (09-25 -> 09-29) | 15 — REPRODUCED |
| recentMissionVerdicts (count) | FL, last 6 lines | none | file tail, NOT time-bounded | 6 — REPRODUCED |
| failed entries (count) | FL tail, verdicts keys matching /fail\|error\|reject/i | regex on verdict keys | file tail | 6 — REPRODUCED, CAVEAT: all 6 match via "FALSIFIED" keys, which are claim-falsification verdicts, not mission failures |
| runningWorkers (count) | IP dir names | excludes "." / "_" prefixes | point-in-time listing | 7 — REPRODUCED |
| scheduledJobs (count) | CD subdirs, files .md/.json/.sh | excludes "_" dirs (so _archive/_invalid excluded) | point-in-time listing | 13 — REPRODUCED (daily 4, hourly 2, minutely 5, runonce 2) |
| dirtyFiles | `git -C /home/nolan/projects/ping status --porcelain` | non-empty lines | working tree now | 7 — REPRODUCED |
| activeGrillQuestions (count) | GB "## ACTIVE QUESTIONS" section, lines `^### ...:` | header regex | document section | 16 — REPRODUCED |

## /api/mc/agents numbers (src/app/api/mc/agents/route.ts)
- operations (count) = same IP listing as runningWorkers. REPRODUCIBLE by same query.
- per-mission verdict counts = FL last-row-per-worker verdicts. REPRODUCIBLE by same file read.
- process counts = `ps -eo comm,args` filtered to node/python/next-server/tsx, capped at
  60 rows. REPRODUCIBLE but sampling-window dependent (point-in-time, capped).

## /api/mc/marketingos numbers (src/app/api/mc/_lib/mc-marketingos.ts)
- missions list + event_count + projector stage counts: projected from the live
  PING journal (canonical CJ). Inventory only (route reads the journal file via
  mc-ping-journal readers); reproduction of a specific count requires the same
  asOf parameter MC passes. REPRODUCIBLE-IN-PRINCIPLE, not re-run here.

## /api/mc/graph numbers
- objectCount / relationshipCount: from getFydTenantGraph — "pinned fixture base
  plus journal overlays" (page.tsx prov line, fyd/objects card). Inventory only;
  the "pinned fixture base" component is NOT a live query, so objectCount is
  DERIVED-from-fixture+overlay, not fully live. MARKED DERIVED.

## Hardcoded (not numbers but presented as facts)
- FYD / sites card: "two tenant sites are live on the private :3100 surface"
  (page.tsx ~661-667) — static prose, no query. With :3100 down it is
  unobservable. MARKED DERIVED-or-REMOVE (see Q16 F16-6).

## Staleness note (reproducible but old)
- FL last write: 2026-09-24T11:58Z (ops-lane). The "Failed (proven only)" card
  presents 7-day-old verdicts under the "TODAY" screen with no as-of label.
- CJ overlays end 2026-09-29T00:15Z. "Changed" shows events 2+ days old as today.
- Numbers are reproducible; the TIME WINDOW column is honest only if the UI
  shows as-of. It does not (except marketingos panel's as_of).

## Unreproducible -> ESTIMATED/DERIVED-or-REMOVE
- NONE of the numeric counts are fabricated; every number traces to a real
  source query. No number marked UNREPRODUCIBLE.
- DERIVED: graph objectCount (fixture+overlay), and any count whose window is
  "file tail" rather than a stated time range.
- REMOVE-or-LABEL: the hardcoded "two tenant sites are live" claim.

## Smallest fixes (proposals only)
- Add `projection_version` (code SHA + schema rev) to every /api/mc/* envelope.
- Replace "file tail" windows with explicit time windows + show as-of timestamps.
- Split the failed-entries regex: FAILED (proven) vs FALSIFIED claims; or document
  the conflation in the card prov.
