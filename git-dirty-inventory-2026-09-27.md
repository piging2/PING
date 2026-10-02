# Git Dirty-Tree Inventory — 2026-09-27 (~16:15 MDT)

READ-ONLY inventory. No writes, commits, resets, cleans, or checkouts were performed.

## Repo identity

- Repo root: `/home/hatch/workspace` (the workspace tree itself is a git repo)
- Branch: `p0/approval`
- HEAD: `b96e7d2b37b7836c1c9b771a4e079335b418cfda`
  - Author: Pigi, 2026-09-27 19:40:13 +0000
  - Subject: "P0 W4: harvest ApprovalRequest primitive + proposal validator + approval CLI"
- Porcelain total: **1661 entries**
  - Modified tracked (unstaged): **11** (` M`)
  - Untracked: **1650** (`??`)
  - Staged: **0** (nothing staged)

Note: nested git repos inside the tree (`fyd-build/`, `fyd-factory/hpp-clone/`, `demo-sites/`, `ping-ui-contract/`, `.worktrees/*`) are separate repos; their contents do NOT appear in this porcelain. The 8 untracked `ping-ui-contract` porcelain entries are copies/loose files, not the nested repo's content.

## Modified tracked files (all 11) with diffstat

| # | Path | Diff (insertions+/deletions-) |
|---|------|-------------------------------|
| 1 | `AGENTS.md` | +10/-0 |
| 2 | `BACKLOG_NOLAN.md` | +20/-0 |
| 3 | `BACKLOG_PING.md` | +54/-0 (approx, combined add/rework) |
| 4 | `FAILURE_LEDGER.md` | +34/-0 (approx) |
| 5 | `bin/prompt-hermes.sh` | +27/-0 (approx, Hermes bridge path fix per AGENTS notes) |
| 6 | `fyd-product-lane/builder/tokens/out/build-manifest.json` | +1/-1 |
| 7 | `goals/ping-social-outreach-campaign/files/prospect-digest.md` | +73/-0 (approx) |
| 8 | `outreach/eligibility-audit.jsonl` | +11/-0 |
| 9 | `outreach/eligibility-discrepancies.jsonl` | +1/-0 |
| 10 | `tandem/emit-observation.py` | +245/-0 (approx, large rewrite) |
| 11 | `your_files/western-co-prospects.jsonl` | +42/-0 (approx) |

Total: 366 insertions, 153 deletions. Provenance assessment:
- `AGENTS.md`, `BACKLOG_*`, `FAILURE_LEDGER.md`, `bin/prompt-hermes.sh`, `tandem/emit-observation.py` — plausibly recent operator work (Hermes bridge repair 2026-09-26; emit-observation.py heavily rewritten — needs owner confirmation).
- `outreach/*` and `your_files/western-co-prospects.jsonl`, `prospect-digest.md` — engagement/outreach machinery churn, same-day (2026-09-27).
- `fyd-product-lane/builder/tokens/out/build-manifest.json` — single-line change, FYD product lane (2026-09-27 P0 sprint).

## Untracked entries: top-level group counts

| Group | Count | What it looks like |
|-------|-------|--------------------|
| `outreach/` | 570 | engagement scripts, docs, per-pass wait scripts, `tests/` (16), guard/logic files; includes `__pycache__/` |
| (workspace root files) | 229 | loose operator scripts/docs: `INTEGRATION*.md`, `capture-whythis*.js`, `ctx_experiment*.py`, `audit-driver*.js`, `*.test.ts`, various `*.sh`/`*.py` probes; dated notes `ORACLE_CRITICAL_PATH_2026-09-20.md`, `discovery-2026-09-12-*.md` |
| `fyd-product-lane/` | 223 | Next.js FYD product tree: `src/` 218 (`fyd/` 86, `lib/` 71, `app/` 52 incl. `app/sites/coppersmith-plumbing/`, `app/build/[siteId]/`, `app/sites/_shared/site-client.tsx`), `scripts/`, `proof/`, 3 top files |
| `tandem/` | 103 | 84 loose files (Meta AI delegation notes: `build-context-pack.py`, `REDTEAM-2026-09-13.md`, dated 2026-09-13/14 docs), `tests/` (9), `self-audit/`, `proof-20260914/`, `__pycache__/`, `.pack-cache/` |
| `sprint-2026-09-24/` | 87 | 74 files + evidence dirs (`presence-verify-2026-09-25/`, `hydration-verify-2026-09-25/`, `fyd-builder-v1/`, `stashed-lanes/`) — Sept 24 sprint evidence |
| `fyd-lane/` | 86 | 60 files + `work/`, `wave2/`, `substrate/`, `stage-repo/`, `stage-pig/`, `repo/`, `lane-media-b/` — P0-era lane tooling; includes `check-stable.py.bak-2026-09-27` |
| `goals/` | 61 | `ping-agent-execution-stack/` 35 (GOAL.md, crons, files, `hidden_files/p0-autonomy-sprint-2026-09-27/` sprint records, `hidden_files/backlog-burn-2026-09-27/`), `ping-social-outreach-campaign/` 11 |
| `your_files/` | 29 | 25 files + `ask-37-questions-batch{5,6,7}-2026-09-26/`, `sprint-10-more-questions-batch4-2026-09-25/` |
| `orca-mc-convergence/` | 19 | audit files, `p4-redteam/`, `p0-capture/`, `hermes-proof/`, `reports/` |
| `bin/` | 13 | 12 files + `__pycache__/` — scripts; pairs with modified `bin/prompt-hermes.sh` |
| `mission-control/` | 11 | `lane-d/`, `adapters/`, `tests/`, `staging/`, `__pycache__/` |
| `orca/` | 10 | `effect-classes/`, `unknown-outcome-experiments/`, `social-retry-proof/` |
| `ping-ui-contract/` | 8 | loose copies; NOT the nested repo's content |
| long tail (single-entry dirs) | ~100 dirs, 1 entry each | see "Unknown / unassigned" below |

## min-w-0 flag (proven-change protection)

- `fyd-product-lane/src/app/sites/_shared/site-client.tsx` (353 lines, md5 `1d7232bb…`, untracked) contains the `min-w-0` fix at line 334:
  `className="min-w-0 flex-1 rounded border border-border-soft bg-background px-3 py-2 text-sm"`
- A second copy at `mobile-objects-lane/src_app_sites__shared_site-client.tsx` (411 lines, md5 `fb8d0e29…`, untracked, mtime 2026-09-24 16:09:46 UTC) also contains a `min-w-0` at line 392, but the files are DIFFERENT (different line counts, different md5). This is the duplicate-canonical problem: which file is the proven change source, and which tree is canonical, is NOT determinable from this inventory.
- `mobile-objects-lane/` is a single untracked porcelain entry containing 16 files (renderer.tsx, .b64 sidecars, test file) dated 2026-09-24.
- `min-w-0` also appears in other `fyd-product-lane` files (`build/[siteId]/build-client.tsx`, `o/[objectId]/page.tsx`, `app/page.tsx`, `components/ping/*`) — those are likely the same class pattern, not necessarily the proven patch.

## Provenance flags: known recent work vs UNKNOWN

Plausibly tied to known recent work (do not treat as proof of ownership):
- `fyd-product-lane/` — FYD product lane, 2026-09-27 P0 sprint (:3100 app tree, includes `_shared/site-client.tsx` with min-w-0).
- `mobile-objects-lane/` — mobile proof lane, 2026-09-24.
- `goals/*/hidden_files/p0-autonomy-sprint-2026-09-27/` — today’s P0 sprint records (nolan-approval-presentation.md, w4 validation reports).
- `fyd-lane/` — P0 mission lane tooling (check-stable.py.bak-2026-09-27 shows today’s edits).
- `sprint-2026-09-24/` — Sept 24 sprint evidence dirs.
- `outreach/` — ongoing engagement machinery (today’s eligibility-audit.jsonl growth).
- `tandem/` — Meta AI tandem machinery (mostly 2026-09-13/14 vintage).
- `.worktrees/*`, `~/hatch/worktrees/*`, `~/nolan/worktrees/*` — lane worktrees at various SHAs (not in porcelain; separate).
- 30 entries with `2026-09-27` in their names (today’s work).

UNKNOWN — do not guess owners:
- The ~100 single-entry long-tail dirs (`lane-p01/`, `uilane2/`, `uilane-patch/`, `track-a/`, `track-c/`, `track-f/`, `replay-lane/`, `work-askfyd/`, `whythis-proof/`, `tenant-os/`, `tenanos-wave/`, `sprint-2026-09-26-24h/`, `second-site-run/`, `practice-build/`, `ping-website-upgrade/`, `ping-watchdog/`, `ping-social/`, `ping-overnight/`, `ping-harvest-continuation/`, `demotion-lane/`, `caller-adaptation-lane/`, `agent-operating-model/`, `acquisition-seam/`, `ce001/`, `ce002/`, `circle-reset/`, `f7-patch/`, `f7-evidence/`, `f01-test/`, `f01-fix/`, `edge-proof/`, `edge-port/`, `.jarvis/`, `.hatch-browser/`, etc.) — each is one untracked entry; owners not determinable from porcelain alone.
- The 229 loose root-level files: scripts and notes from many dates (2026-09-12 → 2026-09-27); several are dated before the P0 sprint (e.g. `discovery-2026-09-12-*.md`) and have no attributable owner.
- Duplicate/ambiguous copies: `mobile-objects-lane/` vs `fyd-product-lane/` site-client.tsx; `fyd-product-lane/src/` vs `fyd-lane/` vs `fyd-build/` (separate repo) FYD trees.

## Signs of the "correct clean worktree/branch"

- Current state: main working tree on branch `p0/approval` at `b96e7d2`. This is the P0 sprint branch — the natural branch context for the FYD work.
- No clean duplicate worktree of the `workspace` repo at `b96e7d2` exists in `git worktree list`. All existing worktrees of the workspace repo sit at other SHAs (falsification/replay/substrate lanes). The tracked `fyd-build` repo has clean-ish worktrees (`/home/hatch/workspace/fyd-replay-2026-09-27-r2`, `.worktrees/gap2-fydbuild`), but that is a different repo.
- Several stale/prunable worktrees under `/tmp/` and `/home/nolan/worktrees/` exist — do not use prunable `/tmp` worktrees for a canonical commit.
- Recommendation for disposition: a fresh worktree at `b96e7d2` on a dedicated patch branch (NOT `p0/approval` directly) would be the clean commit surface for the one-line min-w-0 patch — but only after the canonical `site-client.tsx` copy is identified by the owner of the proven change.

## Caveats

- Porcelain alone cannot attribute ownership; every "plausibly tied" assignment above is inference from path/date, not proof.
- The 570 `outreach/` untracked entries were not individually enumerated; only subdir groupings were tallied.
- Build-output contamination is minimal (2 `node_modules`/`.next`/dist hits; 29 `__pycache__`/`.pyc`/`.log` hits), so this is mostly lane/tooling/doc sprawl, not build artifacts.
- The workspace repo tracks `AGENTS.md` and other root files, but NOT the loose 229 root-level untracked files — those were never added.
