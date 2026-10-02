# FLEET RECOVERY / FORENSICS REPORT
Date: 2026-09-24 ~05:15 MDT (11:15 UTC). Worker: fleet recovery/forensics (parent: dcc34ab4).
Predecessor coordinator 14a1adc2 closed at 37/42 workers; 5 errored (3 already deduped/recovered).

## (a) Errored workers 15823073 and 418fd962 — verdict: no trace, work covered

Exhaustive search: whole `~/workspace/ping-build-program` tree (grep, two passes), `fleet/ledger.jsonl`
(288 lines), `fleet/results/ledger.jsonl` (now retired), all `fleet/inprogress/<worker>/` dirs,
all `fleet/work/<worker>/` dirs, all `claims/*/` dirs, `MEMORY.md`, `~/memory/2026-09-2*.md`,
`~/workspace/GRILLING-BRIEF.md`. **Zero hits.** Neither ID appears in any file, ledger line,
claim file, work dir, or note. The only worker dirs that ever existed are the 7 live fleet
workers (fleet-acq-1, fleet-acq-2, fleet-be-1, fleet-con-1, fleet-ora-1, fleet-ora-2, fleet-po-1);
no orphaned `inprogress/` or `work/` dir exists for either ID.

Interpretation (hypothesis, not proven): they were follow-up/recovery workers that errored before
writing any artifact. Supporting circumstantial evidence: a recovery pass ran 2026-09-24
05:03-09:30Z rebuilding ledger lines lost to the cross-category filename-collision bug, writing
under fleet-acq-1's name with a non-canonical schema ("ts" instead of "at") into the WRONG file
(`fleet/results/ledger.jsonl` instead of `fleet/ledger.jsonl`), and it left connector 0151-0200
with results on disk but no ledger line anywhere — consistent with a worker that errored
mid-cleanup. Whatever they were assigned, nothing is missing now:

- All 9,350 matrix missions have schema-valid result JSONs on disk, filenames zero-padded and
  collision-free, internal `mission_id` matches filename in all 9,350 files (0 mismatches).
- Canonical `fleet/ledger.jsonl` now covers every mission (see fixes below); per-category
  ledgered-unique == on-disk counts: oracle 3,750 / acquisition 2,500 / backend 1,800 /
  connector 1,200 / perfops 850 / release 100.
- 204 unique ledger ranges checked against disk verdicts with latest-in-file-order attribution:
  204/204 reconcile (2 apparent oracle mismatches were my checker's artifact — the SANDBOX-PASS
  aggregate line 108 at 04:52Z supersedes the stale per-range lines 59/62; disk counts match
  line 108's PROVEN 50 / ADAPT 60 exactly).
- Schema-steering (lane E follow-up): complete and closed (see (c)).
- No claim file anywhere is held by an unknown worker.

## (b) The 16 leftover claims — verdict: ALL SUPERSEDED, nothing drained

- `claims/oracle-v2/oracle-3101-3150.claim` … `oracle-3701-3750.claim` (13 files): each range is
  ledgered TWICE — fleet-acq-2 under `matrix=oracle-v2` (03:50-03:56Z) and fleet-ora-2 under
  `matrix=oracle-v3` (10:58-12:10Z; the v3 redrain: 63 ranges x 50 = 3,150 missions). The v2 claim
  files were never claimed (0-byte copies; the atomic-mv protocol was skipped when the v3
  redrain consumed the real claims). Result JSONs on disk for all 650 missions.
- `claims/oracle-v3-redrain/oracle-v3-redrain-2701-2750/2751-2800/2801-2850.claim` (3 files): each
  drained by fleet-ora-1 (03:41-03:43Z); ledger notes explicitly describe oracle-v3 content and
  on-disk verdicts match. Only defect: the three ledger lines lack the `matrix: oracle-v3` tag
  (cosmetic; invisible to matrix-filtered queries only). Result JSONs on disk for all 150.

All 16 moved to `fleet/claims/oracle-superseded/` with a dated entry appended to
`SUPERSEDED-NOTE.md`. `claims/oracle-v2/` and `claims/oracle-v3-redrain/` are now empty.
No range was re-drained.

### Fixes applied during this recovery (small, evidence-backed, per fleet protocol)

1. **Connector ledger gap closed.** CON-0051..0200 (150 missions) were on disk but absent from the
   canonical ledger: fleet-con-1 had written its 0051-0100 and 0101-0150 drain lines to the wrong
   file (`fleet/results/ledger.jsonl`), and 0151-0200 had no ledger line anywhere (claim sat in
   `inprogress/fleet-con-1/`). Verified verdict counts against disk (0051-0100: PROVEN 44/N-A
   2/NEEDS-FOLLOWUP 4 — exact match; 0101-0150: PROVEN 46/NEEDS-FOLLOWUP 4 — exact match;
   0151-0200: PROVEN 43/N-A 2/NEEDS-FOLLOWUP 5). Appended all three lines to the canonical
   `fleet/ledger.jsonl` (288 lines). Connector now reconciles exactly: 1,200 ledgered =
   1,200 on disk.
2. **Split ledger retired.** `fleet/results/ledger.jsonl` (60 lines) -> renamed to
   `fleet/results/SUPERSEDED-ledger-2026-09-24.jsonl` with `SUPERSEDED-ledger-NOTE.md`
   documenting the merge. Every one of its 60 lines was verified present in the canonical
   ledger first. Canonical ledger is again the single authority.
3. **D2 (ACQ-0100.json) resolved by a prior worker:** acquisition reconciles exactly
   (2,500 = 2,500); no action needed.

## (c) Schema-steering lane worker (lane E follow-up) — COMPLETED

`lane-e/STATE.md` (updated 2026-09-24 03:20Z): **PROVEN (schema→most subset + R-07 convergence)**,
"lane closed pending coordinator review." Follow-up artifacts all present and verified on the Pig:
`converge-patch.py`, `work-apply-final.sh`, the `work-*.sh` fetch/verify scripts (02:29-03:07Z),
tsx behavioral suite ALL VERIFY PASS, `tsc --noEmit` clean on touched symbols, spike re-run
5 PROVEN / 4 PARTIAL / 0 FAILED, red-teamed converged mapping. PROGRAM-REPORT.md records
"E (schema convergence): PROVEN." No worker running; nothing outstanding except Nolan-side
morning-queue items (validator wiring, jest TS transform repair) which are owner decisions,
not worker work.

## (d) Disklab cleanup — DONE

`fleet/work/fleet-acq-2/disklab/`: **671 MB -> 384 KB.** Removed all `case*/fill/` disk-fill
scratch dirs and `case4_logs/` (505 MB of synthetic rotated pressure-test logs). Preserved:
`disk_pressure_lab.py` (the harness), `disklab-evidence.json` (full 5-case verdict record with
per-subject pct/write/err — the lab's informational content), case dir skeletons + `probe/write.bin`
files. Verified no result JSON cites any disklab path (grep over `results/oracle/*.json`: 0 hits),
so nothing downstream references the removed scratch.

## (e) Re-dispatched / queued

**Nothing.** All gaps found were small and were fixed inline (ledger appends, file moves, scratch
deletion). No `REDISPATCH-NEEDED.md` was written — there is no large undrained range and no
worker-shaped hole left. Residual non-blocking items for the coordinator / morning queue:

- D4 cosmetic: 12 oracle v3-redrain ledger lines (1301-1750, 2701-2850) lack the
  `matrix: oracle-v3` tag; missions are drained, results on disk, verdicts match. Optional
  corrective annotation only.
- W1/W3 hygiene: 18 oracle evidence-path typos (`store-loss-drill.sh` missing `tree/` segment);
  evidence exists, paths are wrong.
- W5: 70+ ledger lines carry future/rounded timestamps; append order vs `at` disagrees —
  any future "latest drain" logic must use a documented tiebreak (file order is the sane one).
- D3 double-drains (oracle-v2 2951-3000, 3051-3100; default 1651-1700): unchanged since the audit;
  disk agrees with the later drains; needs a documented supersession rule, not re-drain.

No commits made anywhere. Live Oracle host untouched (read-only throughout).
