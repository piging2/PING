# Effect Class 02: Git Mutation

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `/home/nolan/ping/gateway/commit_authority.js` (lines
164-196, 287-291), `gateway/git_persistence_backend.js`,
`AUTOMATED_COMMIT_AUDIT.md` (2026-06-25), memory 2026-09-24 (fyd-factory
commit `4d0ddf7b`, ping-perfecting-pass backlog commits).

## Who commits today

The runtime does NOT perform real git operations. In
`gateway/commit_authority.js`, `_gitAdd`, `_gitCommit`, `_gitPush`,
`getGitStatus` are ALL "Placeholder — in production, use actual git"
(lines 164-196); `_gitPush` unconditionally returns `{success: true}`.
`gateway/git_persistence_backend.js` `_createGitCommit` is also a
placeholder: it fabricates a pseudo-SHA via
`deterministicIdAuthority.generateIdFromObject({commit_id, timestamp})` and
stores it as `git_commit_sha`.
Real commits are made by agents via shell, explicitly staged, under the
standing rule **local commits only, never push** (ping-perfecting-pass
commits `BACKLOG_PING.md`/`BACKLOG_NOLAN.md` immediately).
`AUTOMATED_COMMIT_AUDIT.md` (2026-06-25) confirmed no automated commit
system exists.

- **Q1 Identity:** UNSTABLE by construction in the runtime.
  `_generateCommitId(patchId)` = `commit_` + `CanonicalAuthority.hash({patch_id,
  timestamp})` (lines 287-291) — wall-clock timestamp in the hash means every
  call yields a DIFFERENT commit_id for the same logical patch. The
  git_persistence pseudo-SHA also hashes a timestamp. Real-world identity
  today = the agent-authored git SHA after the fact, or the
  `(patch_id, mission_id)` pair in the `commits` table. To port ORCA
  semantics, the timestamp must come out of the hash inputs.
- **Q2 Provider idempotency key:** NO native support (git commit IDs are
  content-addressed over tree+message+author+timestamp; re-commit always
  yields a new SHA). Bolt-on only: `git log --grep=<mission/patch marker>`
  pre-check, or a UNIQUE constraint on `(patch_id)` in the `commits` table
  (currently `commit_id` PK only — no patch uniqueness).
- **Q3 Queryable:** YES, strongly. `commits` table:
  `commit_id PK, patch_id, mission_id, git_commit_hash, branch, author,
  pushed, push_status, witness_hash, created_at, pushed_at`, with
  `getCommit`/`getCommitsForPatch`/`getCommitsForMission`. Plus `git log`
  itself. CAVEAT: the runtime's stored `git_commit_hash` is a fabricated
  pseudo-hash, NOT a real SHA — reconciliation against real git must use the
  commit message's mission/patch markers, never the stored hash.
- **Q4 Reconcile:** BUILDABLE; the authority's query methods already exist.
  Probe = `commits` table lookup by (patch_id, mission_id) crossed with
  `git log --grep` / `git rev-parse HEAD` / `git status`.
- **Q5 Reversible:** YES for local commits (`git revert`; `git reset` for
  unpushed work). Push is revertible only via revert commits — which is why
  the standing never-push rule is load-bearing.
- **Q6 UNKNOWN means:** divergence between DB record and repo truth: either
  an agent committed via shell without recording in `commits`, or the
  authority recorded a commit whose git op never ran (placeholders always
  "succeed"). `pushCommit` marks `pushed=TRUE` on a no-op `_gitPush`.
- **Q7 Retry safe:** when a pre-check (`git log --grep`, `commits` lookup)
  finds no matching commit AND the commit_id is derivable deterministically
  from the patch (fix the timestamp-in-hash first). With current code, retry
  inserts a SECOND `commit_id` for the same patch — must upsert on
  `(patch_id)` instead.
- **Q8 HOLD:** when push is involved (remote-visible state); when the working
  tree contains other-lane dirty files (agents must inventory and commit only
  coherent changesets — "never cleanup/reset as reconciliation"); when
  duplicate-commit detection is inconclusive.

Confidence: HIGH.

## Port guidance

Three prerequisites before wiring: (1) drop the timestamp from the
commit_id hash (same logical patch -> same identity); (2) record the REAL git
SHA from shell commits into `commits.git_commit_hash` instead of the
fabricated pseudo-SHA; (3) treat every placeholder `{success:true}` as "no
evidence of effect," never as success. Push stays human-gated.
