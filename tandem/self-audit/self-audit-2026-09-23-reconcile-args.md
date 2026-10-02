# Self-audit 2026-09-23: reconcile-run-report.sh argument derivation

## WHAT THE AGENT HAD TO REASON ABOUT
Every meta-ai-intel-pass hand-derives `--file/--bytes/--items` for
reconcile-run-report.sh from the run's artifacts. The script's header comment
said: `--file is <run_id>.md`, `--bytes` from `stat <run_id>.md` (MISSING when
absent), `--items` from the ledger's `validation.numbered_items` (n/a when
validation did not pass). This pass followed the header for a capture_failed
run (passed `--file MISSING --bytes MISSING --items n/a`) and the reconciler
rejected it: its machine truth is the ledger's `artifact_refs.raw_capture`,
whose basename for a capture_failed run is the `.md.CAPTURE_FAILED` evidence
file (present on disk, 10076 bytes). The header doc was wrong for that state;
the correct claim was `--file <run_id>.md.CAPTURE_FAILED --bytes 10076
--items n/a`, which matched.

## SPECIFIED INVARIANT
reconcile-run-report.sh compares claims against:
- file:  basename(ledger.artifact_refs.raw_capture) if that file exists on
  disk, else MISSING
- bytes: getsize of that file if it exists, else MISSING
- items: str(validation.numbered_items) iff validation.status == "passed",
  else n/a
The derivation source is the ledger's artifact refs, NOT the canonical
`<run_id>.md` name. For capture_failed runs the expected filename is the
`.md.CAPTURE_FAILED` evidence file.

## TESTED
Unit cases run 2026-09-23 against both this pass's runs:
- ok run (d-segment-deep-dive): file=20260923-030438-d-segment-deep-dive.md
  bytes=13322 items=12 -> reconciler verdict match
- capture_failed run (a-weak-website-hunt):
  file=20260923-030638-a-weak-website-hunt.md.CAPTURE_FAILED bytes=10076
  items=n/a -> reconciler verdict match
- unknown run_id: exit 2, no ledger record
End-to-end: derived flags piped straight into reconcile-run-report.sh for
both runs; both verdicts match.

## AUTOMATED
`~/workspace/tandem/reconcile-args.py <run_id>` derives the three flags from
the ledger + filesystem using the machine-truth rule above. Header comment of
reconcile-run-report.sh corrected to match machine truth so the next worker's
standing text cannot mislead it.

## REASONING REMOVED FROM THE AGENT
The worker no longer hand-derives reconcile flags. Run
`python3 ~/workspace/tandem/reconcile-args.py <run_id>` and pass the result
through; hand-picking risks a false mismatch (as demonstrated this run).
