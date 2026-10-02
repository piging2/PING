# Self-audit: meta-ai-intel-pass 2026-09-29 03:04 MDT

## What the agent reasoned about this pass
How to fill the reconcile-run-report.sh claims for a CAPTURE_FAILED run.
Body step 8 says "MISSING for an absent file or byte count", and the .md answer
file was indeed absent (only .md.CAPTURE_FAILED existed, 13955 bytes, sidecar
capture_failed, ledger validation rejected, numbered_items 0). The agent first
claimed --file MISSING --bytes MISSING --items n/a; the reconciler rejected it
(exit 1): "mismatch (claimed file=MISSING bytes=MISSING items=n/a | actual
file=20260929-090423-b-new-business-radar.md.CAPTURE_FAILED bytes=13955 ...)".
The agent then claimed the actual .CAPTURE_FAILED filename with its stat byte
count; the reconciler reported match (exit 0).

## Invariant specified
The reconciler keys claims against actual artifact files on disk, INCLUDING
fail-closed .md.CAPTURE_FAILED files. For a failed run, report --file as the
real .CAPTURE_FAILED filename and --bytes as its stat size. Claim MISSING only
when NO artifact file of any kind exists for the run (no .md, no
.md.CAPTURE_FAILED). "The answer file is absent" is an operator reading; the
reconciler's artifact is the fail-closed capture.

## Test
Two production invocations against run 20260929-090423-b-new-business-radar
this pass:
- (MISSING, MISSING, n/a) -> mismatch, exit 1.
- (20260929-090423-b-new-business-radar.md.CAPTURE_FAILED, 13955, n/a) ->
  match, exit 0.
Deterministic: stat -c %s gave 13955 both before and after.

## Automate
Already owned by deterministic machinery: reconcile-run-report.sh does the
keying. The residual gap is body text in the schedule (step 8), which does not
distinguish "answer .md absent, .CAPTURE_FAILED present" from "nothing exists".
Not patching the reconciler here (safety-boundary machinery); the body wording
should gain the distinction at the next body edit. This note is the standing
operator reading until then.

## Reasoning removed from the agent
Do not re-deliberate MISSING vs .CAPTURE_FAILED-filename on future failed runs:
stat the actual files first, name what exists. A rejected reconcile claim is a
claim-formatting error, not a run-state error; re-claim with the true artifact
name rather than rewriting the report narrative.
