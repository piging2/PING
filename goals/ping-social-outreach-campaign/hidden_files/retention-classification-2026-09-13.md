# Retention classification, 2026-09-13 (Step 2)

Rule: only operational temporary files and recoverable caches may be cleaned,
only under a dry-run-tested retention rule. Nothing referenced by provenance.

## Pig (C:/Users/nolan/.local/share/pigi/)
| Path | Size | Class | Action |
|---|---|---|---|
| fb-profile/ | 527 MB | recoverable cache, LIVE substrate | do not touch |
| node-v22.23.2-win-x64/ | 95 MB | operational runtime | do not touch |
| node.zip | 34 MB | recoverable cache (re-downloadable) | keep, flag as optional |
| fb-engage/ scripts, node_modules | ~13 MB | operational | do not touch |
| fb-engage/meta-answer*.txt, meta-fullprompt*.txt, meta-prompt*.txt | KBs | operational temp (transfer buffers; canonical evidence is local meta-ai-intel/) | 7-day rule, pig-retention.sh |
| fb-engage/inbox/*.json* | KBs | operational temp (job/result pairs, results retrieved) | 7-day rule, pig-retention.sh |
| chrome-cdp-watchdog.log | tiny | replay/audit log, anomaly-only lines | keep, no rule needed |
| PigiFBLogin.*.xml | tiny | durable evidence of 2026-09-13 repair | keep |

## Local
| Path | Size | Class | Action |
|---|---|---|---|
| goals/.../hidden_files/meta-ai-intel/ | 80K | durable evidence (answers, sidecars, CAPTURE_FAILED, QUARANTINED) | never delete |
| tandem/.pack-cache/ | 24K | recoverable cache (rebuildable) | keep, too small to matter |
| pig-fb/ | 64K | operational scripts | keep |

## Rule as built
`~/workspace/pig-fb/pig-retention.sh [--older-than DAYS] [--apply]`; default dry run.
Sweeps Pig-side transfer buffers older than 7 days. Verified: positive test
selects exactly the 15 buffer files and nothing else; 7-day dry run finds 0
stale today. Executed automatically at the end of meta-pass.sh and run_pass.sh
(success paths only, `|| true` so it can never fail a pass): the session that
creates the buffers cleans them. No new schedule, no new service.
