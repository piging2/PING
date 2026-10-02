# fail-ledger-hygiene gap audit

Date: 2026-09-30, night shift (read-only; ledger not touched)
Source: ~/workspace/FAILURE_LEDGER.md
Method: full scan of every status line in the ledger; each distinct header block
(### or ##) whose latest status value starts with OPEN was audited as one row.

## The convention being audited against

From the ledger's Entry schema (lines 5-17): each entry carries
- classification (SUCCESS_EMPTY / ENUMERATION_FAILURE / ELIGIBILITY_EMPTY /
  DEPENDENCY_FAILURE / AUTH_FAILURE / SURFACE_DRIFT / RATE_LIMIT /
  TEMPORARY_FAILURE / TERMINAL_FAILURE)
- evidence (file paths, tool outputs, pass ids; never narration alone)
- self_heal (bounded recovery attempted, outcome)
- replay (exact commands, files, inputs to reproduce or re-verify;
  "an entry without replay is incomplete")
- status: OPEN / HEALING / HEALED / QUARANTINED / NEEDS_NOLAN

The triage brief adds a fourth convention leg: "invariant learned" - the
invariant the failure taught and that should hold going forward. No ledger
entry carries a dedicated `invariant:` field today; the ledger's "Self-healing
doctrine" rule 6 ("Everything replayable. Entries carry exact commands, paths,
inputs.") is the closest standing requirement.

## Scope note

The triage listed 19 expected OPEN lines (64, 86, 159, 260, 344, 454, 464, 507,
515, 786, 969, 1004, 1125, 1998, 2342, 2565, 2646, 2672, 2699). That list is
stale: a fresh full scan found 55 OPEN status markers across 52 distinct entry
blocks (line 17 is a false positive: the schema doc lists OPEN as a permitted
status value). Entry blocks also shifted (e.g. 786->788 region renumbered by
later appends). The table below covers all 52 OPEN blocks as found tonight.

## Gap table

| Entry ID | Status | Has classification | Has evidence | Has replay | Has invariant | Blocker note |
|---|---|---|---|---|---|---|
| FL-20260919-001 (Threads like-from-feed, pass 46) | OPEN, watching | Y | Y | Y | N | Auto-heals when a pass lands >=1 action; schedule stays on, no operator action |
| FL-20260919-002 (IG CDP wedge streak) | OPEN | Y | Y | Y | N | Stay-on rule; schedule enabled, no hammering; watching |
| FL-20260919-004 (Git push blocked, egress-proxy 401) | OPEN | Y | Y | Y | N | Transport auth 401; unfixable from this plane; needs Nolan's GitHub/credential fix |
| FL-20260919-010 (6 businesses missing JSONL rows) | OPEN | Y | Y | Y | N | Full close is the outreach engine's freeze-removal work (BACKLOG_NOLAN OPEN item 4); perfecting pass may not write |
| FL-20260919-012 (Pig outage root cause) | OPEN, outage persists | Y | Y | Y | N | Root cause known; recovery not authorized; Nolan-only |
| FL-20260919-RCA-001 (disk incident monitoring) | OPEN | Y | Y | Y | N | Design proposed; implementation not authorized in a read-only pass; Nolan authorization |
| FL-20260919-CONV-001 (compose references missing Dockerfile) | OPEN | Y | Y | Y | N | Convergence lane fix; redeploy blocked until it lands |
| FL-20260919-RCA-005 (active writer, qwen3-tts 4GB download) | OPEN | Y | N | Y | N | Writer identified; inhibition pending rate confirmation; storage reconciliation lane owns it |
| FL-20260919-RCA-006 (writer inhibited, 20-phase map) | OPEN | Y | N | Y | N | Reconciliation in progress; immediate target C: below 95% |
| FL-20260919-RCA-007 (temp debris blocked, root-owned) | OPEN | Y | N | Y | N | Awaiting agent A (Windows-side accounting), then Phase 10 |
| FL-20260919-RCA-010 (Google Drive for desktop will not start) | OPEN | N | N | Y | N | Restoration blocked pending Nolan interactive launch |
| FL-20260919-P08-LANE3-001 (worktree unreachable) | OPEN | N | N | Y | N | Blocked on parent transplant; deliverables complete and staged |
| FL-20260919-P04-LANE2-001 (lane 2 hard-blocked) | OPEN | N | N | Y | N | Blocked on repo access; lane produced zero code changes |
| FL-20260919-ORACLE-008 (redeploy blocked, migration vs trigger) | OPEN | N | N | Y | N | Owned by the convergence lane; do not redeploy this image |
| FL-20260919-AUDIT-001 (unauthenticated /tenants defect) | OPEN | N | N | Y | N | Defect unfixed, owned by the convergence lane; grill candidate only if Nolan must decide the auth model |
| FL-20260919-LANEB-001 (bridge mangles heredoc python) | OPEN | N | N | Y | N | Heal = use transfer.sh for all multi-line scripts through the bridge |
| FL-20260919-009 (ping-agent-ops GitHub auth) | OPEN | Y | Y | Y | N | Blocks remote creation + push of 38535ea; needs Nolan's credential decision in the morning |
| FL-20260919-LANE10-001 (dev gateway /health 503, Qdrant wedge) | OPEN | Y | N | Y | N | Root cause proven; repair attempted; follow-up owned by the dev gateway lane |
| FL-20260919-012 UI-lane (scope breach) | OPEN | Y | N | Y | N | ID collision with the Pig-outage FL-20260919-012 (see ledger disambiguation 2026-09-19); backend-revert fix pending |
| FL-20260919-013 (failed staging, .gitignore hook) | OPEN | Y | N | Y | N | Self-heal done: post-add status verification adopted as standing check; watching the next staging |
| FL-20260919-014 (sequence_replay_cert T1 migration) | OPEN | Y | Y | Y | N | Pre-existing; not this lane's scope |
| FL-20260919-015 (test_kernel_pipeline crash) | OPEN | Y | Y | Y | N | Pre-existing; not this lane's scope |
| FL-20260919-016 (test_replay_composition stale path) | OPEN | Y | N | Y | N | Pre-existing; not this lane's scope |
| FL-20260920-007 (threads.com ERR_HTTP_RESPONSE_CODE_FAILURE) | OPEN (four OPEN status lines in one entry) | Y | N | Y | N | Surface quarantined BLOCKED; needs a new fix hypothesis authorized; Nolan-level decision |
| FL-20260920-008 (Pig->Oracle SSH hop hangs, Lane B) | OPEN | Y | Y | Y | N | Retry on bounded cadence; Oracle-side restart is Nolan-only |
| FL-20260920-008 duplicate stub (09:13 entry) | OPEN | N | N | N | N | Duplicate ID; the 09:16 RESOLVED entry records root cause (invocation-plane error) and the fix; this stub should be marked SUPERSEDED by the perfecting pass |
| FL-20260920-009 (Oracle deploy lane arm64 build failed) | OPEN | Y | Y | Y | N | Blocked on coordinator decision; deploy lane stopped per failure protocol |
| FL-20260920-016 (post-send timer, no sends) | OPEN, monitoring | N | Y | N | N | Next engine run owns firing; closes when the queue's first verified acceptance is recorded |
| FL-20260920-031b (projection digest not preserved) | OPEN | Y | Y | Y | N | Lesson tracked in BACKLOG_PING.md OPEN item 9; digest algorithm still not committed |
| Bare-jest repo TS tests (2026-09-21 06:14) | OPEN | Y | N | N | N | Closes when jest config lands and the suite passes |
| FL-20260921-013 (TikTok post-action RESTRICTION_SIGNAL) | OPEN | Y | Y | Y | N | Watch item; heals on two subsequent clean TikTok passes |
| FL-20260921-001 (ig unfollow, commute blackout) | OPEN | Y | N | N | N | Commute blackout self-resolves; Pig recovery is Nolan's |
| FL-20260921-015 (IG pass killed mid-flight) | OPEN | Y | Y | Y | N | Heal requires cross-lane scheduling/lock fix |
| FL-20260921-015 update (root-cause correction) | OPEN | N | N | N | N | Fix implemented and dry-run proven; verification pending the next real IG engagement pass |
| FL-20260921-035 (jest cannot parse TS, fyd) | OPEN | Y | Y | Y | N | Jest config missing on branch; fyd lane work |
| FL-20260921-034 (6 pre-existing FYD test failures) | OPEN | Y | N | Y | N | Pre-existing; needs a pipeline-vs-fixture triage decision |
| FL-20260921-016 (FB pool-seeds browser-closed) | OPEN | Y | Y | Y | N | Cause undetermined; investigation needed before the next FB pass |
| FL-20260921-016 update (standby fix) | OPEN | N | N | N | N | Fix implemented; proves itself only in a later real FB pass with the patched worker |
| FL-20260921-108 | OPEN | Y | Y | Y | N | Resolves when a subsequent pass captures b-new-business-radar ok, or the brief lifecycle ends |
| FL-20260921-204 | OPEN | Y | N | Y | N | Observational; reclassify if it recurs with evidence |
| FL-20260921-213 (Threads comment Post button) | OPEN | N | N | N | N | Comment path unusable until the th-engage.js selector is fixed after a DOM dump; likes healthy |
| FL-20260921-218 (IG unfollow browser wedge) | OPEN | N | N | Y | N | Awaiting manual browser recovery (Nolan) |
| FL-20260921-221 (root npx jest no transform) | OPEN | N | N | N | N | Pre-existing, out of scope; perfecting pass re-verified zero workspace-plane consumers; stays OPEN per the recorded decision |
| FL-20260921-224 (ping-website/HPP unreachable via Pig) | OPEN | N | N | Y | N | Scope gap; revisit when the GitHub pipeline unblocks or Nolan confirms locations |
| FL-20260921-001 (no live gateway exposes ingest seam) | OPEN | Y | Y | Y | N | Ownership transfers to the implementation lane |
| FL-20260921-232 (Ask FYD never refuses) | OPEN | Y | Y | N | N | Fix dispatched; needs lane ownership to complete |
| FL-20260921-233 (Circle/ObjectView vs Ask FYD sources) | OPEN | Y | N | N | N | Fix direction recorded (unify on PING-backed projection); not yet dispatched |
| FL-20260924-201 (Ask FYD tangential "supported") | OPEN | Y | N | N | N | Postdates the lane B report; needs a lane or the repair lane C to own it |
| FL-20260924-208 (adapter test fails at baseline) | OPEN | Y | Y | Y | N | Environmental (Ollama unreachable); owner: whoever owns the adapter integration test |
| FL-20260924-207 (Qdrant sovereignty guard FAIL at base) | OPEN | Y | Y | Y | N | Owner: sibling Qdrant-sovereignty stream / parent orchestrator merge decision |
| FL-20260926-209 (fyd object-lane tests unrunnable) | OPEN | Y | Y | Y | N | Owner: fyd-build lane |
| FL-20260927-001 (Pig bridge down, tripwire blind) | OPEN | Y | Y | Y | N | Owner: Pig bridge / egress proxy; commute-blackout rule does not apply |

## Summary

- 52 OPEN entry blocks found (55 status markers; FL-20260920-007 carries four
  OPEN status lines in one entry, and the schema doc is a false positive).
- 27 of 52 entries have all three schema fields (classification, evidence,
  replay). These are mostly convention-complete; the remaining gap for all of
  them is the fourth leg: no "invariant learned" is recorded anywhere.
- Missing classification: 14 entries. Cluster: the 2026-09-19 sprint-convergence
  lane blocks (RCA-010, P08-LANE3-001, P04-LANE2-001, ORACLE-008, AUDIT-001,
  LANEB-001), the two 016/015 update entries, FL-20260920-016, and the terse
  late entries 213, 218, 221, 224.
- Missing evidence: 27 entries. The convention demands file paths, tool
  outputs, or pass ids, never narration alone; many entries narrate the
  failure without a pointer to the artifact that proves it.
- Missing replay: 11 entries. Six of those are the newest FYD/Ask FYD entries
  (232, 233, 201), the 015/016 update stubs, bare-jest, FL-20260920-016,
  FL-20260921-001, FL-20260921-221, and FL-20260921-213.
- Has invariant: 0 of 52 record an invariant learned from the failure.
  (FL-20260919-010 cites invariants from other entries - the FL-20260922-001
  suppression invariant and the one-canonical-JSONL symlink invariant - but
  records none learned by itself.)
- Missing all four legs: 5 entries (FL-20260920-008 duplicate stub,
  FL-20260921-015 update, FL-20260921-016 update, FL-20260921-213,
  FL-20260921-221). These are the highest-value hygiene fixes and are all
  append-only annotations away from compliance.
- Ledger hygiene warts found while auditing (not edited): FL-20260919-009 is
  assigned twice (Math.random() entry vs ping-agent-ops auth entry; per the
  2026-09-19 disambiguation the auth blocker is canonical 009); FL-20260919-012
  is assigned twice (Pig outage vs UI-lane scope breach); FL-20260920-008 has a
  duplicate OPEN stub alongside a 09:16 RESOLVED entry for the same incident;
  FL-20260920-015 and FL-20260921-015/016 each appear as a base entry plus
  update entries with divergent field completeness.

## Notes for the perfecting pass (no action taken here)

Entry edits belong to the ping-perfecting-pass cron per the triage brief, not
to this audit. If it picks this up: the five all-missing entries can be
brought to full convention with one annotated append each; the 14
missing-classification entries mostly need a one-line classification append;
the missing-evidence entries need the artifact pointers the lanes already
have in their pass reports. No new authority, no store, no code: this is a
checklist, not a project.
