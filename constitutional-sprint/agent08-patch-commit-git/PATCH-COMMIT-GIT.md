# AGENT 08 — Patch / Commit / Git Authority Map

**Sprint:** constitutional convergence, Phase 1 (P0) · **Date:** 2026-09-23 ~20:00 MDT
**Scope:** read-only audit of the patch→commit→push pipeline in both repos.
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` (worktree of `/home/nolan/projects/ping`, branch `constitutional-convergence-v2`, HEAD `a69bb68f`, working tree **CLEAN** — verified at audit time); (b) CANONICAL CORE `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`, inspect-only; 4 modified + 13 untracked at audit time).
**Rules honored:** no destructive git op, no staging, COMMITS CREATED: NONE. No patch was applied by this agent (audit-only mandate, WRITER-OWNERSHIP.md rule: "agent08-git: AUDIT ONLY, never self-applies").

---

## 1. Executive verdicts

**Identity / attestation: NOT ATTESTABLE.**
- Adapter repo identity: `user.name=Pigi`, `user.email=pigi@ping.local` (from `/home/nolan/projects/ping/.git/config`, shared by all 12 worktrees of that repo). Recent commits: author=committer=Pigi/pigi@ping.local; one older commit Pigi/nolan@ping.social.
- Core repo identity: `Trish Nikitha <trishnikitha@gmail.com>` (human); one recent commit `Pigi <pigi@ping.social>`.
- `git log --show-signature` on both repos: **zero signed commits**; no GPG configured (matches stale GIT_AUTHORITY_AUDIT.md, 2026-06-23, which also found no signing).
- Consequence: commit identity is a local gitconfig string. Any process with Pig shell access (every agent in this program, via the shared SSH path) can set `user.name`/`user.email` to anything and commit as Nolan or as another agent. There is no cryptographic binding between a commit and its claimed author.

**Dirty-state protection: NONE AT THE GIT LAYER.**
- Adapter repo hooks: all `.sample` — no pre-commit, no pre-push, no commit-msg guard (`/home/nolan/projects/ping/.git/hooks/` verified).
- Core repo hooks: only the stock git-lfs `post-merge` hook; everything else `.sample`.
- Main worktree `/home/nolan/projects/ping` (branch `fyd-factory`): **104 dirty/untracked entries** and growing (task brief said 66; it is now 104). All worktrees share one `.git` and one identity config. A commit executed from the wrong worktree directory would sweep 104 unrelated entries into one commit with zero mechanical resistance.
- The only dirty-state protection that exists is **procedural**: standing invariant #2 (COMMITS CREATED: NONE) + coordinator instructions. No tool enforces it.

**Automated commit tooling: DOES NOT EXIST (verified against code).**
- `AUTOMATED_COMMIT_AUDIT.md` (2026-06-25) concluded no 2:00 AM automated commit system exists. Re-verified: no cron/systemd/schtasks on the Pig for git commits (audit evidence stands); the only scheduled workflow in the core repo is `.github/workflows/constitutional-learning-loop.yml` (cron `0 3 * * *` UTC) and its steps are checkout + verification only — no `git commit`, no push, no token usage beyond checkout (`grep` over the workflow: only match is `actions/checkout@v4`).
- The name-collision trap: `runtime/kernel/commit-service/` commits **journal events**, not git commits. It is an Express server with no `start` script, referenced by no compose file and no start script → **DORMANT**. Its docs (COMMIT_SERVICE_CLEANUP.md) correctly describe it as delegating hashing/canonicalization to CertificateAuthority/CanonicalJson. It has nothing to do with `git commit`.

---

## 2. The actual mission → patch → review → commit → push path (live, this sprint)

This is the pipeline that is REALLY running. It is procedural (agents + files), not mechanical (no code enforces it):

| Stage | Mechanism (live) | Evidence |
|---|---|---|
| Mission | Parent orchestrator assigns agent tasks; STANDING-INVARIANTS.md (#2 COMMITS CREATED: NONE; #5 core is propose-only) | `~/workspace/constitutional-sprint/STANDING-INVARIANTS.md` |
| Patch proposal | Agent writes diff + WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT under `~/workspace/constitutional-sprint/patches/<agent>/` | MASTER-LEDGER.md:30 ("PATCH TARGET RULE"); `patches/agent01-event-authority/` exists (empty — no patch proposed yet) |
| Patch application | Owning agent applies to adapter worktree `/home/nolan/projects/ping-constitutional` via file edits ONLY, no commits | WRITER-OWNERSHIP.md rules 1–2 |
| Review | Agent 20 (competing-proposal detection) + coordinator enforcement of WRITER-OWNERSHIP.md; detection-after-the-fact, not prevention | WRITER-OWNERSHIP.md header |
| Commit | **NOBODY in the sprint.** Eventual human-operator commit outside the program | Standing invariant #2; zero commits created by any agent this sprint |
| Push | Adapter: `origin git@github.com:piging2/fyd.git` (SSH, git-credential-manager on Windows side). Branch `constitutional-convergence-v2` has **no upstream tracking** (not pushed). Core: `origin https://github.com/ngesk2/crx-runtime.git` (stale June incarnation, effectively unused) | `git remote -v`, `git branch -vv` on both repos |

Key structural fact: **the adapter is a git worktree** (`git rev-parse --git-common-dir` → `/home/nolan/projects/ping/.git`; worktree list shows 12 worktrees: fyd-factory, fyd-preview-wt, ping-deploy-head, ping-fyd-deploy, lane/l-secret-broker, 3× tenanos-wave/*, plus detached ones). Branch/worktree policy is owned by whoever runs `git worktree add` — currently 5+ parallel lanes (FYD waves, Tenanos waves, deploy, lane-L) share the same `.git` and the same `Pigi/pigi@ping.local` identity. There is no branch-protection rule enforced anywhere verifiable from here (GitHub-side protection could not be checked; CONSTITUTIONAL_BRANCH_RULES.md, 2026-06-25, describes protection for a long-dead `constitutional-trunk` branch — stale doc, not live enforcement).

---

## 3. Mechanism inventory (code found in the core runtime)

All paths are in `/home/nolan/ping` (the ADAPTER repo contains **zero** programmatic git execution: the only `child_process` uses in `src/` are two test files spawning `node/tsx` probes; the only "git commit" hits are fixture strings).

| # | Component (file:lines) | What it claims | What it actually does | Callers | Classification |
|---|---|---|---|---|---|
| 1 | `gateway/patch_authority.js` — Phase 19 PatchAuthority | "Validate all patches: AST parse, diff validation, lint, typecheck, tests, security scan, constitutional validation" | **Theater.** `_astParse` (l.133) returns `passed: true` without parsing; `_generateGitDiff` (l.177) fabricates a fake diff string; `_gitAdd`/`_gitCommit`/`_gitPush` equivalents are placeholders. All validation is "Placeholder - in production, use actual..." | **zero** (no requires anywhere outside itself) | **DORMANT** |
| 2 | `gateway/patch_authority_v2.js` — Phase 36I PatchAuthorityV2 | "Mission → Patch → Patch Authority → Replay → Verification → OpenCode → Merge; patches are constitutional artifacts" | Status-machine theater: `merge(prNumber)` (l.161) just sets `status='merged'` + timestamp; no git merge, no PR call. Lifecycle DRAFT→SUBMITTED→REPLAYING→VERIFIED→MERGED is event-sourced state only. | **zero** (only self-reference; `authority_container.js` mentions it in a doc comment) | **DORMANT** |
| 3 | `gateway/approval_authority.js` — Phase 20 | "Before Git commit: Patch → Replay → Tests → Witness Verification → ApprovalAuthority → CommitAuthority" | `_determineApprovalPolicy` (l.136): **"Default to automatic policy for now"**; approvals recorded with `approved_by: 'system'` (l.108). If revived, it would auto-approve. | **zero** | **DORMANT** |
| 4 | `gateway/commit_authority.js` — Phase 20 CommitAuthority | "Performs actual Git operations: git add, git commit, git push" (header, l.1-10) | **Fabrication hazard.** `_gitAdd` (l.~150) marks files staged without touching git; `_gitCommit` hashes `{message, author, timestamp}` via CanonicalAuthority and returns it as `hash`; `_gitPush` returns `{success: true}`. It then INSERTs a row into postgres `commits` with `git_commit_hash` = the fabricated hash. A reader of that table would believe real git commits exist. | **zero real callers** (only string mention in `ping-runtime/orchestration/generate_capability_registry.js:44`, a report-generator criteria string) | **DORMANT** (must never be revived without gutting) |
| 5 | `gateway/git_persistence_backend.js` | "Git becomes one persistence backend; persist commit manifest to Git" | `_createGitCommit` fabricates `git_commit_sha` via `deterministicIdAuthority.generateIdFromObject` — no git invocation. | required by `gateway/persistence_adapter.js:30` | **DORMANT** (adapter below has no callers) |
| 6 | `gateway/persistence_adapter.js` | Persistence adapter (backend selector) | Lazily requires `git_persistence_backend` (l.30-31) | **zero** | **DORMANT** |
| 7 | `gateway/simple_git_adapter.js` | "simple-git implementation of RepositoryPort. No shell execution" | **Real git, read-only:** `getRemoteUrl`, `getCurrentBranch`, `getRecentCommits`, `getStatus`, `isAvailable`. No add/commit/push methods exist. | `gateway/repository_discovery_authority.js`, `ping-runtime/runtime/system_authority.js` (wired in `gateway/bootstrap/wiring.js:28,85`) | **LIVE** (wired into gateway bootstrap; no gateway process observed running in WSL at audit time — gateway runs on Windows via start_gateway.ps1) |
| 8 | `runtime/kernel/commit-service/` | "Commit service" | Journal-event commit API (Express). NOT git. No start script, no compose/start-script reference. | none | **DORMANT**; also **out of git scope** (name collision only) |
| 9 | `.github/workflows/*.yml` (8 files) | CI | Push/PR verification only; `constitutional-learning-loop.yml` adds a 3 AM UTC cron but is checkout+verify (no commit/push). | n/a | **LIVE** (CI), none commit |
| 10 | `gateway/test_intelligence_graph_cutoffs.js` | — | "git commit" hit is a doc string only | n/a | n/a (false positive) |

**Duplicate/conflict analysis:**
- #1 vs #2 are **DUPLICATE** patch authorities (two implementations of "validate a patch before it lands", Phase 19 vs Phase 36I). Both dormant. Per the one-authority rule they cannot both be revived; if the program ever needs a mechanical patch gate, one must be chosen and the other archived — that decision is the coordinator's, not mine, so I propose no deletion (invariant #6: classify history, never delete).
- #3 defaults to auto-approve + #4 fabricates commit hashes: the Phase-20 chain is **CONFLICTING with the sprint's own safety posture** (COMMITS CREATED: NONE, human review). Dormancy is the only thing containing it.
- #4's `commits` table schema (`git_commit_hash NOT NULL`) would store fabricated hashes — a **witness-integrity** issue, flagged for Agent 02's lane as well.

---

## 4. Where an unauthorized change could enter

1. **File-edit application bypasses all gates.** Agents apply patches as direct file edits to the adapter worktree. Writer-ownership is enforced procedurally (Agent 20 watches, coordinator reconciles). There is no mechanical barrier to an agent editing outside its owned paths — detection is after-the-fact. Entry point: any compromised/misbehaving agent with Pig SSH.
2. **Identity spoofing at commit time.** No GPG, no SSH-signed commits; identity = local gitconfig (`Pigi/pigi@ping.local` or `Trish Nikitha/trishnikitha@gmail.com`). Any agent can commit as any principal. When the program eventually lifts COMMITS CREATED: NONE, the first requirement must be signed commits or a commit-identity ceremony owned by Nolan.
3. **Dirty-state sweep.** 104 dirty/untracked entries in the main worktree share a `.git` with the sprint worktree. A commit run from the wrong cwd (or a script that doesn't `cd`) silently bundles FYD Wave 1 debris into the constitutional branch. No hook guards against it.
4. **Dormant placeholder authorities.** #1–#6 are one `require()` away from producing witnessed-but-fake patch/commit records. #4's postgres `commits` table in particular would assert `git_commit_hash` values that never existed in git — indistinguishable from real records to downstream readers.
5. **Push destination.** Adapter pushes (when they happen) go to `git@github.com:piging2/fyd.git` via the Windows git-credential-manager. Branch protection on GitHub could not be verified from here; `constitutional-convergence-v2` currently has no upstream, so the first push will create it remotely without any local evidence of protection rules.
6. **Worktree sprawl.** 12 worktrees across 5+ lanes share one object store and one identity. A lane worker committing in the wrong worktree (e.g., `tenanos-wave/*` or `fyd-preview-wt`) is not prevented by anything.

## 5. Dirty-state protection verdict

| Check | Result |
|---|---|
| Pre-commit / pre-push hooks (adapter) | NONE — all `.sample` |
| Pre-commit / pre-push hooks (core) | NONE — all `.sample` except stock git-lfs `post-merge` |
| CI commit-blocking | None (CI verifies, never commits) |
| Dirty-worktree commit guard | NONE anywhere |
| Sprint worktree state | CLEAN at `a69bb68f` (verified 2026-09-23 ~20:00 MDT) |
| Main worktree state | 104 dirty/untracked, `fyd-factory` @ `e48ef710` — DO NOT TOUCH |
| Core repo state | 4 modified + 13 untracked on `refactor/runtime-authority-convergence` |
| Automated commit tooling | NONE (re-verified; AUTOMATED_COMMIT_AUDIT.md conclusion stands) |

## 6. Patches proposed by this agent

**NONE.** Rationale, per the patch bar (WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT):
- The only defects meeting "unambiguous" are (a) no commit signing and (b) dormant fabrication-hazard code. (a) requires Nolan's key-management decision — not a surgical diff I can author. (b) would require deleting/archiving dead code, which invariant #6 forbids without a deadness proof owned by the coordinator (and Agent 20's lane). Proposing no diff is the correct minimum action. No `patches/agent08-git/` directory was created (nothing to put in it).
- **Recommendations for the coordinator (not patches):** (1) before COMMITS CREATED: NONE is ever lifted, require GPG/SSH commit signing with a Nolan-owned key and record the key fingerprint in the sprint files; (2) keep #1–#6 dormant — do not revive; if a mechanical patch gate is ever wanted, pick exactly one of #1/#2 and archive the other; (3) consider a `pre-commit` guard in `/home/nolan/projects/ping/.git/hooks/` that refuses commits from the main worktree while the sprint runs (a 5-line guard, but installing hooks is a persistent-state change — coordinator's call).

---

## 7. Findings table (shared record format)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| git | repo identity (adapter) | Commit identity is `Pigi/pigi@ping.local`, shared across all 12 worktrees, with no cryptographic attestation | `/home/nolan/projects/ping/.git/config` (`user.name=Pigi`, `user.email=pigi@ping.local`); `git log --show-signature` → zero signatures; `git worktree list` → 12 worktrees, one `.git` | git CLI / agents | git object store | any Pig shell user | any git reader | none (procedural only) | LIVE | HIGH | identity is forgeable by any agent | Pig SSH access | all |
| git | repo identity (core) | Core commits as human `Trish Nikitha <trishnikitha@gmail.com>`; one as `Pigi <pigi@ping.social>`; none signed | `git -C /home/nolan/ping log --format=... -5` (cc6856c3b, 4c098334c, 9250a0fbf, b586e39d8 = Trish Nikitha; 3c5d280dd = Pigi); `--show-signature` empty | git CLI | git object store | Trish Nikitha / Pigi | any git reader | none | LIVE | HIGH | author/committer strings are self-asserted | Pig SSH access | all |
| git | dirty-state guard | No pre-commit/pre-push/commit-msg hook is active in either repo | adapter `.git/hooks/`: all `.sample`; core `.git/hooks/`: only git-lfs `post-merge` | — | — | — | — | none | LIVE (absence) | HIGH | nothing blocks dirty or wrong-worktree commits | — | coordinator, agent20 |
| git | main worktree hygiene | `/home/nolan/projects/ping` (`fyd-factory`) has 104 dirty/untracked entries sharing one `.git` + identity with the sprint worktree | `git -C /home/nolan/projects/ping status --short \| wc -l` → 104 | — | shared `.git` | FYD wave workers | — | none | LIVE | HIGH | a commit from the wrong cwd sweeps 104 unrelated entries | 12-worktree sprawl | coordinator |
| patch | gateway/patch_authority.js (Phase 19) | Claims patch validation; every validator is a placeholder that auto-passes; zero callers | l.133 `_astParse` returns `passed:true` w/o parsing; l.177 `_generateGitDiff` fabricates diff; `grep require patch_authority` → no callers | none | none | — | — | none | DORMANT | HIGH | if revived, "validated" means nothing | postgres `patches` table | agent02 (witness) |
| patch | gateway/patch_authority_v2.js (Phase 36I) | Claims Mission→Patch→Replay→Verification→OpenCode→Merge; merge is a status flag, no git; zero callers | l.161 `merge(prNumber)` sets status+timestamp only; no git/PR calls; no external requires | none | none | — | — | none | DORMANT | HIGH | DUPLICATE of #1 (two patch authorities) | — | coordinator |
| patch | gateway/approval_authority.js (Phase 20) | Approval gate defaults to automatic policy with `approved_by='system'`; zero callers | l.136 "Default to automatic policy for now"; l.108 `approved_by: 'system'` | none | none | — | — | none | DORMANT | HIGH | auto-approval design conflicts with human-review posture | #1/#2/#4 | coordinator |
| commit | gateway/commit_authority.js (Phase 20) | Header claims "actual Git operations"; all git ops are placeholders that FABRICATE `git_commit_hash` into postgres | `_gitAdd`/`_gitCommit`/`_gitPush` (l.~150-190) return synthesized values; hash = `CanonicalAuthority.hash({message,author,timestamp})`, not a git object | none (string-only ref in `generate_capability_registry.js:44`) | postgres `commits` | — | `commits` table readers | none | DORMANT | HIGH | fabricated hashes would poison witness/attestation readers | witnessAuthority, postgres | agent02 |
| commit | gateway/git_persistence_backend.js + persistence_adapter.js | Claims git persistence backend; fabricates `git_commit_sha`; adapter has zero callers | `_createGitCommit` uses `deterministicIdAuthority.generateIdFromObject`; `persistence_adapter.js:30` lazy-requires it; no callers of adapter | none | none | — | — | none | DORMANT | HIGH | same fabrication hazard as #4 | postgres `configuration.git_path` | agent02 |
| commit | runtime/kernel/commit-service/ | Name suggests git commits; actually a journal-event commit API; dormant (no start script, no compose/start wiring) | `package.json` scripts: test/dev only; `grep -ln commit-service compose.*.yaml start_gateway.ps1` → no hits | none | — | — | — | delegates to CertificateAuthority/CanonicalJson per COMMIT_SERVICE_CLEANUP.md | DORMANT | HIGH | name collision misleads (AUTOMATED_COMMIT_AUDIT.md had to rule it out) | @crx/replay | — |
| git | simple_git_adapter.js | Real git via simple-git but READ-ONLY methods only (status/log/remotes); no commit/push surface | l.27-95: `getRemoteUrl/getCurrentBranch/getRecentCommits/getStatus/isAvailable` only | `repository_discovery_authority.js`, `system_authority.js` (wired: `gateway/bootstrap/wiring.js:28,85`) | git CLI via simple-git | — | gateway routes/system | RepositoryPort | LIVE | MEDIUM (wired; no gateway process seen in WSL at audit time) | none (read-only by construction) | gateway bootstrap | — |
| ci | .github/workflows/constitutional-learning-loop.yml | Only scheduled workflow (3 AM UTC cron); checkout+verify only, no commit/push | `on:` includes `schedule: cron '0 3 * * *'`; steps grep: only `actions/checkout@v4`, no git/commit/push/token | GitHub Actions | — | — | — | — | LIVE | HIGH | none | — | — |
| sprint | patch pipeline (procedural) | The live pipeline is files+agents: propose diff → owning agent applies via file edit → no commits; core is propose-only | STANDING-INVARIANTS.md #2,#5; WRITER-OWNERSHIP.md rules 1-4; MASTER-LEDGER.md:30; `patches/agent01-event-authority/` empty | coordinator | adapter worktree / patches/ | owning agent | coordinator, agent20 | coordinator (procedural) | LIVE | HIGH | enforcement is procedural, not mechanical (agent20 = after-the-fact detection) | Pig SSH, file tools | all agents |
| sprint | branch/worktree policy | 12 worktrees / 5+ lanes share one `.git` + identity; no verifiable branch protection; `constitutional-convergence-v2` has no upstream | `git worktree list`; `git branch -vv` (no tracking on sprint branch); CONSTITUTIONAL_BRANCH_RULES.md is stale (targets dead `constitutional-trunk`) | worktree creators | shared `.git` | lane workers | — | none verifiable | LIVE | MEDIUM (GitHub-side protection unverifiable from here) | cross-lane commit/identity confusion | Pig SSH | coordinator |
