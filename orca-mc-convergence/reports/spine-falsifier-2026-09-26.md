# Falsifier report: spine lane phase-1 (independent replay)

Date: 2026-09-26. Falsifier lane, Mission Control finish directive, O5
(implementer never certifies itself). Target: branch
`spine/x-pass-reached-path`, SHA df91b4e.

**Overall verdict: CERTIFY.** Every checkable claim in the implementer's
report (spine-x-pass-lane-report.md) survived independent replay from a
clean checkout. Zero defects found. Zero code changes made by this lane.

## Preflight

- Fresh worktree created at /tmp/falsifier-spine/spine-replay off
  df91b4e (`git worktree add /tmp/falsifier-spine/spine-replay
  df91b4e`); deliberately not reusing /tmp/spine-x-pass.
- `git rev-parse HEAD` -> df91b4ecf0dccc345ea5a677c5fc76c7d78a2754
  (matches target SHA). `git status --porcelain` -> clean.
- Preflight PASS; all replay ran in my own worktree with my own commands.

## Per-claim results

### (1) Test suites green from clean checkout — CONFIRMED

- `python3 outreach/tests/test_spine.py` in my worktree: exit 0,
  46 PASS lines, `OK: all spine tests green`.
- `python3 outreach/tests/test_pass_policy_engine.py` in my worktree:
  exit 0, 63 PASS lines, `OK: all pass-policy-engine tests green`.
- The claimed 46 checks is exact (46, not approximately).

### (2) 10 MC_PASS_* events for pass x-20260926-231400 with the claimed
event IDs — CONFIRMED

Read the live journal ~/workspace/fyd-journal-gateway/events.jsonl
directly (read-only): exactly 10 rows with aggregate
mc:pass:x:x-20260926-231400, in order
MC_PASS_STARTED, DISCOVERY_TIMEOUT, DISCOVERY_DONE, CANDIDATES,
MANIFEST, INTENTS, EXECUTION_DONE, OBSERVATION, VERIFY, CLOSED, with
event ids mc-pass-9f1a4ce787d2, mc-pass-4180955c0be6,
mc-pass-a0aeefd05a9f, mc-pass-9fdc9622211f, mc-pass-a91bcb20d586,
mc-pass-0a8c876327fc, mc-pass-2a1ed2177c52, mc-pass-8520d8986313,
mc-pass-31cf57baeac9, mc-pass-67f5a02cfc90. All 10 match the lane's
list character-for-character.

### (3) Re-emission is 10/10 duplicate-skipped (idempotent) — CONFIRMED

I re-ran the observer's emission path myself in dry-run mode against
the real journal (read-only; `--dry-run` in mission-control/emit.py
never writes):

```
python3 outreach/spine_observe.py --pass-id x-20260926-231400 \
  --passes-dir ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes \
  --ledger ~/workspace/outreach/action-intent-ledger.jsonl \
  --journal ~/workspace/fyd-journal-gateway/events.jsonl --dry-run
```

All 10 events returned `duplicate-skipped` with the same event IDs.
Journal SHA-256 before and after: e3bdbba90b80b700f2e84b74669f06fb8d72f936e957cd4b889afba097f426d1 (identical). Zero journal change.

### (4) The three WHY answers — CONFIRMED character-for-character

Re-ran all three query functions from my worktree against the journal
and diffed against the lane's quoted answers:

- STOP: `It did not stop early: pass x-20260926-231400 completed 5/18
  actions (pass class SUCCESS_ACTION).` Evidence mc-pass-67f5a02cfc90.
  EXACT MATCH.
- BROWSER: `Pass x-20260926-231400: executor reported 5 of 5 manifest
  actions. Restriction: none. Intents left open (unknown): 0.` Five
  table rows, all EXECUTED: @DailySentinelGJ, @KJCTNews8, @KKCO11News,
  @GrandJunctionPD, @NWSGJT. Evidence mc-pass-a91bcb20d586,
  mc-pass-8520d8986313, mc-pass-2a1ed2177c52. EXACT MATCH.
- REJECTED (@aizikzimmerman): `No rejection recorded for
  '@aizikzimmerman' in the last 7 days. It was either never a candidate
  or it was SELECTED.` EXACT MATCH. Control (@DailySentinelGJ):
  `SELECTED in pass x-20260926-231400 (not rejected).` EXACT MATCH.
- Independent recomputation: unknown fold = 0 open of 5 intents; 7-day
  rollup = passes 1, actions 5, failures 0, unknown 0, blocks 0.

### (5) Panel data values — CONFIRMED

- Re-rendered with the committed render.py from my worktree against the
  live journal:
  `python3 ping-ui-contract/apps/mission-control/pass-health/render.py
  --journal .../events.jsonl --out /tmp/falsifier-spine/re-render.html
  --platform x`
- `diff orca-mc-convergence/reports/spine-proof-pass-health-x.html
  /tmp/falsifier-spine/re-render.html` -> byte-identical.
- Values in the committed HTML all verified: SUCCESS_ACTION, 5/18,
  unknown 0, candidates 5 / eligible 5 / skipped 0, 7-day 1/5/0/0/0.

### (6) DISCOVERY_TIMEOUT is honest (observed missing, not invented) —
CONFIRMED

My own dry-run fold independently found: `DISCOVERY_TIMEOUT: no probe
output files for ts 20260926-231400`. The event data names the exact
evidence: `zero x-probe-20260926-231400*.json and zero
x-candidates-20260926-231400.json in the passes dir`; probe posts = 0.
Missing artifact folded as MC_PASS_DISCOVERY_TIMEOUT, probe posts
recorded as 0 (a count of observed files), never invented candidate
content. O7 honored.

### (7) Live pass behavior untouched; diff confined to allowed paths —
CONFIRMED

`git diff f980649 df91b4e --stat`: 10 files, 2065 insertions, 0
deletions. Top-level dirs touched: mission-control (3),
orca-mc-convergence/reports (2), outreach (3), ping-ui-contract (2).
Nothing outside the allowed set. All changes additive; no live-path
file modified.

### (8) Nested-repo / untracked-dir integration caveat — CONFIRMED

- `ping-ui-contract/.git` exists as a real directory -> ping-ui-contract/
  IS a nested Git repository.
- At base f980649: `git ls-tree` for mission-control/ and
  ping-ui-contract/ returns nothing (both untracked in the canonical
  tree); `git show f980649:mission-control/emit.py` ->
  `path exists on disk, but not in <base>`.
- The lane's integration note is real: merge shape (submodule vs plain
  dirs vs separate repo) genuinely needs a decision. Nothing in the
  merge has been performed (no commit on main by this lane).

## Fabrication audit (O7/O8)

Every number in the panel and query answers traced to a journal event
or an observed pass artifact:

- 5/18, SUCCESS_ACTION, unknown 0 -> MC_PASS_CLOSED mc-pass-67f5a02cfc90
  event_data (actions_landed=5, caps_total=18, pass_class,
  unknown_open=0; stages_observed lists the 8 grounded stages).
- candidates 5 / eligible 5 / skipped 0 -> MC_PASS_CANDIDATES
  mc-pass-9fdc9622211f event_data; ground truth: 5 ELIGIBLE rows in
  engagement-guard-decisions.jsonl at ts 2026-09-26T23:14 (all five
  handles) and 5 handles in x-follow-queue-20260926-231400.txt.
- 5 of 5 manifest actions EXECUTED -> 5 ledger observations with
  terminal=EXECUTED and ok=true, joined by intent_id; 5 outcomes with
  ok=true in x-follow-outcomes-20260926-231400.json; run-log tail shows
  rc=0 per follow and `batch complete`.
- restriction none -> grounded in the run log tail (no restriction
  signal) and outcomes file.
- 7-day 1/5/0/0 -> recomputed rollup from MC_PASS_CLOSED rows in the
  window (1 pass, 5 actions, 0 failures, 0 blocks, unknown 0).
- 0 open intents -> INTENTS/OBSERVATION fold: 5 intents, 5 observed, 0
  open (unknown_count_for_pass = {unknown: 0, intents: 5, observed: 5}).
- unknown renders as unknown in the no-data paths (covered by tests E1,
  E2). No zero-invention anywhere.

## Defects

None. Zero defects found across all eight claims plus the fabrication
audit.

## Notes (not defects)

- The journal is live: an unrelated writer (MC_GATE_RESULT backfill
  events, 01:29-01:30 UTC) appended rows between my reads (line count
  went 32 -> 33 -> 35). This is ambient activity, not a spine-lane or
  falsifier write; the SHA-256 check around my dry-run proves my run
  changed nothing.
- The 7-day rollup is window-relative to current time, so future replays
  on a different day may show different window numbers. Benign: the
  panel re-rendered byte-identical at replay time.
- The verify report pins manifest x-pass-20260926-231440.json (ts 231440
  vs pass 231400); that is what the observed artifact itself says, not
  an invented value.

## Spend accounting

Near zero. Local shell + Python only in the falsifier's own worktree.
No provider/model calls, no browser actions, no social actions, no
journal writes, no code changes.

## Proof artifacts for the parent

- Independent worktree (ephemeral): /tmp/falsifier-spine/spine-replay
  at df91b4e.
- Byte-identical re-render: /tmp/falsifier-spine/re-render.html.
- This report: ~/workspace/orca-mc-convergence/reports/spine-falsifier-2026-09-26.md
