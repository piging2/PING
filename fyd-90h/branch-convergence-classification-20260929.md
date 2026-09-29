# Branch Convergence Classification — 2026-09-29 (Writer B, Lane 2, Phase 1)

Read-only classification interval. No commits, merges, cherry-picks, or modifications were made to either line.

## Lines under classification

| Line | Repo (Pig WSL, Pig-local authority) | Branch | HEAD |
|---|---|---|---|
| TRACKC | `/home/nolan/projects/ping` | `fyd/builder-harvest-trackc-2026-09-28` | `ed3ff708` |
| CONVERGENCE (served) | `/home/nolan/projects/ping-fyd-converged` | `fyd/convergence-2026-09-28` | `b9a0201a` |

Merge-base: `f877c391` (verified present in both repos; both ranges computed from it).

Unique commits since merge-base: TRACKC = 2 (`b38973fb`, `ed3ff708`); CONVERGENCE = 8.

## Bucket counts (headline)

| Bucket | Count |
|---|---|
| ONLY TRACKC | 1 unique commit (`b38973fb`, 200 files); of its 111 files found nowhere in the convergence range, **42 files are real implementation** (the rest are artifacts/media/backups — see SUPERSEDED) |
| ONLY CONVERGENCE | 7 unique semantic commits |
| SEMANTIC DUPLICATES | 1 commit pair, **byte-identical patch** + **88 files byte-identical** across the lines |
| CONFLICTS | **0** (mechanical merge-file test over all 89 co-changed files: 63 clean, 26 identical adds, 0 conflicts) |
| SUPERSEDED | ~65 files (artifacts, stale backups, scratch, generated media, 1 older file version) |
| MUST HARVEST | **42 files in 7 groups** (A–G), + 4 media manifests flagged REVIEW (H) |

---

## ONLY TRACKC

- `b38973fb` — "wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)" — 200 files changed, 18198 insertions(+), 984 deletions(-). This is the 140-file WIP bank referenced in the CEO order. Breakdown of its 200 files:
  - 89 files also changed on the convergence line → 88 byte-identical (not really unique; see SEMANTIC DUPLICATES), 1 where the convergence version is newer (see SUPERSEDED).
  - 111 files not touched by the convergence range → 42 real implementation files (see MUST HARVEST) + artifacts/media/backups (see SUPERSEDED).

## ONLY CONVERGENCE (7 unique semantic commits)

| SHA | One-line semantic description | Scope |
|---|---|---|
| `0f859bac` | proceduralizer + digest law (canonical `sha256Hex` in `src/lib/ping/digest.ts`) | 9 files, +1202/-61 |
| `1a4c7a90` | renderer safety + mobile hydration fix | 13 files, +761/-115 |
| `7712f11b` | evidence binding + owner visibility + tenant isolation | 15 files, +605/-144 |
| `8fce667d` | proposal/approval + approve-to-projection regeneration (`regen-trigger.ts`) | 5 files, +1129/-15 |
| `6accf3ba` | Ask FYD + BFF read boundary | 25 files, +1798/-185 |
| `d41d94cd` | demo routes + read surface + journal gateway | 14 files, +929/-418 |
| `5732485b` | build-identity seam + repo config (readyz) | 11 files, +525/-1 |

(8th commit `b9a0201a` is the byte-identical duplicate — see below.)

## SEMANTIC DUPLICATES

1. **The known identical fix, confirmed byte-identical**: `ed3ff708` (trackc) vs `b9a0201a` (convergence), both titled "trackc: route owner-asserted provenance through the owner_authored lane". Patch sha256 identical on both sides (`af079443…`); 3 files: `src/fyd/builder/planner.ts`, `src/fyd/components/renderer.tsx`, `src/fyd/sitespec/binding-verifier.ts` (62 insertions, 9 deletions).
2. **88 of 89 co-changed files are byte-identical between the lines**: 26 files added on both sides with identical content (10 `.github/` agent/instruction files, 12 test files, `src/lib/ping/digest.ts` + its test, 4 proceduralize redacted fixtures, journal-gateway README + start.sh, 2 site tests), plus 62 files modified on both sides converging to the identical result (all auto-merge clean).
3. Interpretation: the convergence line already incorporates the curated value of the Wave-4 WIP sweep for these files. The duplicate fix commit means both lines landed the same binding-verification fix; the served line's copy is the canonical one.

## CONFLICTS

**None.** Mechanical `git merge-file` over all 89 co-changed files (base `f877c391`, trackc `ed3ff708`, convergence `b9a0201a`): 63 clean merges, 26 identical additions, **0 conflicts**. The single differing file, `src/app/api/fyd/customize/route.ts`, is not a conflict: the convergence version is a strict functional superset (adds the approve/clear → projection-regeneration integration from `8fce667d`, honest regen reporting in the owner response). No file is changed incompatibly anywhere.

## SUPERSEDED

- Trackc's version of `src/app/api/fyd/customize/route.ts` — older variant; the convergence line already carries the fuller regeneration-aware version.
- Build artifacts inside the WIP bank (12): 5 `__pycache__/*.pyc`, 3 `tsconfig.*.tsbuildinfo`, 4 `var/fyd-intake/*` + `var/mc-approvals.json` runtime state. The convergence line's ~11.5k-line generated-material cleanup already removed this class of material (proven harmless by the served-path proof).
- Stale backups (4): `src/fyd/ask/__tests__/ask-scope-guard.test.ts.bak-r3`, `src/fyd/components/registry.ts.bak`, `src/lib/ping/ask-composer.ts.bak-r3`, `tools/fyd-journal-gateway/server.mjs.bak-2026-09-27-k`.
- Scratch/junk (5): `.proof-tmp/shell-less.tsx`, `.proof-tmp/step5-hostile.ts`, `=586`, `nul`, `geometry-regression.mjs`.
- Generated media (44): `public/fyd-media/*` webp variants (25), `public/t1-media/*` webp/jpg assets + `PROVENANCE.json` (17), `public/images/ping-cosmos-hero.jpg`, `public/images/ping-mark.png` (2). Derivable build outputs; excluded by the standing generated-material cleanup direction.

## MUST HARVEST (trackc-unique valuable implementation the served line needs)

**A. Mission Control API surface (19 files)** — `mc-approval/` (9 files, ~1400 lines): `approval_request.py` (ApprovalRequest primitive, 515 lines), `approval_cli.py` (record/decide/get over the :3100 API), `proposal_validate.py`, `proposal_record.py`, `emit.py`, adapters, VENDOR-README, `w4-proposal.json` — the WAITING_APPROVAL product machinery. Plus MC routes: `agents/route.ts` (222), `approvals/route.ts` (130), `graph/route.ts` (80), `object/route.ts` (160), `search/route.ts` (205), `today/route.ts` (235), `trace-forward/route.ts` (119); `_lib/mc-dispatch-identity.ts` (caller registry/key-header identity, 72), `_lib/mc-tenant-gate.ts` (51). Plus improvements to served-line files: `mc/dispatch/route.ts` (+121/-19: idempotency keys, caller identity, mission terminal statuses, prior-mission lookup), `mc/_lib/mc-dispatch.ts` (+58/-2), `mc/missions/route.ts` (+15/-2), `mc/missions/[id]/route.ts` (+19/-1).

**B. Secret custody (4 files, ~857 lines)** — `src/lib/secrets/secret-broker.ts` (401: Lane L — agents never receive tokens, only opaque capability handles scoped to principal/operation/target/audience/window/uses), `__tests__/secret-broker.redteam.test.ts` (370), `README.md`, `jest.config.cjs`. Absent entirely on the served line (0 files under `src/lib/secrets`).

**C. Digest-law dedup (4 modified files)** — `src/fyd/acquisition/arrow2-proof.ts`, `live-loop.ts`, `static-adapter.ts`, `src/fyd/media/authority-binding.ts`: each drops its local `sha256Hex` for the canonical `@/lib/ping/digest` (1 ins / 4 del). Matches the convergence line's own digest-law direction (`0f859bac`).

**D. Build owner panel (2 modified files)** — `src/app/build/[siteId]/owner-panel.tsx` (+66/-1), `page.tsx` (+23/-7).

**E. Dev objects lab (4 files)** — improvements to `src/app/dev/objects/lab-adapter.ts` (+18/-1), `objects-lab-client.tsx` (+28), `page.tsx` (+6/-1); new `__tests__/objects-lab-client.test.tsx` (126). Internal lab infra, never customer product.

**F. UI components (3 added files)** — `src/components/effects-provider.tsx` (101), `effects-toggle.tsx` (79), `hero-intro.tsx` (84).

**G. Tests/config (2 added files)** — `src/app/api/fyd/objects/[objectId]/overrides/__tests__/overrides-get.test.ts` (73), `src/fyd/proceduralize/__tests__/canonicalizer-agreement.test.ts` (143), `src/fyd/jest.config.cjs` (30).

**H. REVIEW (4 files, owner decision)** — `src/fyd/media/manifests/coppersmith-plumbing-live.json`, `happy-place-live.json`, `live-9d13c4196b4f.json` (640–649 lines each), `ping-fyd.json` (empty). Decide whether manifests are source or generated material before harvesting.

## Convergence-direction recommendation

**Converge toward the served line** (`fyd/convergence-2026-09-28` @ `b9a0201a`), harvesting the MUST HARVEST delta onto it. Evidence:

1. The served line is the more converged line: 7 semantic commits on the FYD product chain (Ask FYD read boundary, evidence binding, proposal/approval → projection regeneration, digest law, renderer safety, journal gateway, build-identity) + the identical binding-verification fix, plus the ~11.5k-line generated-material cleanup already proven harmless by the served-path proof (prior interval).
2. Zero textual conflicts: the convergence operation is mechanically trivial — a clean three-way merge of the MUST HARVEST files.
3. 88/89 co-changed files are already byte-identical: most of the WIP bank's curated value is already on the served line; only the ~42-file MUST HARVEST delta is missing.
4. No reverse merge: trackc is the donor, never the target — merging convergence into trackc merely because it is easier is explicitly out.

## What the convergence operation MUST and MUST NOT touch

**MUST (next interval, after Writer A completes, with explicit authorization):**
- Apply MUST HARVEST groups A–G (42 files) onto the served line as ONE atomic commit; group H (4 manifests) only on owner decision.
- Run the served line's test suite with the harvested tests included (redteam, overrides-get, canonicalizer-agreement, objects-lab-client).
- Preserve attribution: the harvested work originates from Wave-4 integration-ledger sweep commit `b38973fb`.

**MUST NOT:**
- No commit to the served branch this interval — Writer A is the sole writer on it now.
- No cherry-pick or merge until explicitly authorized next interval.
- No reverse merge (convergence into trackc) as the convergence mechanism.
- Do not harvest SUPERSEDED artifacts (`.pyc`, `tsbuildinfo`, `var/`, `.bak`, scratch, generated media) — they would re-dirty the served line's cleanup.
- Do not re-add the byte-identical duplicate content — it is already present on the served line.

## Untouched-repo confirmation

- `/home/nolan/projects/ping` (trackc): no tracked modifications, no commits made by this classification. Pre-existing untracked file `.worktree-inventory-20260929.md` observed (was present before this work; not created by Writer B).
- `/home/nolan/projects/ping-fyd-converged` (served): `git status` clean, no modifications.
- This interval performed reads only (`git log`, `git diff`, `git show`, `git merge-file` to /tmp scratch, `git ls-tree`, `git cat-file`).

## Method notes

- TIER 0 mechanical work: `git log --oneline f877c391..<branch>` ranges, `git diff` name lists, per-file `git merge-file` 3-way test (base/trackc/conv blobs), byte comparison via `cmp`/`sha256sum`.
- Semantic judgment applied only to: one-line commit descriptions, the MUST HARVEST vs SUPERSEDED value call on WIP-only files (via file headers and diff review), and the customize/route.ts superset analysis.
- Raw working artifacts in `/tmp` on the Pig (`/tmp/wip_files.txt`, `/tmp/conv_files.txt`, `/tmp/overlap.txt`, `/tmp/wiponly.txt`, `/tmp/missing.txt`, `/tmp/mfile/`, `/tmp/fix_*.patch`) — ephemeral; the classification above is the durable record.
