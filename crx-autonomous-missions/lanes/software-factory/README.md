# Software Factory Harvest Lane

Research-only lane. CLAIM is not IMPLEMENTATION. Every serious claim below is
grounded in an inspected source repository at a pinned commit, with file paths.
Nothing here is production proof. No building into CRX, no pushes, no
deployments, no credentials in any output.

Goal: extract transferable mechanisms for an autonomous software factory:
repository inspection, isolated mutation, patching, testing, review, merge
gating, recovery, and iteration. Extract mechanisms, never adopt systems. Do
not create a second orchestration universe. CRX target principle: verified
autonomous throughput, not agent count or report volume.

Companion artifact: `mechanisms.jsonl` (machine-readable mechanism records,
one JSON object per line, exactly the fields listed in this lane's contract).

## Evidence grading

- SOURCE: inspected in repository source at the pinned commit (file paths cited).
- ADOC: architecture decision record or in-repo doc verified in source.
- PUBLIC: public web evidence only, not source. Kept out of mechanisms.jsonl
  unless a source repository directly implements the mechanism.
- FALSIFIED: claimed mechanism not found at inspected HEAD. Recorded, never
  promoted into mechanisms.jsonl.

## Source inventory (all observed 2026-09-23)

| Project | Commit | Commit date | License (verified in repo) | Grade |
|---|---|---|---|---|
| SWE-agent | 3ea751c087f32b16e039a2233dd6eefecef325d5 | 2026-07-16 | MIT (LICENSE) | SOURCE |
| mini-SWE-agent | 04d809ceab9df28f9adaed044884180159172930 | 2026-09-03 | UNVERIFIED in this session | SOURCE (license pending) |
| Claude Squad | ce1ffb4392b01f38e2c4599c7c84d2a93973b138 | 2026-08-20 | AGPL-3.0 (LICENSE.md) | SOURCE |
| bors-ng | ca725797e53a88e954998de0bbb14a8a5acb13ab | 2024-01-31 | Apache-2.0 (LICENSE-APACHE) | SOURCE, archived repo |
| Fountain | a537278186864a2a93e658af9165c7c5c43186f7 | 2026-09-10 (ADR) | AGPL-3.0 (LICENSE) | SOURCE |
| Aider | 5dc9490bb35f9729ef2c95d00a19ccd30c26339c | 2026-05-22 | Apache-2.0 (LICENSE.txt) | SOURCE |
| AIOS (devin-lai) | ac4d0dd4d296938642064e54004e28009f559742 | 2026-07-27 | MIT (LICENSE) | SOURCE |
| Mergify | 003cd3eba41e524ba40fb98fcb652468f9705aea | 2023-09-07 | n/a | FALSIFIED (source unavailable) |
| OpenHands (current HEAD) | 1b0dc0b20f224a4e40a31ca1790b51208145bfe5 | 2026-09-23 | n/a | FALSIFIED (old runtime gone) |
| Copilot coding agent | n/a | n/a | n/a | PUBLIC only |
| Jules | n/a | n/a | n/a | PUBLIC only, conflicting claims |
| Devin | n/a | n/a | n/a | PUBLIC only |

License note: AGPL-3.0 sources (Claude Squad, Fountain) are harvested as
PATTERN (technique transfers, code does not lift into CRX) to avoid license
exposure. MIT/Apache sources may be ADAPT.

---

## 1. WORK PACKET

A work packet is a typed, serializable unit of work with identity, scope,
acceptance criteria, and lineage. Two strong source implementations.

### AIOS: task file as packet + DAG scheduler (SOURCE, ADAPT)

- `internal/spec/task.go`: Task is a markdown file with YAML frontmatter:
  `id`, `kind`, `depends_on`, `status`, `acceptance` (REQUIRED; a task with
  no acceptance criteria is rejected at parse time), `mcp_allow`,
  decomposition lineage (`depth`, `parent_id`, `decomposed_into`).
- `ValidTaskID` is an explicit security boundary: task IDs come from model
  output, so they are validated before reaching filesystem joins or git
  command lines (`..` rejected, length capped, charset restricted).
- `internal/orchestrator/scheduler.go`: Scheduler is a per-run DAG
  bookkeeper. Workers pull ready TaskIDs from a FIFO; `Done(TaskResult)`
  unblocks dependents. Task IDs double as branch names (`aios/task/<id>`)
  and worktree directories, which is why ID validation is load-bearing.
- Invariant: no packet without acceptance criteria; no packet whose ID can
  escape its namespace.

### SWE-agent: problem statement protocol + pinned base (SOURCE, ADAPT)

- `sweagent/agent/problem_statement.py`: problem statement protocol carries
  `id`, text, and extra fields; text IDs derive from a short SHA-256 prefix
  (deterministic identity from content).
- Repository config carries `base_commit`; `sweagent/environment/repo.py`
  pins and cleans to it (fetch, restore, hard-reset, checkout base, clean
  untracked; local repos fail if dirty).
- Invariant: the base a run started from is recorded in configuration, not
  reconstructed from memory.

### Falsified

- mini-SWE-agent packets are implicit in run configs, not a typed packet
  with acceptance gates. Claude Squad instance storage is resumable state,
  not a DAG work packet.

### CRX analog

MissionRuntime mission as the packet: deterministic mission ID as idempotency
key; canonical packet fields (id, scope, acceptance, base SHA, attempt,
causation/correlation); typed ID validation at the boundary where model
output meets storage/commands.

---

## 2. WORKTREE PER MUTATION

Each mutation gets its own git worktree/branch isolated from the authoring
checkout and from other mutations.

### Claude Squad: worktree per session from immutable HEAD (SOURCE, PATTERN)

- `session/git/worktree_ops.go`: creates a fresh branch/worktree from a
  resolved immutable HEAD SHA; explicitly avoids inheriting uncommitted
  changes; cleans stale registered worktree, orphan directory, and old
  branch before recreation; records the base commit SHA.
- One tmux session binds one branch/worktree; git itself prevents the same
  branch being checked out in multiple worktrees; unique worktree path gets
  a nanosecond suffix.
- `session/storage.go`: durable resumable instance packet (title, repo path,
  branch, status, dimensions, timestamps, program, AutoYes, worktree path,
  session name, base commit SHA, diff stats/content).
- Cleanup: worktree removal, branch deletion for owned branches, worktree
  pruning. Caution: cleanup uses forceful deletion; do not copy without
  stronger ownership checks.

### AIOS: worktree manager with detached merge path (SOURCE, ADAPT)

- `internal/worktree/worktree.go`: Manager with `Create` (per task),
  `CreateDetached` (for the merge queue's own git operations),
  `Remove`, `MergeFF`, `Diff`, `List`, `PruneStale`.
- The merge queue runs its git operations in a dedicated detached worktree
  so the primary checkout is never touched and live task branches stay
  checked out elsewhere.

### Falsified

- SWE-agent: no worktree-per-mutation factory; single checkout pinned to a
  base commit. mini-SWE-agent: one isolated environment per instance in
  batch runs, but no git worktree discipline. bors-ng: server-side, no
  worktrees. OpenHands old runtime claims: absent at current HEAD.

### CRX analog

One worktree per mutation scope, created from the recorded base SHA, with
the worktree path and base SHA carried on the packet and on every canonical
event. Stale worktree cleanup keyed to owned scope only.

---

## 3. ONE WRITER

Exactly one authority may advance the integration ref. Concurrent agents
never race on the landing ref.

### AIOS: serial merge queue with compare-and-swap (SOURCE, ADAPT)

- `internal/orchestrator/mergeq.go`: a single goroutine drains a channel of
  MergeRequests. Comment states the invariant directly: "The queue is the
  only writer, so old == stagingHead holds".
- Final advance uses `git update-ref refs/heads/<staging> <newTip>
  <stagingHead>`: compare-and-swap; a mismatch means an outside mutation
  and must fail loudly rather than clobber the ref.
- Fast path (staging unmoved since the task branched) advances the ref with
  a fetch refspec, which refuses non-fast-forward by default.
- Shutdown drains buffered requests with explicit blocked acks so workers
  never wait forever.

### bors-ng: atomic batch landing (SOURCE, ADAPT)

- `lib/worker/batcher.ex`, `complete_batch/3`: pushes the exact tested batch
  commit to the target ref only after the status summary is `:ok`;
  non-fast-forward push is a distinct typed outcome, not silently retried.

### Falsified

- Claude Squad: one writer per branch enforced by git worktree semantics,
  but no factory-level single landing writer. SWE-agent/mini-SWE-agent:
  batch runners, no shared landing ref to serialize.

### CRX analog

Exactly one mutation lease per declared scope; one landing authority that
advances the integration ref via compare-and-swap on the expected base SHA.
Concurrent workers submit to the gate; they never push the ref themselves.

---

## 4. STALE BASE DETECTION

Detect that the base moved under a proposed change, and handle it as a typed
state, not as silent success or silent discard.

### bors-ng: head race detection (SOURCE, ADAPT)

- `lib/worker/batcher.ex`, `start_waiting_batch`: reads the current target
  branch, builds a temporary staging commit, fetches each PR head, and
  compares `pr.head_sha` to the recorded `patch.commit`. Mismatch becomes
  `:race`, a distinct state from `:conflict`.
- Stale heads are re-evaluated against the new base rather than merged on
  the old assumption.

### AIOS: rebase path with typed blocks (SOURCE, ADAPT)

- `MergeQueue.process`: if `stagingHead == req.ParentSHA`, fast path;
  otherwise the rebase path: detach at task tip, rebase onto staging,
  `rebase --abort` on conflict (using `context.WithoutCancel` so recovery
  survives run cancellation), blocked with typed `BlockReason` codes
  (`CodeRebaseConflict`, `CodeFFFailed`, `CodeFFAfterRebaseFailed`, ...).
- Rebase runs on a detached HEAD so it never claims a branch a live task
  worktree still holds.

### Falsified

- Claude Squad: records base commit SHA but has no land-time stale-base
  validation. SWE-agent: base is pinned per run, no cross-run staleness
  handling. The brave-dev-loop public doc notes the related rule "a
  pre-rebase green does not carry over" (PUBLIC, docs only).

### CRX analog

Non-fast-forward is a typed retryable stale-base state. Rebase paths require
re-review when the diff changed and re-verify on the rebased tree before the
ref advances.

---

## 5. PATCH ARTIFACT

The proposed change persists as an immutable artifact, independent of any
agent's memory or working tree.

### SWE-agent: durable per-instance patch (SOURCE, ADAPT)

- `sweagent/run/hooks/apply_patch.py`: saves `<instance>/<instance>.patch`
  for every run. Concurrent batch workers use thread-local per-instance
  state so patches are never overwritten by a sibling run.
- `sweagent/run/run_batch.py`: per-instance output directories and configs,
  typed exit-status report, skip of already-completed trajectories
  (idempotent reruns).

### Falsified

- mini-SWE-agent: patch recorded in run records (`model_patch` field), but
  no dedicated immutable patch-file artifact with digest discipline.
- No source in this lane attaches a content digest to the patch artifact;
  the digest requirement is a CRX analog addition, not a harvested claim.

### CRX analog

Proposed change persists as an immutable patch artifact plus content digest
and base SHA, emitted as a canonical event. Reviewers and gates consume the
artifact, never author memory.

---

## 6. TEST RECEIPT

A test receipt is evidence that specific checks ran against a specific tree,
produced by an authority other than the author.

### Fountain: tested-tree witness (SOURCE, PATTERN; AGPL)

- `scripts/ci/gate.py`: validates the complete CI plan before publishing the
  stable required check. A per-event probe table (`PROBES`):
  `pull_request` expects the `changes` probe; `push` expects `already-tested`;
  `merge_group` expects both. Fail-closed: a probe that makes no decision
  raises; any job result mismatch raises.
- On success (non-push events) it writes `tested-tree.txt` containing the
  exact tree SHA that CI tested.
- `scripts/ci/already-tested.sh`: the reuse probe. Tree equality is the
  single safety property: a candidate run counts only if it recorded this
  exact tree. Missing/expired artifacts, old workflows, and API failures
  all fall back to full CI. A batched merge group combines trees no PR run
  ever had, so the comparison fails on its own and the full suite runs.
- ADR `decisions/0050-a-merge-queue-tests-what-it-merges.md` (commit
  a537278186864a2a93e658af9165c7c5c43186f7, 2026-09-10): the queue tests
  the merge tree and publishes the tested-tree artifact; main-push CI links
  back through the `gh-readonly-queue/<base>/pr-<number>-<sha>` branch and
  reruns only when it cannot prove the landed tree equals the tested tree.
- Caveat from the ADR: rulesets are external state and admin bypass exists,
  so the guarantee is disciplinary unless external configuration is verified.

### SWE-agent: independent evaluator receipt (SOURCE, ADAPT)

- `sweagent/run/hooks/swe_bench_evaluate.py`: an independent `sb-cli`
  evaluator receives predictions and writes `results.json`. Evaluation
  failure is logged as failure, never converted into success.

### mini-SWE-agent: trajectory receipt (SOURCE, license UNVERIFIED)

- `src/minisweagent/agents/default.py`: serialized trajectory (model stats,
  config, agent type, version, exit status, submission, full messages,
  environment/model serialization, format version) saved in `finally` after
  every iteration. Typed exits cover limits, timeouts, repeated format
  errors, and exceptions with traceback. A trajectory proves execution
  history; it does not by itself prove tests passed.

### Falsified

- Claude Squad: no independent test receipt. bors-ng: CI statuses are the
  receipt, but they attach to the bors-synthesized batch commit (see
  section 8), not to a separately published witness artifact.

### CRX analog

Test receipt as a canonical event: command identity, environment/version,
start/end, exit code, stdout/stderr artifact refs, tested tree SHA, evidence
digest. Gates and reviewers accept receipts, not assertions.

---

## 7. REVIEWER AGENT

Review is a separate authority from authorship, consuming the patch and the
receipts, with bounded iteration.

### AIOS: coder/reviewer round loop with structured issues (SOURCE, ADAPT)

- `internal/orchestrator/orchestrator.go`: `CoderInput` hands each revision
  round the prior round's diff, verify results, and reviewer issues;
  `ReviewResult` returns structured `ReviewIssue`s. Rounds are budgeted
  (`MaxRounds`); stall detection fires on consecutive identical-fingerprint
  rounds ("the model needs another pass" vs "the coder cannot resolve what
  the reviewer is asking"); escalation rounds surface the reviewer's
  outstanding issues as hard constraints. History compression keeps long
  loops bounded (`CompressRounds`).

### SWE-agent: independent review with bounded retry (SOURCE, ADAPT)

- `sweagent/agent/reviewer.py`: `ReviewSubmission` carries trajectory,
  aggregate info, and model stats. An independent reviewer samples scores,
  rejects invalid/out-of-range scores, applies failure penalties, and can
  select the shortest solution among tied best scores. Retry loops bounded
  by attempts, acceptance count, and cost.

### Aider: planner/editor separation (SOURCE, PATTERN)

- `aider/coders/architect_coder.py`: the architect model proposes a plan; a
  separate editor coder/model performs file mutation; human confirmation is
  default unless auto-accept is enabled; the editor gets clean message state
  and restricted configuration. This is planner/editor role separation, not
  reviewer/author separation. Do not mislabel it.

### Falsified

- Claude Squad: no autonomous reviewer. bors-ng: review is human PR review
  plus CODEOWNERS, not an agent. Jules public claims mention review feedback
  loops (PUBLIC, and conflicting on auto vs manual PR creation). Devin public
  claims mention review workflow via third-party skill docs (PUBLIC).

### CRX analog

Reviewer runs as a separate WorkerRuntime role from the mutator, consuming
patch artifact plus test receipts, emitting typed review issues; iteration
is budgeted with stall detection and escalation to hard constraints.

---

## 8. MERGE GATE

The gate synthesizes the candidate integration tree on the current base,
verifies freshness and approvals, runs the required checks, and lands the
exact tested tree.

### bors-ng: preflight gate on the synthesized batch (SOURCE, ADAPT)

- `lib/worker/batcher.ex`, `patch_preflight/3` requires: no CI-skip marker,
  no blocking labels, no configured status in error, no configured status
  still running, every required status present, review threshold satisfied,
  no changes-requested review, CODEOWNERS approvals where enabled, and
  approval tied to the current commit where `up_to_date_approvals` is
  enabled.
- `start_waiting_batch`: builds the staging tree by merging patches onto the
  current target; CI statuses attach to that synthesized batch commit, not
  to the individual PR heads. Core invariant: author PR checks are
  insufficient; build and test the exact integration tree, then land that
  exact SHA.
- `complete_batch/3`: pushes the exact tested batch commit to target only
  after the status summary is `:ok`.
- Repository is archived (last commit 2024-01-31); harvest the mechanism,
  do not adopt the system. IMPLEMENTATION is not PRODUCTION PROOF of current
  fitness, though bors's historical production use is well documented.

### AIOS: re-review and re-verify on the rebase path (SOURCE, ADAPT)

- `MergeRequest` carries hooks: `ReReview(newDiff)` called when the rebased
  diff differs from the approved diff (normalized comparison); `ReVerify()`
  runs project checks against the rebased state ("a rebase can succeed
  mechanically while still breaking tests"); `SyncWorktree` moves the live
  task worktree to the rebased tip so gates run against the right tree with
  the project's installed dependencies.
- Recovery discipline: rebase abort under `context.WithoutCancel` so a
  canceled run cannot leave the repo mid-rebase; SIGINT (not SIGKILL) to git
  so locks clean up, with a 5s hard-kill fallback.

### SWE-agent: PR gate as draft, not merge (SOURCE, ADAPT)

- `sweagent/run/hooks/open_pr.py`: requires nonempty submission,
  `exit_status == submitted`, open issue, no assignee, unlocked issue, and
  optionally no existing associated fix commits. Creates a DRAFT PR.
  This is a submission gate, not a merge gate; landing authority stays
  outside.

### Falsified

- mini-SWE-agent, Claude Squad: no merge gate implementation.
- Mergify: repository now holds only public issue-tracker material; merge
  engine source unavailable. Do not cite Mergify product claims as
  implementation.

### CRX analog

Merge gate as a single-writer service: synthesize candidate tree on current
integration base, verify no stale head/scope conflict, confirm approvals
bind to the current SHA, rerun required checks on the exact tree, land that
exact SHA via compare-and-swap.

---

## 9. ROLLBACK

Recovery from a failed or bad landing. The honest finding: mature sources
invest in pre-merge gating and typed recovery states, not in silent
auto-revert.

### bors-ng: non-FF requeue and failure bisection (SOURCE, ADAPT)

- Non-fast-forward push: clone/requeue the batch against the new base
  without bisecting, because the content passed tests but the base changed
  (stale base, not bad content). Unknown push failures do not retry
  indefinitely. Push retries use bounded exponential backoff.
- Failed batches are split/bisected via `lib/worker/batcher/divider.ex`
  rather than discarding all successful work. Cancellation preserves and
  retries uncanceled patches.

### Falsified: no verified silent auto-revert implementation

- No inspected source implements automatic revert of a landed commit on
  post-merge signal. Public material only: debugg.ai docs describe
  revert-PR policy snippets and "revert quickly but safely" guidance
  (PUBLIC); dentroio/agentic-factory wiki documents pre-merge auto-fix
  loops with guards (max 2 attempts per PR tracked via labels; autofix
  commit tags prevent self-triggering) (PUBLIC, docs). Fountain's ADR
  references Landcastle-style "aggressive backouts" as industry practice,
  not as inspected implementation (ADOC context).
- Recorded as a gap: ROLLBACK as "detect bad landing, revert automatically"
  has no source-verified mechanism in this lane. bors-ng's recovery model
  (never land bad content; recover from stale base and partial batch
  failure) is the harvested substitute.

### CRX analog

Prefer the bors model: make bad landings structurally rare (test the exact
tree, CAS the ref), and type every recovery state (stale-base requeue,
bisect, bounded retry). Any revert path must be an explicit canonical event
with causation back to the failing receipt, never a silent push.

---

## 10. POST-MERGE VERIFICATION

Prove the landed tree is the tested tree, then check the world the tree
describes.

### Fountain: main links back to the queue run (SOURCE, PATTERN; AGPL)

- `scripts/ci/already-tested.sh` on `push` (main): the queue tested this
  tree under a `gh-readonly-queue/<base>/pr-<number>-<sha>` branch moments
  ago, so that run is the proof; a PR merged outside the queue still reaches
  its own `pull_request` run. Main reruns full CI only when it cannot prove
  the landed tree equals the tested tree. Tree equality stays the single
  safety property.
- `scripts/ci/gate.py`: only complete CI may publish the tested-tree
  evidence; the stable required check is published only after the full plan
  validates.

### Falsified

- No inspected source implements post-merge runtime/deployment probing
  (canary, production e2e, rollback triggers) as source code. bors-ng has
  no post-merge verification by design: the guarantee is pre-merge. This
  is a real gap in the harvested set, not a missing search.

### CRX analog

Post-merge verification compares the landed tree SHA to the tested-tree
witness from the gate; mismatch is a typed incident. Any runtime probe
(canary, smoke) is a separate receipt-producing step whose failure feeds
the rollback policy, not a silent sidecar.

---

## Public-evidence systems (not harvested as source)

- GitHub Copilot coding agent: public blog describes an ephemeral GitHub
  Actions environment, `copilot/` branch, tests/linters and iteration,
  draft PR, PR review feedback loop. Public evidence only.
- Jules: public claims describe an isolated VM per task, plan/execute flow,
  branch/PR workflow. Conflicting public claims exist on whether PR
  creation is automatic or manual; recorded, not resolved.
- Devin: public claims describe sandbox, tests, PRs, review feedback;
  third-party skill docs describe a Devin review workflow. Public only.
- overcut-ai/overcut-playbooks `fix-ci`: public README for a CI auto-fix
  loop (agent-pr label gating, loop guards). Public only.

## Execution note (corrected error)

During this lane, `/tmp` filled to 100% and several third-party repositories
were cloned under the shared workspace at
`lanes/software-factory/_src/` instead of `/tmp`, violating this lane's
boundary ("clone to /tmp; do not commit third-party code anywhere shared").
Corrected: all needed evidence was extracted into this README and
mechanisms.jsonl, the entire `_src/` directory was deleted, and its absence
was verified. No third-party code was committed or pushed. Only README.md
and mechanisms.jsonl remain as lane outputs.
