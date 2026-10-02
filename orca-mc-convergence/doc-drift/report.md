# Documentation drift report — ORCA + Mission Control convergence track

Checked 2026-09-26 ~20:30 MDT. Scope: BRIEF.md, SCOREBOARD.md, SWARM-QUEUE.md,
WORKTREE-INVENTORY.md, worktree-inventory-2026-09-26-refresh.md vs git reality
in ~/workspace (origin https://github.com/piging2/PING). Read-only throughout.

## Method

- Every cited commit SHA verified via `git rev-parse --verify` in ~/workspace.
- Branch HEADs compared against documented certified SHAs.
- Test-count claims re-executed from archived commit content in /tmp (no repo writes).
- `git worktree list` + other-repo checkouts compared against inventory tables.
- Remote refs checked for "not pushed" claims.

## wrong-SHA: none

All 19 cited commit SHAs exist: 537d264, df91b4e, 86bfbc4, 28c92f4, 17b1362,
cacf7b2, 55b5d89, fd8edef, f7262f7, f336c80, ea750d5, db78888, f980649,
d5d56bc, 849cf7c, f9a4a42, d7b10a8, a65846d, ba653acb.

Branch HEADs match documented certified commits exactly:
mc/mission-intent-frontdoor=537d264, mc/consequence-policy-input=db78888,
mc/approval-request=cacf7b2, mc/mission-budgets=f336c80,
mc/pass-migration-proof=28c92f4, mc/pass-migration-supersession=d7b10a8,
mc/tenant-hostile-tests=a65846d, mc/frontdoor-hardening=537d264 (no commits
yet — consistent with "dispatched, no edits yet").

Supersession claim verified: d7b10a8 sits atop 4 real merge commits
(a8cf9cc, a96b71f, c9cb869, 558dbbd); all four sibling SHAs are exact
ancestors; "four additive merges, ZERO conflicts" holds.

"Not pushed" claims verified: no mc/* branch exists on origin
(only origin/feat/orca-unknown-outcome-port).

## stale-status

1. SCOREBOARD audit row parenthetical "(branch mc/audit-payload-lifecycle
   @ 86bfbc4)": branch tip is now ba653acb (backlog evidence commit,
   BACKLOG_PING.md only). The refresh report's own W1 row already explains
   this; certified audit code verified byte-clean vs HEAD. The certified-commit
   claims (@ fd8edef) are correct — only the branch-tip parenthetical is loose.
2. Main-checkout dirt: P0's "working tree = index = HEAD, byte-exact" was true
   at reconciliation; the checkout now has unrelated tracked modifications
   (AGENTS.md, BACKLOG_NOLAN.md, FAILURE_LEDGER.md, outreach/*.jsonl,
   your_files/*). Certified audit files verified clean vs HEAD — the P0 fix
   itself has not regressed; this is normal main-checkout churn.
3. /tmp/mc-hostile-test (P1 lane scratch) is gone. The refresh said to exclude
   it from retirement until the lane reports; the lane has since completed
   (SWARM-QUEUE P1 record), so cleanup is consistent, not a violation.

## wrong-count

1. Refresh report claims "28 git checkouts (22 R1, 1 each R2/R3/R4/R5/R6)".
   Its own table has 21 R1 rows (W1–W21); 22+5=27, not 28; rows total 26
   (21 R1 + 5 other-repo checkouts). SWARM-QUEUE repeats "28 checkouts +
   1 skeleton". The "28" is wrong by the report's own rows.
   Current reality: 23 git worktrees + 5 other-repo checkouts (fyd-build,
   demo-sites, hpp-clone, ping-ui-contract, fyd-write-boundary — all exist)
   + 1 non-git skeleton. Delta from refresh fully explained: -1
   /tmp/mc-hostile-test (P1 done, scratch cleaned), +3 new lane worktrees
   (tenant-hostile, mc-frontdoor-hardening, mc-pass-migration-supersession).

2. Test-count claims — ALL VERIFIED CORRECT by direct execution from archived
   commit content:
   - approval 68/68 @ cacf7b2: 68 PASS, 0 FAIL
   - audit 66/66 @ fd8edef: 66 PASS, 0 FAIL
   - front-door 14/14 @ 537d264: 14 test functions (exact structural match)
   - consequence 34/34 @ db78888: 34/34 checks passed
   - budget 39/39 @ f336c80: 39 passed, 0 failed
   - migration 12/12 @ 28c92f4: 12 test functions (exact structural match)
   - spine 46/46 @ df91b4e: 46 PASS

## unverifiable (minor)

1. 755a6e7c ("authorizeWorkOrder sha256" in the executor-of-record verdict):
   not a git object anywhere; a content hash of a function, unverifiable via git.
2. 03671937 replay-hash prefix: content hash, not a git object. Same category.

## Most misleading claim

The "28 checkouts" count in the refresh report (repeated in SWARM-QUEUE).
It is the only hard number that is false, contradicted by the report's own
table (26 rows; its own formula sums to 27). Nothing decision-affecting was
found: every SHA, branch tip, certified commit, test count, merge claim, and
push-status claim verified true.
