# LANE B13 DIRTY-TREE ARCHAEOLOGY REPORT — PING 24h Program

Status: **HYPOTHESIS** — read-only observations via `~/workspace/pig-fb/pigwsl-exec.sh -s` against the live Pig WSL tree. Nothing merged, reset, cleaned, checked out, stashed, or committed. The working tree is byte-identical to before this lane ran (144 porcelain lines before and after), except one new read-only ref (see Preservation). T+0 = 2026-09-28 14:26 MDT; this lane ran ~15:11-15:35 MDT (T+0.75).

## 1. TREE IDENTITY

- Path: `/home/nolan/projects/ping` (Pig WSL; absent from this sandbox, reached only over Pig SSH)
- Branch: `hardening/2026-09-28-vocab-ssrf`, upstream NONE
- HEAD: `0264d517ea53358d9246ddbbba66bb9dd0beb0d4` (2026-09-28 05:59:49 -0600)
- Dirty: **74 modified tracked + 0 staged + 70 untracked** porcelain entries (144 lines)
- Diff volume (tracked): **2708 insertions, 984 deletions** across the 74 files
- Last writer activity: 2026-09-27 22:58:43 MDT (~16.2h before this lane ran). No active writer.

## 2. DIFF SUMMARY

### 2a. Modified tracked files (74), by area

| Area | Files | Notable |
|---|---|---|
| src/app/api/mc (dispatch slice) | 4 | dispatch/route.ts 121+/19-, _lib/mc-dispatch.ts 58+/2-, missions routes small |
| src/app/api/fyd (ask + customize + edge + overrides + why-this) | 7 | ask-pipeline.ts 58+/11-, customize/route.ts 57+/3- |
| src/fyd/ask | 8 | visitor-answer.ts 159+/16-, context-compiler.ts 1+/4- |
| src/fyd/object, customize, edge, ui, media, tenant, sitespec, proceduralize, acquisition, components, data, onboarding, owner-mode | ~30 | customize/server.ts 421+/7-, owner-overlay.ts 180+/4-, why-this-steps 33+/22-, ask-composer.ts 378+/25- (lib) |
| src/app (sites, build, dev, layout, o/[objectId]) | 11 | o/[objectId]/page.tsx 5+/359- (large deletion), site-client/site-metadata |
| src/lib/ping | 3 | ask-composer.ts 378+/25-, ping-object-reader.ts 35+/2-, types.ts 8+/0- |
| tools/fyd-journal-gateway | 1 | server.mjs 31+/1- |
| tests | ~20 | owner-overlay.test.ts 261+/1-, route-smoke 88+/29-, plus tenant/edge/ask suites |

Content themes of the batch: (1) **MC dispatch hardening** — trusted caller identity (x-mc-caller-key registry), deterministic idempotency keys, lookup-before-mint with 409 HOLD, tenant-scoped artifact publishing; (2) **FYD ask/customize/object hardening** — tenant-smuggling fixes, verified public projection gating, digest-law pinning; (3) **digest consolidation** — compiler now imports from the new shared digest module.

### 2b. Untracked files (70 porcelain entries, ~2708 individual files)

Mostly build artifacts (four `.next*` backup dirs) and generated media (`public/fyd-media/*`, `public/t1-media/*`, webp/jpg/png). The **72 source files** worth preserving: 2 new MC lib modules, 7 new MC route dirs (agents, approvals, graph, object, search, today, trace-forward), `src/lib/ping/digest.ts` + its test, `src/lib/secrets/` (secret-broker.ts + redteam test), `.github/` agent/instruction definitions (10 files), `mc-approval/` Python approval tooling, new test files, `.proof-tmp/` hostile proofs, `geometry-regression.mjs`, media manifests, `var/` intake results. Excluded from the patch as non-work: build dirs, generated media binaries, `__pycache__`, `*.tsbuildinfo`, and junk files `=586` and `nul`.

### 2c. Write-wave timing (CORRECTION vs lane 9)

Lane 9 reported a "single stamp 2026-09-27 22:55-23:00". File mtimes show **five waves**:

- 21:34:41 — bulk untracked source (digest.ts, mc-dispatch-identity.ts, mc-tenant-gate.ts, mc-approval/, stale-guard test, media manifests)
- 21:35:15-16 — .github definitions, 6 new MC routes, secrets module, geometry-regression
- 22:13:03 / 22:13:17 — `.bak-r3` backups + ask-scope-guard test
- 22:22:01 through 22:53:50 — test files trickling in (site-content-cleanup, prod-6, objects-lab, overrides-get, prod-10, object-node-view, website-cta)
- 22:55:30 — **all 74 tracked files rewritten within ~16ms** (scripted batch)
- 22:58:43 — newest untracked (ask-response-class.test.ts, `nul`)

Reflog shows `reset: moving to HEAD` at 20:32:05, 20:32:15, 21:34:37, and 22:55:28, each immediately followed (2-4s) by a bulk write. This is a **machine apply pattern** (reset then scripted re-write), not interactive editing.

## 3. CONTEXTPACK-REGION OVERLAP VERDICT

Patch baseline: `decision-fabric/contextpack-wire-2026-09-28 @ 9a555021` (clean worktree, one call site wiring `compileAskContext()` into the dispatch context-mint region).

**Verdict: TEXTUAL OVERLAP, SEMANTIC EXTENSION, NO DUPLICATION.**

- `src/app/api/mc/dispatch/route.ts` (121+/19- dirty): the dirty work modifies the exact region the patch targets. The `contextPackId = 'mc-ctx-' + missionId` params-only mint and the `context.json` publishArtifact block (the patch's call site) sit inside dirty hunks: publishArtifact now takes a `tenant` argument, and the mint is preceded by the new caller-identity gate and idempotency lookup. **A 3-way merge is required**; the patch's helper would need the tenant-aware publishArtifact signature.
- `src/fyd/ask/context-compiler.ts` (1+/4- dirty): trivial import swap, local `sha256Hex` replaced by import from the new untracked `src/lib/ping/digest.ts`. No behavioral change for string inputs (digest.ts `sha256Hex` is the raw primitive; `digestCanonical` is the composed form). No conflict with the patch, but note the dependency: the dirty compiler requires `digest.ts` to exist.
- New lib files vs the patch: the dirty tree adds `mc-dispatch-identity.ts` (Mission J) and `mc-tenant-gate.ts` (Mission L); the patch adds its own testability helper. Different files, no filename collision.
- **The dirty work does NOT wire compileAskContext.** The params-only context mint is intact, so the patch's purpose (closing EVIDENCE to ORCA CONTEXT) is not duplicated. The dirty batch EXTENDS the surrounding slice (identity, idempotency, tenant plumbing) around the same mint the patch replaces.
- Heads-up for other lanes: the 409 HOLD / idempotency machinery that lanes 12/B4 analyzed lives **only in this dirty worktree**, not at HEAD and not in the patch branch. Any lane reasoning about dispatch behavior must state which tree it read.

## 4. OWNER / LANE IDENTIFICATION

**Attributed with medium confidence to a Pigi-driven mission agent batch on 2026-09-27 (QC/hardening pass). Exact lane designation: UNKNOWN.**

Positive signals (all read-only, from headers/comments/reflog):

- File headers self-name the work: **"Mission J (Q-P0-06 finding #1, 2026-09-27)"** (`mc-dispatch-identity.ts`) and **"Mission L (Q-P0-06 finding #4, 2026-09-27)"** (`mc-tenant-gate.ts`); `mc-tenant-gate.ts` also references **"Mission D's synthetic tenants (tenant-a-synth)"**.
- Finding-ID family across the diff: Q-P0-06, Q-C-01, PROD-1, PROD-5/PROD-6, K2, H2, plus dated pins ("DIGEST LAW (pinned 2026-09-27)", "MOUNT CONTRACT (PROD-1, 2026-09-27)", "Rationale reversal (H2, 2026-09-27)"). This is a numbered-finding remediation batch, each finding addressed by a "Mission".
- `src/lib/ping/digest.ts` header cites **"NORTH STAR BACKLOG_PING.md rule 16"** and addresses "every lane": the writer operated inside a lane-based program with shared digest law.
- Reflog: commits by Pigi; the dirty batch was written while on `fyd/sprint-integration-2026-09-24` (HEAD 4a8c5f2e), before the 09-28 checkout to `hardening/2026-09-28-vocab-ssrf` and commit 0264d517, which left the dirty files in place.
- Stash `stash@{0}`: "On fyd-factory: fyd-sprint-2026-09-24-pre-purehead-dirty-state" (Pigi, Sep 24) — a related sprint branch naming, but it predates this batch and is not this batch's stash.
- Windows-shell artifacts (`=586`, `nul`) suggest the writer staged through a Windows-influenced shell.

Missing signal (why not a firm ID): **no lane name appears in any file header, comment, TODO, reflog entry, or stash message.** TODO/FIXME/HACK markers: zero in added lines. The batch never signs itself beyond "Mission J/L". Owner decision (ASSUME LIVE OWNED WORK) is therefore respected as stated: nothing was touched.

## 5. PRESERVATION DISPOSITION

Useful work found: **yes**. Preserved as an independent patch file (read-only operations only):

- [dirty-tree.patch](sandbox://workspace/ping-24h/lanes/laneB13-dirty-tree/dirty-tree.patch) — 913 KB, 21,734 lines, 146 file diffs: Part 1 = `git diff` over the 74 modified tracked files; Part 2 = `git diff --no-index /dev/null FILE` for the 72 untracked source files. Build artifacts, generated media, pycache, tsbuildinfo, and junk files excluded (listed in the patch header).
- Branch ref created WITHOUT touching the working tree, index, or HEAD (explicitly permitted): `refs/lanes/laneB13/dirty-tree-base` now points at `0264d517ea53358d9246ddbbba66bb9dd0beb0d4`. Verified post-creation: HEAD unchanged, worktree still 144 dirty porcelain lines, first dirty files intact. Note: the ref marks the base commit only; the dirty content itself lives in the patch file, not in any commit.
- Raw probe outputs: `raw/probe1.out` (status/diffstat/reflog/stash), `raw/probe2.out` (full tracked diff), `raw/probe3.out` (untracked inventory/mtimes), `raw/probe4.out` (new lib file headers), `raw/probe6.out` (untracked diffs), `raw/overlap-diffs.txt`.

No merge, no reset, no clean, no checkout, no stash, no commit, no push. The gateway, scheduler missions, and :3100 were not contacted.

## 6. CAVEATS AND FOLLOW-UPS FOR THE PARENT

1. The dirty `context-compiler.ts` depends on untracked `digest.ts`. If the dirty tree is ever discarded, the compiler reverts to its local `sha256Hex` and nothing breaks; if the dirty tree is kept, `digest.ts` must be kept with it (the patch file preserves both).
2. Lane B9's digest-authority finding is grounded in this dirty state: `digest.ts` pins undefined-valued keys as `"key":null` (emitted, not dropped), which diverges from `dev-signer.canonicalizeJson`. The "one digest authority" claim in the header is aspirational; three formulations still coexist.
3. The caller registry path in `mc-dispatch-identity.ts` (`/home/nolan/workspace/mission-control/dispatch-identities.json`) lives outside the repo; the dirty dispatch slice fail-closes (503/401) without it. Any future merge of this work needs that file provisioned.
4. The patch branch merge sequencing (owner decision ~15:04 MDT: ContextPack merge queued behind gateway proof + reached-loop re-run) is unaffected by this lane; this report only records that the merge, when it happens, needs a 3-way on the context-mint region.
