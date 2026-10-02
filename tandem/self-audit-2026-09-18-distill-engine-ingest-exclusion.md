# Self-audit note: distill-sweep engine-ingest exclusion (2026-09-18)

## The invariant promoted
An answer file the outreach engine already ingested is dead-letter-closed
and must never be re-selected by the distill sweep. Engine ingestion is
detected deterministically: the file's run timestamp prefix (YYYYMMDD-HHMMSS)
appears in `ingested.log` on a line that also contains "ingest"
(case-insensitive). Lines that merely mention a run without "ingest"
(e.g. CAPTURE_FAILED records saying "recorded, NOT extracted") do NOT
close it.

## Production evidence (this pass, meta-ai-intel-pass 2026-09-18 ~21:04 MDT)
The sweep selected 5 files. Three of them (20260917-150712-a-weak-website-hunt,
20260917-210418-b-new-business-radar, 20260918-150420-b-new-business-radar)
were already ingested by the outreach engine in rounds 76, 78, 84
(verified by run-prefix grep in ingested.log). Re-verifying them in the
sweep would have double-processed 24 audited items and risked duplicate
pipeline entries / duplicate PING emissions. They were closed as
terminal-distilled with engine-round notes instead, and the two fresh
files (0.1h old) were left for the engine's primary ingest path.

## Reasoning the agent had to do, now removed from the agent
Cross-referencing every sweep-selected file against ingested.log by hand
to avoid double-processing. The sweep's eligibility was derived only from
distill.jsonl, which the engine's ingest rounds never write to, so every
engine-ingested file resurfaced as a false dead letter.

## Test
8 unit cases in /tmp/test-distill-engine-ingest.py (engine-ingested
excluded with engine-naming reason; unmentioned file eligible; no-ingest
mention stays eligible; missing log fails open; select skips only the
ingested file; queue flags exactly one engine-ingested item). All pass
red-before/green-after.

## Automation
`~/workspace/tandem/distill-sweep.py`:
- new `engine_ingested_prefixes(intel_dir)` (fail-open on missing log);
- new eligibility check in `build_queue` setting `engine_ingested` flag and
  reason "outreach engine already ingested (ingested.log); dead-letter
  closed by the engine's primary ingest path, never re-verify in the sweep";
- `--select` output now carries `engine_ingested_excluded` count;
- docstring eligibility section updated.
Post-change production check: 12 engine_ingested flags, 2 eligible (only
this pass's fresh files), selection unchanged.

## Not promoted (observed, follow-up)
`load_distill_ledger()` reads the module-level DISTILL_LEDGER and ignores
the intel_dir parameter, so META_INTEL_DIR test overrides still read the
real ledger. Left as-is; out of scope for this promotion.
