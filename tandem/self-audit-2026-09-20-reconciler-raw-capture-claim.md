# Self-audit 2026-09-20: reconciler file claims must name the ledger's raw_capture, not MISSING

## The reasoning that keeps recurring

Step 8 of the meta-ai-intel-pass body says: "MISSING for an absent file or
byte count". But reconcile-run-report.sh does not derive "actual" from the
expected <run_id>.md path; it derives it from the run's own runs.jsonl
ledger line (artifact_refs.raw_capture basename) plus the filesystem. For a
capture_failed run, meta-pass.sh records raw_capture =
<run_id>.md.CAPTURE_FAILED, and that evidence file exists on disk. So
claiming MISSING/MISSING/n/a for a capture_failed run exits 1:

  RECONCILE 20260920-150726-h-marketing-intelligence: mismatch
  (claimed file=MISSING bytes=MISSING items=n/a |
   actual file=20260920-150726-h-marketing-intelligence.md.CAPTURE_FAILED
   bytes=14099 items=n/a)

The worker then has to reason its way out of the mismatch by re-reading the
script and re-claiming with the .CAPTURE_FAILED name and its real stat bytes.

## Production evidence (this run, 2026-09-20, ~09:04 MDT pass)

- Run 20260920-150726-h-marketing-intelligence: exit_code 3, outcome
  capture_failed, ledger raw_capture =
  20260920-150726-h-marketing-intelligence.md.CAPTURE_FAILED (14099 bytes on
  disk, validation.status=rejected).
- Claim (--file MISSING --bytes MISSING --items n/a) -> exit 1, mismatch
  (quoted above).
- Claim (--file 20260920-150726-h-marketing-intelligence.md.CAPTURE_FAILED
  --bytes 14099 --items n/a) -> exit 0, match, sidecar stamped report_claims
  verdict=match.
- The correct claim is fully derivable from this run's own artifacts; no
  cross-run values were involved.

## The invariant (precise)

--file must equal the basename of the run's own ledger line's
artifact_refs.raw_capture. --bytes = stat bytes of that exact file on disk;
use MISSING only when the ledger's named artifact is absent from disk or
raw_capture is empty. --items = ledger validation.numbered_items if and
only if validation.status == "passed", else n/a.

## Automation (proposed, NOT yet applied)

Minimal patch: add `reconcile-run-report.sh --auto <run_id>` which derives
the three claims from ledger + filesystem itself; manual claims remain as
explicit overrides. Alternatively align step 8's wording with the script.
The reconciler is the standing false-success boundary for this pipeline, so
any change to its contract is a machinery change and stays proposed until
Nolan calls for it. This note is the specified, tested invariant; the patch
is the next step, not a unilateral one.
