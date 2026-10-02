# Substrate Gap 3 implementation ledger — journal_identity.py extraction
Date: 2026-09-27 ~11:30 MDT | Lane: substrate Gap 3 (journal identity)
Task source: substrate-recon-2026-09-27.md, Gap 3

## Branch lineage + commit
- Branch: `substrate/gap3-journal-identity`, created from local
  `lane-f-probe-staleness-fix` at af001e3 ("fix: lane-f-probe.py September
  stalenesses (node resolution, pg path, POSTGRES_* env)"). This item
  composes on top of the 3 probe fixes carried by that branch.
- Commit: e84764e "substrate Gap 3: extract journal_identity.py; adopt in
  dump.py and lane-f-probe.py" (3 files: +767/-2).
- Local branch only; never pushed; no main/master commits or merges.
- Multi-stream incident during this item: a sibling worker (Gap 1,
  `substrate/gap1-canonical-conformance`) had switched the shared working
  tree to their branch mid-task; my commit initially landed on their
  branch tip. Remediated same stream: `git reset --soft HEAD~1` restored
  their branch to af001e3 (verified: `git diff af001e3..gap1` is empty),
  changes re-committed as e84764e on `substrate/gap3-journal-identity`.
  Their branch and working tree were otherwise untouched. Lesson for the
  parent: sibling substrate workers sharing one checkout are racing on
  the branch ref; per-stream worktrees would eliminate this class.

## Module API (fyd-lane/journal_identity.py, journal-identity@1.0.0)
Single gateway-address authority + identity pre-flight:
- `DEMO_GATEWAY_URL` = FYD_JOURNAL_GATEWAY_URL default
  `http://127.0.0.1:18199` (demo JSONL journal gateway)
- `MAIN_GATEWAY_URL` = FYD_MAIN_GATEWAY_URL default
  `http://127.0.0.1:8080` (main deployment gateway)
- `IDENTITY_PATH` = {"demo": "/", "main": "/health"}
- `DERIVED_MARKER` = {"demo": "fyd-demo-journal", "main": "ping-main-journal"}
- `EXPECTED_OVERLAY_JOURNAL_MARKER` = FYD_EXPECTED_OVERLAY_JOURNAL override,
  else derived from FYD_OVERLAY_JOURNAL mode (demo -> fyd-demo-journal,
  main -> ping-main-journal). Identical derivation to dump.py's original.
- `DEMO_PG` = FYD_DEMO_PG_* dict (127.0.0.1:55433/postgres/ping-fyd-demo),
  identical defaults to dump.py's original.
- `journal_marker_ok(asserted, expected)` — verbatim harvest of
  dump.py::_journal_marker_ok: marker name must match; the "@<live-derived>"
  suffix may vary.
- `preflight_journal(base_url, identity_path, expected_marker=None)` —
  verbatim harvest of dump.py::_preflight_journal semantics: exactly one
  pre-flight GET; non-200/unparseable/unreachable -> stderr
  "WRONG_JOURNAL: journal identity unreadable at <url>: <err>" + exit 2;
  marker mismatch -> stderr "WRONG_JOURNAL: expected overlay journal
  marker <expected> at <url>, got <asserted>" + exit 2.
- `preflight_role(role)` — resolves role demo/main from this module alone
  and pre-flights it (convenience; not used by the two callers yet).

Out of scope (noted, not changed): `h2-build/config.ts` carries its own
`http://127.0.0.1:18199` default (TypeScript, different runtime); recorded
here so a future pass can centralize it if a TS-side authority is wanted.

## Per-caller adoption diff summary
### dump.py (was untracked operator tooling; now added to the branch)
- Replaced the three embedded address defaults + EXPECTED_OVERLAY_JOURNAL
  derivation + `_journal_marker_ok` + `_preflight_journal` bodies with
  `import journal_identity` (sys.path anchored to the script's own dir)
  and thin wrappers:
  - `JOURNAL_GATEWAY_URL = journal_identity.DEMO_GATEWAY_URL`
  - `MAIN_GATEWAY_URL = journal_identity.MAIN_GATEWAY_URL`
  - `EXPECTED_OVERLAY_JOURNAL_MARKER = journal_identity.EXPECTED_OVERLAY_JOURNAL_MARKER`
  - `DEMO_PG = journal_identity.DEMO_PG`
  - `_journal_marker_ok()` / `_preflight_journal()` delegate to the module.
- Call sites unchanged: `query_overlays_demo()` still calls
  `_preflight_journal(JOURNAL_GATEWAY_URL, "/")` (line ~363);
  `query_overlays()` still calls `_preflight_journal(MAIN_GATEWAY_URL,
  "/health")` (line ~394). The FYD-037 explanation comment is kept verbatim.
- Behavior identical: same env vars, same defaults, same derivation, same
  stderr text, same exit codes.

### lane-f-probe.py (tracked; 29-line diff)
- Imports journal_identity (sys.path anchored to the script's own dir).
- `main()` now runs the identity pre-flight FIRST, before any docker/node
  read: demo role (`DEMO_GATEWAY_URL` + `/` + derived `fyd-demo-journal`
  marker) and main role (`MAIN_GATEWAY_URL` + `/health` + derived
  `ping-main-journal` marker). Marker mismatch -> exit 2 WRONG_JOURNAL
  instead of querying blindly. Rationale comment kept: the demo journal's
  identity spans both of its stores, so one pre-flight against the JSONL
  gateway covers the merged demo read (mirrors dump.py's
  query_overlays_demo docstring).
- Demo-PG env block no longer carries magic defaults: PH/PP/PU/PD come
  from `journal_identity.DEMO_PG` (same values: 127.0.0.1:55433/postgres/
  ping-fyd-demo).

## Probe results
New falsification probe:
`hidden_files/backlog-burn-2026-09-27/substrate-gap3-journal-identity-probe.py`
(stub-urlopen technique reused from fyd037-dump-wrong-journal-probe.py).
Exit 0 = PASS. All 6/6 phases PASS:
- M1 module direct, marker mismatch ("evil-journal@bogus"): SystemExit(2),
  WRONG_JOURNAL on stderr, exactly 1 pre-flight GET, 0 subprocess calls.
- M2 module direct, healthy marker "fyd-demo-journal@live-9f": returns
  normally, 1 urlopen call, no exit.
- M3 module direct, unreadable marker (urlopen raises): SystemExit(2),
  WRONG_JOURNAL, 1 urlopen, 0 subprocess.
- M4 module direct, bare-name marker "fyd-demo-journal": accepted, no exit.
- P1 lane-f-probe.py main() with wrong journal: SystemExit(2),
  WRONG_JOURNAL, 1 pre-flight GET, 0 docker/node calls.
- P2 lane-f-probe.py main() healthy path (both journals assert their
  markers): returns normally (rc 0), both journals queried
  (labels ["main","demo"] printed, 2 pre-flight GETs, 4 subprocess calls),
  no WRONG_JOURNAL.

Regression: existing `fyd037-dump-wrong-journal-probe.py` re-run against
the refactored dump.py -> GUARD VERIFIED, exit 0:
- main_mode_query_overlays: fail_closed True (1 pre-flight GET,
  0 subprocess, typed WRONG_JOURNAL)
- demo_mode_query_overlays_demo: fail_closed True (same)
- All 6 marker/guard source terms still present in dump.py.

Compile: `python3 -m py_compile` on journal_identity.py, dump.py,
lane-f-probe.py, and the new probe script — all OK.
Existing pytest/TS tests for these operator scripts: none found (grepped
fyd-lane for test files referencing dump/probe; the only covering test is
the FYD-037 probe above).

Honest numbers: 6/6 new-probe phases PASS; 2/2 FYD-037 dump phases still
fail closed; 4/4 files compile; 0 existing test suites cover these scripts
(none exist).

## Constraints observed
- Local branch only (e84764e on substrate/gap3-journal-identity; never
  pushed; Gap 1 branch restored untouched after the cross-branch incident).
- mc/sprint-integration-2026-09-27 branch state not disturbed (its HEAD
  and its dirty working-tree files were never committed or reset; working
  tree left exactly as found apart from my stream's files).
- HPP original repo/site never touched. No credentials. No broad process
  kills. Pig transport down — all proof local via stub journals, no Pig
  steps.

## GAP3-IMPL VERIFIED
Evidence: e84764e; module API above; dump.py adoption diff (call sites
untouched, FYD-037 probe GUARD VERIFIED with identical fail-closed
semantics); lane-f-probe.py pre-flight diff; 6/6 falsification phases
PASS (mismatch -> exit 2 + WRONG_JOURNAL + 0 data calls for the module
directly AND through lane-f-probe.py's pre-flight path); healthy markers
accepted on all paths.
