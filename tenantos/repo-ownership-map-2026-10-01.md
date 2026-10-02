# Repository ownership map — LOCAL → REMOTE, proven before any push
**Date:** 2026-10-01 ~18:50 MDT · **Mode:** read-only (no commits, pushes, branch ops, or mutations) · **Worker:** mapping subagent 824c6552

Binding procedure: `~/workspace/directives/2026-10-01-repository-destination-law.md` (Nolan 18:47 MDT + Pigi's boundary judgment). Standing rule preserved: proven mapping is necessary but NOT sufficient — every push still needs Nolan's explicit per-push authorization.

## 1. Remote ground truth (verified 2026-10-01 ~18:50 MDT via connected GitHub account, `gh-api.py` + `custom.github`)

| Remote | Visibility | Default branch | Default tip | Tip message | Other branches |
|---|---|---|---|---|---|
| `piging2/PING` | public | `main` | `81b32480` | "Initial commit" (pushed 2026-09-28) | `feat/orca-unknown-outcome-port` be5c20ca · `fyd-deploy` ade4ee50 · `security/secret-redaction-2026-09-28` 96528963 |
| `ngesk2/crx-runtime` | (visible) | `main` | `6c4b5317` | "Freeze constitutional object model with 7 definitions (Identity, Object, Placement, Host, Owner, Revocation, Witness)" (pushed 2026-09-28) | 13 branches incl. `constitutional-trunk` 74fbb74d |
| `piging2/fyd` | **private — NOW VISIBLE** | `fyd/builder-composition` | `e33dab3b` | "Pass A: additive microdata extraction + canonical jest config" (pushed 2026-09-28) | `main` a69bb68f ("Gate owner mutation behind demo-owner-mode", 2026-09-23) · `push/pass-a-microdata-2026-09-28` e33dab3b |

**Visibility change flagged:** Nolan saw `piging2/fyd` → 404 at ~18:47 MDT through the same connected account; at ~18:50 MDT it resolves (private repo, id 1383617635). Either transient or a permission change in the last minutes. **Re-verify at push time; do not assume stable access.**

## 2. Lineage summary (the shape of local truth)

**L1 — FYD/PING tenant lineage (one git family).** Root commit `f6386ee1` ("Initial PING website: independent TenantOS tenant site"). 7 directories + 1 worktree, all with `origin = git@github.com:piging2/fyd.git`. All share merge-base `e48ef710` with `origin/fyd/builder-composition`; local branches sit 109–142 commits ahead / 1 behind the fyd remote default. **No member descends from PING `81b3248`.** None of the local branch names exist on the fyd remote (remote has only 3 branches).

**L2 — CRX constitutional lineage.** `CRX_REMOTE` (`main` b833d91) and `constitutional-runtime` (`constitutional-trunk` 74fbb74d), both `origin = https://github.com/ngesk2/crx-runtime.git`.

**L3 — Operator workspace.** `~/workspace`, `origin = https://github.com/piging2/PING`, but history is ops/backlog content (root `77f89fcf`), unrelated to `81b3248`, no upstream configured.

**L4 — FYD builder.** `~/workspace/fyd-build`, **no remote at all**, FYD-017…FYD-026 product commits.

**Proven local→remote links (deterministic):**
- Local branch `fyd-deploy` in `/home/nolan/projects/ping` contains `ade4ee50` = tip of `piging2/PING`'s remote `fyd-deploy` branch. This lineage was pushed to PING before.
- `constitutional-runtime` HEAD `74fbb74d` == `ngesk2/crx-runtime` `constitutional-trunk` tip exactly.
- `CRX_REMOTE` local `main` (b833d91) is the direct parent of `ngesk2/crx-runtime` `main` (6c4b5317). Remote is one commit ahead.
- `piging2/PING` remote branches `feat/orca-unknown-outcome-port` (be5c20ca) and `security/secret-redaction-2026-09-28` (96528963) are **absent** from all local object stores — pushed from elsewhere or another clone.

## 3. Per-repo 15-field reports

### L1a. `/home/nolan/projects/ping`
- LOCAL PATH: `/home/nolan/projects/ping`
- SEMANTIC OWNER: **PING/FYD tenant codebase (converged)** — evidence: root `f6386ee1` "Initial PING website: independent TenantOS tenant site"; contains `mc-approval/` (Mission Control approval backend), `tools/fyd-journal-gateway`, PING website code, FYD builder code. Served/runtime owner: the canonical journal gateway (`:18199`) runs from this tree's `tools/fyd-journal-gateway`.
- CURRENT BRANCH: `fyd/builder-harvest-trackc-2026-09-28`
- HEAD SHA: `feeed831` (hostile no-fallback journal test, 2026-10-01)
- REMOTE URL: `git@github.com:piging2/fyd.git`
- REMOTE EXISTS?: YES (verified via API; repo is private)
- REMOTE DEFAULT BRANCH: `fyd/builder-composition`
- AHEAD: 109 (vs `origin/fyd/builder-composition`) · BEHIND: 1 (remote tip `e33dab3b` not in local history)
- DIRTY: 5 (`mc-approval/__pycache__/*.pyc` ×4, `var/mc-approvals.json` — journal worker leftovers)
- UNTRACKED: 2 (`mc-approval/tests/__pycache__/`, `var/mc-approvals-auth-classification.json`)
- LAST 5 COMMITS: `feeed831` hostile no-fallback journal test · `ea497a94` route emit.py through canonical journal · `f94bba39` bind tenant at proposal creation · `aeed7010` emit.py honors MC_OUTREACH_PATH · `ed3ff708` owner-asserted provenance lane
- TARGET REPO: **UNDECIDED** — see §5. Candidates: `piging2/fyd` (git history says so) vs `piging2/PING` (content says PING product). Needs Nolan's explicit semantic convergence decision.
- TARGET BRANCH: undecided (new branch either way; never `main` on either remote — see below)
- PUSH SAFE?: **NO** — target repo ambiguous; also dirty/untracked present.

### L1b. `/home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel` (worktree of L1a)
- LOCAL PATH: `/home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel` (gitdir: `/home/nolan/projects/ping/.git/worktrees/ping-parallel`)
- SEMANTIC OWNER: **PING product website (visual slice)** — the Codex editorial site integration; served via `apps/editorial-preview` on `:3214` for Nolan's inspection.
- CURRENT BRANCH: `codex/ping-parallel-review`
- HEAD SHA: `8a79775d` (P1U7 FYD-as-projection; 8 semantic commits)
- REMOTE URL: `git@github.com:piging2/fyd.git` (inherited from main repo)
- REMOTE EXISTS?: YES · REMOTE DEFAULT BRANCH: `fyd/builder-composition`
- AHEAD: 123 · BEHIND: 1 (vs `origin/fyd/builder-composition`)
- DIRTY: 65 (left untouched per lane rules) · UNTRACKED: included in the 65
- LAST 5 COMMITS: `8a79775d` P1U7 FYD-as-projection · `cd2d75d8` P1U6 Ask PING · `2b5c95ee` P1U4 · `50eff899` P1U3 · `4b2b0527` P1U2b (chain: 47966473→4b700f9e→a8a2bf2b→4b2b0527→50eff899→2b5c95ee→cd2d75d8→8a79775d)
- TARGET REPO: **UNDECIDED** (same L1 decision as L1a)
- TARGET BRANCH: undecided; `codex/ping-parallel-review` does not exist on any remote
- PUSH SAFE?: **NO** — target ambiguous; mixed-authorship `symbol-language.css` deliberately left dirty (committing would misattribute); needs SHA audit + CSS reconciliation first.

### L1c. `/home/nolan/projects/ping-fyd-converged`
- LOCAL PATH: `/home/nolan/projects/ping-fyd-converged`
- SEMANTIC OWNER: **PING product — Mission Control** — evidence: `src/app/api/mc/*` (dispatch, approvals routes), the served `:3100` tree; journal convergence commits landed here (`mc-dispatch.ts`, `approvals/route.ts`).
- CURRENT BRANCH: `fyd/convergence-2026-09-28`
- HEAD SHA: `6405011d` (route approval events through canonical journal)
- REMOTE URL: `git@github.com:piging2/fyd.git` · REMOTE EXISTS?: YES · REMOTE DEFAULT BRANCH: `fyd/builder-composition`
- AHEAD: 142 · BEHIND: 1 · DIRTY: 0 · UNTRACKED: 3 (`mc-approval/__pycache__/`, `mc-approval/tests/__pycache__/`, `var/`)
- LAST 5 COMMITS: `6405011d` approvals→canonical journal · `4ad9a7a3` dispatch→canonical journal · `300c9c91` bind tenant at proposal creation · `92108239` approval boundary gaps · `51831c61` 99h convergence nav shell
- TARGET REPO: **UNDECIDED** (L1 decision). Note: this is the Mission Control tree — if the semantic decision assigns Mission Control to `piging2/PING`, target branch shape is `convergence/2026-10-01` on PING (history unrelated to `81b3248`; never graft into `main`).
- TARGET BRANCH: undecided · PUSH SAFE?: **NO** — target ambiguous.

### L1d. `/home/nolan/projects/ping-fyd-converged-i07`
- BRANCH: `fyd/i07-portability-proof` · HEAD: `68861542` ("i07: TenantOS portability proof — one media capability, two placements") · REMOTE: `piging2/fyd` (exists, default `fyd/builder-composition`) · AHEAD: 126 · BEHIND: 1 · DIRTY: 0 · UNTRACKED: 0 · SEMANTIC OWNER: TenantOS portability proof (PING tenant machinery) · TARGET: UNDECIDED (L1) · PUSH SAFE?: **NO** (target ambiguous).

### L1e. `/home/nolan/projects/ping-fyd-harvest-wt`
- BRANCH: `fyd/convergence-harvest-2026-09-29` · HEAD: `000ea349` ("Harvest Group H (part)") · REMOTE: `piging2/fyd` (exists, default `fyd/builder-composition`) · AHEAD: 123 · BEHIND: 1 · DIRTY: 0 · UNTRACKED: 0 · SEMANTIC OWNER: harvest worktree (evidence-side media manifest, tests/config, UI components) · TARGET: UNDECIDED (L1) · PUSH SAFE?: **NO** (target ambiguous).

### L1f. `/home/nolan/projects/ping-askfyd-gold`
- BRANCH: `testing/askfyd-gold-2026-09-30` · HEAD: `475f1dbb` ("Make shadow-inputs.json dump deterministic") · REMOTE: `piging2/fyd` (exists, default `fyd/builder-composition`) · AHEAD: 111 · BEHIND: 1 · DIRTY: 0 · UNTRACKED: 0 · SEMANTIC OWNER: Ask FYD evidence-bounded Q&A test gold set (FYD product surface tests) · TARGET: UNDECIDED (L1) · PUSH SAFE?: **NO** (target ambiguous).

### L1g. `/home/nolan/projects/ping-wave2-ownerloop` (detached HEAD)
- BRANCH: (detached) · HEAD: `3235804d` ("W2 owner-loop: approve->regen chain + adversarial + last-good proof") · REMOTE: `piging2/fyd` (exists, default `fyd/builder-composition`) · AHEAD/BEHIND: n/a (detached) · DIRTY: 0 · UNTRACKED: 0 · SEMANTIC OWNER: FYD owner-loop product work · TARGET: UNDECIDED (L1) · PUSH SAFE?: **NO** (detached + target ambiguous).

### L1h. `/home/nolan/projects/ping-ws4-converge`
- BRANCH: `wip/wave4-ledger-20260929/ping-ws4-converge-` · HEAD: `3235804d` (same as L1g) · REMOTE: `piging2/fyd` (exists, default `fyd/builder-composition`) · AHEAD/BEHIND: n/a (branch not vs remote default; same HEAD as L1g) · DIRTY: 0 · UNTRACKED: 1 · SEMANTIC OWNER: FYD owner-loop (same work as L1g, branched) · TARGET: UNDECIDED (L1) · PUSH SAFE?: **NO** (target ambiguous).

### L2a. `/home/nolan/projects/CRX_REMOTE`
- LOCAL PATH: `/home/nolan/projects/CRX_REMOTE`
- SEMANTIC OWNER: **CRX constitutional primitives** — evidence: `CRX_CONSTITUTION.md`, `constitutional/`, `certification/`, replay kernel, canonical engine (`src/engines/canonical_engine.ts`); commit subjects are Phase 1–14 constitutional hardening.
- CURRENT BRANCH: `main` · HEAD SHA: `b833d91` ("Complete Phase 14: JS/TS Constitutional Boundary Sweep")
- REMOTE URL: `https://github.com/ngesk2/crx-runtime.git` · REMOTE EXISTS?: YES · REMOTE DEFAULT BRANCH: `main`
- AHEAD: 0 · BEHIND: 1 — local `main` is the **direct parent** of remote `main` (`6c4b5317` "Freeze constitutional object model with 7 definitions"). Pushing local `main` → remote `main` would REGRESS the remote (non-fast-forward; force is forbidden).
- DIRTY: 1694 — characterized: all-but-6 files are **whitespace/line-ending-only** changes (`git diff --ignore-all-space --stat` collapses to 6 files, 52+/73-); agent-transcript `.jsonl` files, workflows, configs. Likely a checkout with different `autocrlf`/normalization.
- UNTRACKED: 0
- LAST 5 COMMITS: `b833d91` Phase 14 sweep · `47642f9` deployment readiness decision · `63a0784` replay kernel hardening … (Phase 1–14 certification line)
- TARGET REPO: `ngesk2/crx-runtime` · TARGET BRANCH: `main` — but remote is AHEAD; correct action is fetch + reconcile, not push.
- PUSH SAFE?: **NO** — would regress remote `main`; mass dirty state.

### L2b. `/home/nolan/projects/constitutional-runtime`
- LOCAL PATH: `/home/nolan/projects/constitutional-runtime`
- SEMANTIC OWNER: **CRX constitutional primitives (audit line)** — evidence: `AGENT_CONSTITUTION.md`, authority/event-mutation audits, adversarial attack reports.
- CURRENT BRANCH: `constitutional-trunk` · HEAD SHA: `74fbb74d` ("Lane-L-tenant-isolation-vectors")
- REMOTE URL: `https://github.com/ngesk2/crx-runtime.git` · REMOTE EXISTS?: YES · REMOTE DEFAULT BRANCH: `main`
- AHEAD: 0 · BEHIND: 0 (vs `origin/constitutional-trunk`; HEAD == remote branch tip exactly)
- DIRTY: 3371 (same whitespace/line-ending class as L2a; sampled: `.constitutional_snapshot.json`, workflows, `.env.example`) · UNTRACKED: 0
- LAST 5 COMMITS: `74fbb74` Lane-L-tenant-isolation-vectors · `e1fba76` gateway defects/architectural audit · `0e4d599` event mutation authority contracts …
- TARGET REPO: `ngesk2/crx-runtime` · TARGET BRANCH: `constitutional-trunk` (already in sync)
- PUSH SAFE?: **NO** — nothing to push (in sync) and mass dirty state must not be committed as-is.

### L3. `~/workspace` (this VM's operator workspace)
- LOCAL PATH: `/home/hatch/workspace`
- SEMANTIC OWNER: **OPERATIONS — not product code.** Evidence: skills, outreach scripts/pass logs, directives, gap registry, engagement guard, social-interdependence skill. This is Pigi's working area.
- CURRENT BRANCH: `orca/effect-ledger-2026-09-30` · HEAD SHA: `e54901a`
- REMOTE URL: `https://github.com/piging2/PING` (fetch+push) · REMOTE EXISTS?: YES · REMOTE DEFAULT BRANCH: `main`
- AHEAD/BEHIND: n/a — **no upstream configured**; history does NOT contain `81b3248` (root `77f89fcf`, ops lineage).
- DIRTY: 11 modified (AGENTS.md, backlog/ledger md, STATE.md…) · UNTRACKED: 2321 (live working files)
- LAST 5 COMMITS: `e54901a` backlog perfecting-pass log · `591fb95` backlog pass log · `9dfe842` FB pass log · `5a43aa0` outreach authority holds · `fb6eeb3` .gitignore
- TARGET REPO: **NONE** — pushing ops content into `piging2/PING` would pollute the product repo.
- PUSH SAFE?: **NO** — wrong content for the remote; recommend retargeting/removing the origin or keeping it fetch-only.

### L4. `~/workspace/fyd-build`
- LOCAL PATH: `/home/hatch/workspace/fyd-build`
- SEMANTIC OWNER: **FYD product code** — evidence: `src/fyd/{ask,evidence,visibility,proceduralize,components}`, commits FYD-017…FYD-026 (owner correction records, claim classifications, semantic determinism).
- CURRENT BRANCH: `fyd-025-semantic-determinism` · HEAD SHA: `841825c`
- REMOTE URL: **none configured** · REMOTE EXISTS?: n/a · REMOTE DEFAULT BRANCH: n/a
- AHEAD/BEHIND: n/a · DIRTY: 46 (all FYD source: `src/fyd/ask/*`, `renderer.tsx`, `evidence/refs.ts`, `visibility/policy.ts`…) · UNTRACKED: 0 (within the 46 count: all ` M`)
- LAST 5 COMMITS: `841825c` FYD-026b owner-authored claim classification · `1cf65d9` FYD-025 semantic determinism · `590c640` FYD-026 claim classifications at write time · `eb20998` FYD-018 owner correction record · `c3736c9` FYD-017 observed/visibility/presentation triple
- TARGET REPO: `piging2/fyd` (plausible; now visible) — needs remote added + Nolan authorization
- TARGET BRANCH: `fyd-025-semantic-determinism` (does not exist remotely)
- PUSH SAFE?: **NO** — no remote; dirty; needs explicit remote setup + authorization.

### Out of scope (verified, excluded)
- `/home/nolan/projects/happy-place-platform/`, `/home/nolan/projects/happy-place-platform-forensic/`, `/home/nolan/projects/ping-website/` → remotes are `trishnikitha-art/happy-place-platform`. **Never touch** per standing rule (Happy Place original + forensic clones).
- `/home/nolan/projects/pigwork/`, `/home/nolan/projects/ping-worktrees/`, `/home/nolan/projects/fyd-design-baseline/`, `/home/nolan/projects/fyd-editorial-template/`, `/home/nolan/projects/ping-editorial-template/` → not git repos (no `.git`).

## 4. PUSH SAFE? verdicts

**PUSH SAFE: none.** Every repo is NO:
| Repo | Reason |
|---|---|
| L1a–L1h + worktree | Target repo ambiguous (FYD vs PING needs Nolan's semantic convergence decision); L1a dirty, worktree mixed-authorship dirty |
| L2a CRX_REMOTE | Would regress remote `main` (remote 1 ahead); 1694 whitespace-dirty files |
| L2b constitutional-runtime | In sync (nothing to push); 3371 whitespace-dirty files |
| L3 ~/workspace | Ops content; origin points at product repo — never push |
| L4 ~/workspace/fyd-build | No remote; 46 dirty files |

## 5. Fuzziest boundary + recommendation

**The L1 lineage: repo named `ping`, root commit "Initial PING website", git remote `piging2/fyd`, content spanning FYD builder + Mission Control + PING tenant site.**

- Git history testifies FYD: shared ancestry with the fyd remote (`e48ef710` merge-base), fetched fyd refs, origin `piging2/fyd`.
- Content testifies converged PING/FYD tenant: Mission Control backend (`mc-dispatch.ts`, `approvals/route.ts`), the PING website, TenantOS tenant code — the exact set the directive wants in `piging2/PING`.
- Precedent is split: `fyd-deploy` was pushed from this lineage to `piging2/PING` (proven: `ade4ee50` in both), while day-to-day branches point at `piging2/fyd`.

**Recommendation:** Nolan makes one explicit semantic convergence decision before any L1 push:
- **Option A (FYD owns the lineage):** push local branches as *new* branches on `piging2/fyd` (technically clean: shared ancestry, no force, no graft; branch names don't collide). Mission Control then needs an explicit carve-out decision if it must live in PING.
- **Option B (PING owns the product code):** push a new `convergence/2026-10-01` branch on `piging2/PING` (history unrelated to `81b3248` — never into `main`). FYD-builder-only files then need an explicit carve-out decision.
- Either way: dirty/untracked committed first per commit law, SHA audit, no mixed-authorship CSS, per-push authorization. The `piging2/fyd` visibility flip (404 → visible within minutes) must be re-verified at push time.

**Secondary hazard:** `~/workspace`'s origin points at `piging2/PING`. Recommend removing or retargeting that origin (or marking fetch-only) so a future `git push` from the ops workspace can never dump 2,300 working files into the product repo.
