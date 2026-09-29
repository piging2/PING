# DIRTY-TREE ELIMINATION LAW — EFFECTIVE 2026-09-29 ~09:52 MDT
**From Nolan, binding. Amends the commit-every-time rule. Read with CONVERGENCE-MODE.md and CONVERGENCE-LAWS.md.**

## The problem

71 worktrees plus accumulated untracked/dirty material. Requiring everything to reach "finished" before it can be committed is itself creating archaeological debt.

## The law

STOP LEAVING VALUABLE WORK UNTRACKED BECAUSE IT IS "NOT FINISHED."
Every existing dirty/untracked artifact must now receive a disposition. There are only five:

### 1. COMMIT — ACTIVE
Useful work belonging to an active/reached MVP path. It does not need to be finished. Commit it honestly as:
`WIP: <semantic unit> — <known incomplete boundary>`
A WIP commit means durable recoverable state, not verified completion.

### 2. COMMIT — REFERENCE
Useful implementation/research that should survive but must not become runtime authority. Commit it on its existing appropriate branch/worktree with explicit reference status. Do not merge merely because it is committed.

### 3. ARCHIVE / DEMOTE
Valuable historical implementation that no longer belongs in the reached product path. Preserve it using the repository's existing archival mechanism/location where one exists. DO NOT INVENT A NEW ARCHIVE SYSTEM. Mark HISTORICAL, SUPERSEDED, or REFERENCE as appropriate.

### 4. DELETE ONLY WHEN PROVEN DISPOSABLE
Generated output, caches, temporary files, reproducible build products, editor junk, or proven duplicate material may be removed. Before deletion establish that it is reproducible or semantically worthless. DO NOT DELETE UNIQUE IMPLEMENTATION JUST BECAUSE IT IS INCONVENIENT.

### 5. COLLISION / UNKNOWN
If ownership, provenance, or purpose cannot be established: DO NOT MODIFY IT. Record UNKNOWN-OWNER, UNKNOWN-PURPOSE, POSSIBLE-COLLISION and resolve it through archaeology.

## The distinction

COMMIT ≠ COMPLETE
COMMIT ≠ VERIFIED
COMMIT ≠ INTEGRATED
COMMIT ≠ PUSHED
COMMIT ≠ REACHED

A commit means: THIS STATE IS DURABLE, ATTRIBUTABLE AND RECOVERABLE. That's all. Therefore unfinished but valuable work should normally be committed rather than left floating indefinitely.

## No more anonymous dirty state

For every dirty/untracked file across the active FYD/PING/CRX worktrees, classify it:
ACTIVE-WIP / REFERENCE / HISTORICAL-SUPERSEDED / GENERATED-DISPOSABLE / COLLISION-UNKNOWN
Then disposition it accordingly. UNTRACKED IS NOT A LONG-TERM STORAGE CLASS.

## Do not repeat 6bccde9 blindly

The goal is not `git add -A` followed by a giant mystery checkpoint. The existing law remains:
STATUS → OWNERSHIP → CLASSIFICATION → SECRET CHECK → EXPLICIT PATH STAGING → REVIEW DIFF → COMMIT → REPORT SHA
The current rules already prohibit `git add .`, `git add -A`, reset/clean, and overwriting another lane. Preserve that.

THE CHANGE IS THAT "UNFINISHED" IS NO LONGER A REASON TO LEAVE OWNED VALUABLE WORK UNCOMMITTED.

The target is not "commit all dirty files" literally. The target is: eliminate all UNCLASSIFIED dirty files. A known, owned, actively edited dirty file is normal; 71 worktrees full of anonymous archaeological state is not.

## Worktree reduction

71 stranded worktrees is now itself convergence debt. Do a bounded worktree disposition sweep. For each record:
WORKTREE / BRANCH / HEAD / DIRTY? / UNTRACKED? / OWNER / PURPOSE / UNIQUE COMMITS / UNIQUE DIRTY VALUE / SECRET RISK / REACHED? / HARVESTABLE? / DISPOSITION

Allowed dispositions: KEEP-ACTIVE / COMMIT-WIP-THEN-PARK / HARVEST-THEN-PARK / REFERENCE-ARCHIVE / SUPERSEDED / SAFE-REMOVE-WORKTREE / BLOCKED-COLLISION

Removing a Git worktree is acceptable only after its valuable state is durably represented by commits or otherwise proven disposable. Do not destroy branches merely to reduce the count.

REPURPOSE BEFORE REIMPLEMENT: before starting another FYD implementation, search these stranded branches/worktrees. If an implementation already solves 70–90% of the required semantic unit, harvest it.

The purpose of this sweep isn't cosmetic cleanliness. It is to convert:
STRANDED IMPLEMENTATION → REACHED PRODUCT CAPABILITY
or STRANDED IMPLEMENTATION → DURABLE REFERENCE
or STRANDED JUNK → PROVEN DISPOSAL.
Nothing remains ambiguous indefinitely.

## Security exception

DO NOT COMMIT SECRET MATERIAL JUST BECAUSE THIS LAW SAYS COMMIT. token.json, .env.base, credentials, private keys, provider tokens, dumps containing credentials, or other secret-bearing material are excluded. Quarantine/classify them and follow the separate containment decision. The secret check happens before staging.

## Do not let cleanup reopen the frontier

The product frontier remains: ASK FYD → EVIDENCE, then WHY THIS, then OWNER CORRECTION, then REGENERATION SURVIVAL. No new frontier. The same graph powering both the generated site and evidence-bound concierge is the next architectural proof. Cleanup runs as a bounded convergence lane, not as the new product mission. Keep Ask FYD moving simultaneously.

## Report the number down

Every four-hour ledger now includes: WORKTREES TOTAL / DIRTY WORKTREES / UNTRACKED FILES / ACTIVE-WIP COMMITTED / HARVESTED / DEMOTED-ARCHIVED / PROVEN DISPOSABLE / COLLISION-UNKNOWN / SECRET-BLOCKED / WORKTREES SAFELY RETIRED, and most importantly: STRANDED VALUABLE IMPLEMENTATION REMAINING. That number moves down.

## Immediate order

Do not wait for all 71 worktrees to become "finished." PRESERVE FIRST. CLASSIFY SECOND. HARVEST THIRD. RETIRE LAST. Commit owned valuable unfinished work as honest WIP. Commit durable reference work as reference. Demote superseded architecture. Delete only proven disposable output. Stop on ownership collisions. Never commit secrets. Never indiscriminately stage the tree. Keep Ask FYD moving simultaneously.

FEWER MYSTERY FILES, FEWER MYSTERY WORKTREES, MORE DURABLE STATE, MORE REACHED PRODUCT.
