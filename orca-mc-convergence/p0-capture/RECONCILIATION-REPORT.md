# P0 Surgical Reconciliation Report
Date: 2026-09-26 (task executed Sat 2026-09-26 ~20:15+ MDT)
Operator: P0 surgical reconciliation subagent

## SHAs involved
- HEAD (main checkout ~/workspace, branch mc/audit-payload-lifecycle): ba653acbca305533fead411fb19abaae33d7a2fc
- Certified repair: 86bfbc4 (three smuggling shapes, ERASED gate, TZ fix)
- G1/G2 follow-up: fd8edef (sk-proj pattern, aws_secret_access_key label) -- certified 66/66 lane + 46/46 spine + 63/63 policy-engine
- Pre-repair (the stale staged content): 17b1362
- fd8edef IS an ancestor of HEAD; HEAD:payload_lifecycle.py md5 2badeb0186d12402a75353b6c88d974e == fd8edef version.

## Step 1 - Capture
Saved under ~/workspace/orca-mc-convergence/p0-capture/:
- rev-parse-HEAD.txt, git-status.txt (pre-reconciliation), diff-cached.txt (210 lines: the stale staged revert), diff-unstaged.txt (171 lines: other files, untouched), log-files.txt, branches-audit.txt, show-fd8edef-stat.txt, show-86bfbc4-stat.txt, worktree-list.txt, stash-list.txt, fd8edef-payload_lifecycle.py, fd8edef-test_payload_lifecycle.py (byte-exact reference copies).

## Step 2 - Ownership
SCOREBOARD.md + SWARM-QUEUE.md attribute the staged content to the ORIGINAL audit/payload-lifecycle lane's own pre-repair staging (17b1362-era), flagged as: "main ~/workspace checkout holds staged old 17b1362 content that would revert the fix -- a concurrent actor is working there; reconcile before further work there". The staged files were byte-identical (md5) to the 17b1362 versions: 957e3a450064a47a4946a86af8b2e715 (src), fff6b4e8ce22bd4f72f9a20b9f458595 (test). No separate owning lane; no unattributable work.

## Step 3 - Diff staged vs certified
Staged removed ALL certified hunks and added NOTHING:
(a) Missing from staged (regression risk): import calendar + calendar.timegm TZ fix; _via_erasure_flow ERASED gate; secret_assignment label aws_secret_access_key (G2); openai_project_key (G1), aws_access_key_id, stripe_secret_key, github_fine_grained_pat patterns; test sections 12 (3 smuggling shapes + ERASED + TZ) and 13 (G1/G2).
(b) Unrelated owned work in staged: NONE. Staged == 17b1362 byte-for-byte (verified by md5 + empty diff).

## Step 4 - Reconciliation
Reconciled files = fd8edef versions, written to working tree (cp from captured reference copies), then staged with explicit pathspecs:
  git add mission-control/payload_lifecycle.py mission-control/tests/test_payload_lifecycle.py
Result: working tree == fd8edef == HEAD for both files (diff empty; staged diff empty). The stale regression is gone from the index; no commit made.
Verified present: G1 \bsk-proj-[A-Za-z0-9]{16,}\b (line 112), G2 aws_secret_access_key in secret_assignment alternation (line 106), aws_access_key_id / stripe_secret_key / github_fine_grained_pat patterns (lines 113-116), calendar.timegm TZ fix (line 389, import calendar line 39), ERASED gate _via_erasure_flow (lines 340/357/458), test sections 12+13 (lines 274/352).

## Step 5 - Falsifier re-run (reconciled working tree)
- Lane suite mission-control/tests/test_payload_lifecycle.py: 66/66 PASS, exit 0, ALL GREEN (matches fd8edef reference 66/66).
- Spine outreach/tests/test_spine.py: 46/46 PASS, "OK: all spine tests green" (matches reference).
- Policy engine outreach/tests/test_pass_policy_engine.py: 63/63 PASS, "OK: all pass-policy-engine tests green" (matches reference).
- Independent falsifier /tmp/falsifier-p0-rerun.py (harness-independent, direct fixture feed): 21/21 PASS, exit 0.
  - G1 sk-proj- key: blocked by audit_metadata, blocked at envelope, value withheld.
  - G2 aws_secret_access_key= label: blocked by audit_metadata, blocked at envelope, value withheld.
  - Three original smuggling shapes (AKIA AKIAIOSFODNN7EXAMPLE, sk_live_, github_pat_): all rejected, all withheld, all blocked at envelope.
  - Direct ERASED transition refused with IllegalTransitionError from ACTIVE, STALE, SUPPRESSED; erasure flow still reaches ERASED with DATA_ERASURE_COMPLETED.
  - Sweep of 3600s-aged payload fires correctly under TZ=America/Denver, UTC, Pacific/Kiritimati (mktime regression absent).

## Remaining risks
- NONE introduced by this reconciliation: index and working tree for the two files are byte-identical to the certified fd8edef commit, and all three reference suites reproduce the certified pass counts exactly.
- Note for parent: other files in the checkout have unrelated staged/unstaged changes (AGENTS.md, BACKLOG_NOLAN.md, FAILURE_LEDGER.md, build-manifest.json, prospect-digest.md, western-co-prospects.jsonl, plus many untracked files) -- left untouched per the scope prohibition.
- Prohibitions honored: no reset, no clean, no checkout --, no stash drop, no blind add, no commit, no push, no untracked-file deletion; only the two named files plus ~/workspace/orca-mc-convergence/p0-capture/ were modified.
