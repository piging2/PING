# Placeholder-success audit re-verification (2026-09-27 ~12:40 MDT)

Subagent: backlog-burn (parent: main agent). Re-verified the 2026-09-24
ORCA effect-port lane audit (`~/workspace/orca/PLACEHOLDER-SUCCESS-AUDIT.md`,
10 findings) against current code. Read-only except the F-04 fix.

## Status

- **F-01 (P0, Gmail-verified history ignored when touches=0)**: FIXED.
  `send-eligibility.py` carries the fix with an explicit comment
  ("F-01 fix 2026-09-24"); the truthiness gate on `sv["touches"]` is gone,
  any gmail-vs-structured mismatch fails closed with DISCREPANCY (exit 2).
  The prescribed regression tests exist in `test-send-eligibility.py`
  (t1/t2: touches=0 + gmail_sent_count in {1,2} -> exit 2) and the suite
  passes 28/28 as of 2026-09-27 ~12:50 MDT.
- **F-04 (P1, verify_in_sent fuzzy match false-verifies)**: WAS OPEN, NOW FIXED
  by this subagent (see below). `send-batch.py:146` still had the exact fuzzy
  line from the audit, still called on the live path (`:172`), last touched
  only by the F-01 commit which did not address it.
- **F-05 (P1, zero-hits = proof of non-delivery, no positive control)**:
  DESIGN COMPLETE 2026-09-27 ~13:15 MDT; implementation queued at wiring
  time (adapters dormant/unwired). Canary spec: run `in:sent --max 1`
  through the SAME exec machinery as the target query; canary hit →
  `searchHealthy: true`, canary zero-hits → `searchHealthy: false` and the
  zero-hits path resolves to `inconclusive`, never `not-delivered`.
  `searchHealthy` must come from the canary result, never a hardcoded
  `true`. Live proof: the canary query returned a hit against the real
  Gmail CLI (1 message, resultSizeEstimate 201). Falsification plan
  (stub-exec inconclusive / not-delivered cases) in
  f05-canary-design-2026-09-27.md. Downgraded urgency 2026-09-27 ~12:55 MDT:
  a workspace-wide grep finds NO callers of `class_08`/`effect_adapters`
  outside `/orca/port/` itself — the adapters appear dormant (unwired),
  like the F-02/F-03 gateway stubs. Fix at wiring time, not before.
- **F-06 (P2, assertProbeEvidence ignores outcome)**: FIXED 2026-09-27 ~13:00 MDT
  by this subagent via the coordinated (non-breaking) contract update.
  `assertProbeEvidence` keeps its exact evidence-presence semantics
  (outcome-agnostic by design; pinned by a new regression test).
  New `assertProbeSuccess(probeResult, allowedOutcomes=['delivered'])`
  in `orca/port/effect_adapters/adapter_core.js`: true only with real
  evidence AND an explicitly allowed outcome; absent/unlisted outcome
  fails closed. Success decisions must use it; existing callers
  untouched (class_08 makes its own outcome decision, class_05c does
  evidence assembly). Tests: `node --test tests/run_tests.js` 42 tests /
  37 pass / 0 fail / 5 pre-existing skips (verified identical skips
  without the change); 6 new tests pass. Committed locally as `3b47bb4`
  on branch `burn/orca-f06-2026-09-27` (never pushed). The adapters remain
  dormant/unwired, so this is contract-hardening at the seam, not a live
  behavior change.
- **F-02/F-03 (P1, Pig gateway placeholder stubs)**: UNVERIFIABLE LOCALLY.
  `/home/nolan/ping/gateway/` is not present on this machine (Pig-side);
  transport down. The audit downgraded them to P1 as dormant-unreferenced;
  that claim cannot be re-checked until transport recovery.

## F-04 fix (applied 2026-09-27 ~12:45 MDT)

File: `~/workspace/outreach/send-batch.py`, `verify_in_sent`.

Change (minimal, fail-closed): the fuzzy condition
`subject.lower().split(",")[0] in subj or subj in subject.lower()`
replaced with exact full-subject equality `subj == subject.lower()`
(case-insensitive retained; `parse_draft` strips subjects and `+send`
transmits them verbatim, so exact equality is the correct receipt check).
A genuine send still verifies; anything else fails closed to UNVERIFIED,
which stops the batch with "check sent mail before re-sending" (the
already-designed safe path). No other caller of `verify_in_sent` exists.

Tests: 6 regression tests appended to `~/workspace/outreach/test-send-batch.py`
(the `__main__` runner was relocated after the new tests; it previously sat
mid-file and would have hidden them):
- exact subject verifies (True, correct id)
- case-insensitive match verifies
- F-04 scenario: earlier same-comma-chunk send does NOT verify (False)
- reverse-substring scenario does NOT verify (False)
- zero hits -> (False, not-found)
- unparseable triage -> (False, triage-unparseable)

Falsification: with the fix temporarily reverted, the two F-04 scenario
tests FAIL with `(True, 'msg-old')` — the exact false receipt from the
audit. With the fix: **15/15 PASS** (8 pre-existing + 7 new).

Refinement (2026-09-27 ~13:00 MDT): the CLI's clean zero-hit string
("No messages found matching query") previously fell through to
"triage-unparseable". It now returns the honest verdict
`(False, "not-found (0 sent-to-address hits)")`, reusing the same
unambiguous marker `gmail_sent_count` relies on. Behavior unchanged
(still fail-closed False); only the diagnostic is honest. Live-verified
against the real CLI. The real triage JSON shape was also confirmed
live (`{"messages": [{"id", "subject", ...}]}`), matching the mocks.

## New backlog items

- F-05: add a positive control (canary query) before trusting zero-hits as
  proof of non-delivery in class_08 email probe. Needs design: what is the
  canary, and what happens on canary failure.
- F-06: tighten `assertProbeEvidence` to consider outcome, coordinated with
  the `class_08` call site that passes evidence without an outcome field.
  Latent P2; do not change unilaterally.
- F-02/F-03: re-verify the Pig gateway stub dormancy claim after transport
  recovery (`/home/nolan/ping/gateway/commit_authority.js`,
  `patch_authority.js`).
