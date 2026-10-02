# Self-audit note: meta-ai-intel-pass 2026-09-19 ~21:10 MDT

Two first/second-instance observations from this pass. Neither is promoted
to machinery (rent rule: first instance local, second compared; no
automation without a third repeated shape or a proven invariant).

## 1. Reconciler claim derivation (FIRST INSTANCE, local)

When calling reconcile-run-report.sh for a capture_failed run, I first
claimed --file MISSING --bytes MISSING because `ls` showed no `<run_id>.md`.
The reconciler exited 1: its "actual" is derived from the run's OWN
runs.jsonl line, where artifact_refs.raw_capture =
`<run_id>.md.CAPTURE_FAILED` (the fail-closed evidence file, 13942 bytes),
and validation.status=rejected forces items=n/a. Re-running with the
ledger's own values produced verdict=match.

Rule for future passes (manual, not automated — step 8's false-success
boundary requires the worker to ground the numbers, and auto-deriving them
would weaken the check): derive --file/--bytes/--items from the run's own
runs.jsonl artifact_refs + validation.status, never from an independent
filesystem glob of the expected .md name. For capture_failed runs the
ledger's raw_capture is the .md.CAPTURE_FAILED evidence file.

Replay: run_id 20260920-030848-h-marketing-intelligence; first reconciler
invocation output quoted in the pass's final message.

## 2. h-marketing-intelligence output-contract violations (SECOND INSTANCE)

- Round 94 (ingested.log, reliability data point 9): h-brief asked for
  marketing TACTICS (sections A-D); Meta AI answered with businesses
  instead. Prompt-adherence miss.
- This pass: h-brief returned ~13.8KB of substantive prose (mentions
  AI voice-receptionist comparisons, Tawk.to, Podium pricing) with ZERO
  numbered items. Presence validation failed closed (need >=3 numbered
  entries); evidence preserved as .md.CAPTURE_FAILED, never enters
  extraction; rotation does not advance (failed runs never advance).

Comparison: same brief, two different contract-violation shapes (wrong
content type; right content type but wrong structure). The existing
machinery already handles both correctly: fail-closed, no extraction, no
rotation advance, no quarantine (single consecutive failure, not 3).
No machinery change warranted. If a third h-brief contract violation
occurs, compare all three shapes and consider whether the brief's OUTPUT
CONTRACT (numbered list, >=3 entries) needs hardening in the prompt
itself — that decision belongs to the prompt owner, not this lane.

Also noted: gateway healthy after the 15:26 MDT Pig outage (3
OBSERVATION_CREATED accepted, event_ids on the b-run sidecar); Pig bridge
reachability confirmed at pass start.
