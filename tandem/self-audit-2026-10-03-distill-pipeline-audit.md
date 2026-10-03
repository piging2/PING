# Self-audit 2026-10-03: distill-sweep sibling-lane audit discovery

## Production evidence (this pass, meta-ai-intel-pass 2026-10-03 ~03:04 MDT)
- `distill-sweep.py --select --cap 5` selected `20261003-030416-d-segment-deep-dive.md`
  as eligible (engine_ingested=false, no distill.jsonl entry).
- The discovery lane's `discovery-2026-10-03-0721` run had ALREADY audited all 12
  businesses in that file and recorded the audit as a pipeline.md section citing
  the run_id:
  `## Meta AI intel distill sweep (d-segment-deep-dive 20261003-030416, verified 2026-10-03)`
  (3 staged: A & D Septic & Drains LLC, Montrose Plumbing & Heating Co,
  Able Excavation LLC).
- The sweep only consulted `ingested.log` for prior-processing evidence, so it
  re-selected the file. The operator then burned 12 independent web-search
  verifications to reach the identical verdict: zero additional stagings
  (5 already tracked, 2 franchise-excluded, 2 prior exclusion decisions honored,
  1 weak-web premise failed).
- The independent re-verification did surface one residual uncertainty the
  discovery lane's row under-documents: "Montrose Plumbing & Heating Co"
  (directory phone (970) 249-6575) vs montroseplumbing.com, which resolves to
  Morris Plumbing & Heating -- a distinct-entity question left open in the
  staged WATCH row's falsification note.

## Invariant promoted
SPECIFY: every `distill-sweep.py` queue item carries `pipeline_audit_found`
(True when the run timestamp prefix YYYYMMDD-HHMMSS is cited anywhere in
pipeline.md, i.e. some lane already wrote audit evidence for that run).
The flag is INFORMATIONAL ONLY and never changes eligibility: a cited audit
may be partial, and absence of a citation never proves the file unprocessed.
A missing/unreadable pipeline.md fails open (empty set).

TEST: `tests/test-distill-pipeline-audit.py` -- 9 cases:
  - audit section header citing the run_id -> found (the production miss)
  - row-provenance cite -> found (documented substring heuristic)
  - uncited prefix -> absent; missing file -> empty set (fail-open)
  - build_queue integration: cited run -> flag True AND still eligible;
    uncited run -> flag False AND still eligible
  9/9 pass. Existing suites re-run green (ingest-marker, audit-format,
  capture-failed-terminal 12/12).

AUTOMATE: `pipeline_audit_run_ids()` in distill-sweep.py (env-overridable
via PIPELINE_MD); `build_queue()` stamps the flag on both .md and
.md.CAPTURE_FAILED items; module docstring documents the signal.

REMOVE from the agent: the operator no longer reasons from scratch whether
a selected dead letter was already processed by a sibling lane -- the
`--select` output says so, and the operator delta-checks the cited
pipeline.md section (as done here: residual uncertainty noted, no duplicate
staging) instead of blindly re-verifying every business.

## What this does NOT do
- It does not auto-skip or auto-close audited files: the sweep stays
  fail-closed, and the discovery lane's row quality is the discovering
  lane's responsibility. The flag only removes the "was this processed?"
  reasoning, not the verification judgment.
- One promotion at a time: the separate reconciler observation from this
  pass (for capture_failed runs, reconcile against the actual
  .md.CAPTURE_FAILED artifact rather than claiming MISSING -- the first
  reconciler call exited 1 on the honest-MISSING claim because the 14,669-byte
  artifact exists) is logged for a future pass, not promoted here.
