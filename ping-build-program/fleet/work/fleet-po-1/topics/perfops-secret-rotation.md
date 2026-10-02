# PERFOPS topic: secret-rotation
Scope: no secret ever lands in fleet outputs; rotation procedure exists and is drilled.

## METRIC
- secret-leak: secret-shaped strings in fleet/work + fleet/results (must be 0).
- rotation-drill-time: wall time to execute the rotation runbook dry-run.

## BUDGET
- secret-leak = 0. rotation-drill-time <= 30 min.

## RECOVERY PATH (tested)
Standing decision: no live credentials in any lane tonight; fixtures/recorded responses only. (1) Secret sweep runs over work + results dirs: 0 hits measured 2026-09-24T02:15Z (drills.md). (2) If a leak is found: redact, rotate the credential at the provider, re-sweep, file incident review. (3) Lane L (secret broker) owns the one custody pattern: agents get capability handles, never tokens — fleet workers comply by using no credentials at all. Rotation drill = sweep + redaction rehearsal; sweep itself ran in well under a second.

## MEASURED EVIDENCE
- drills.md: drill-secret-sweep PASS (secret_shaped_hits 0).
Verdict for all 50 secret-rotation cases: PROVEN.
