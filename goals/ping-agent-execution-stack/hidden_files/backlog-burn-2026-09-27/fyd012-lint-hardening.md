# FYD-012 LINT HARDENING ledger

Date: 2026-09-27 ~09:55 MDT. Agent: FYD-012 LINT HARDENING subagent.
Source finding: fyd-integration-replay.md §3/§6 finding 2 — the FYD-012
binding-coverage lint computed occurrence IDs as
sha256(workspace-relative path + function + normalized line) with
`WORKSPACE=/home/hatch/workspace` hardcoded, so the lint subtest failed in
any checkout not at exactly `/home/hatch/workspace/fyd-build`.

Branch: `fyd012-lint-hardening` (local, off 9d7ba0a, never pushed).
Commit: `b0cef74` "FYD-012 lint hardening: repo-relative occurrence IDs".

## The defect

`scripts/fyd012-binding-coverage.py` line 27: `WORKSPACE = Path("/home/hatch/workspace")`,
line 49: `rel = str(path.relative_to(WORKSPACE)) if ...`. The jest test passes
absolute paths, so every occurrence ID embedded `fyd-build/...` — checkout-path
coupled. Any other checkout location -> every ID misses the allowlist ->
`binding-coverage.test.ts` "live renderer" subtest FAILs (proven in the replay
at `~/workspace/fyd-replay/integrated`).

## Harvest before writing

Repo tooling has no `git rev-parse --show-toplevel` convention; the established
pattern is script-location-relative root derivation (`scripts/build-server.js`:
`const ROOT = path.resolve(__dirname, "..")`). Reused it in Python:
`REPO_ROOT = Path(__file__).resolve().parent.parent`. No git dependency, works
in worktrees/copies.

## The delta (3 files, +22/-68)

1. `scripts/fyd012-binding-coverage.py`
   - `WORKSPACE = Path("/home/hatch/workspace")` -> `REPO_ROOT = Path(__file__).resolve().parent.parent`
   - `occurrences()`: `rel` is now `str(path.resolve().relative_to(REPO_ROOT))`
     (try/except ValueError). Files outside the repo root (e.g. the bypass
     probe's /tmp copy) fall back to the absolute path string: stable per
     invocation, can never collide with a repo-relative allowlist entry,
     so the check stays fail-closed.
   - Docstring updated: identity is sha256(repo-relative path + enclosing
     function + normalized line); checkout-location coupling called out.
2. `scripts/fyd012-binding-coverage.allowlist.json` — REGENERATED, 19 -> 5 entries.
   Reconciliation (from the actual files, not memory):
   - Full-tree scan (old ID logic, absolute paths): exactly 5 of the 19 entries
     matched a current occurrence; all 5 are in `src/fyd/components/renderer.tsx`
     (the only file the jest test scans).
   - The other 14 entries match NO current occurrence anywhere in the repo
     (scanned all tracked .ts/.tsx outside node_modules/dist): they are stale
     reads orphaned when 5a9c86f/9d7ba0a changed renderer.tsx lines.
   - New IDs computed by the patched lint; justifications carried over 1:1
     keyed by (enclosing function, normalized line text), zero unmatched reads.
   - Result: 1x presentation-label (FYD-038 claimKind `1f5357356a7c0b19`),
     1x sort-only (fieldOf `d4a86f58f0571df9`), 3x gate-backed
     (LinksSection socials `1d92e1e92e1c00e1`, SocialProofSection probes
     `06e9ab43bc5ccf29`, `e5b70979b45539fd`).
   - Dropped orphan IDs (categories for traceability):
     2d16b47ec1e3e555 gate-backed, 32d18d8481997542 gate-backed,
     339165c892ceb665 gate-backed, 34ab728bb722ac86 gate-backed,
     4e45d82f996ffd0d gate-backed, 4e69db27ed2984da gate-backed,
     5da15cffb43e7f9b gate-backed, 5fb889c9af2e17fc presentation-label,
     620847318c2ddc85 gate-backed, 8629d1a0c191f571 sort-only,
     872cd50125cdc7a1 gate-backed, 9a1ea649960b52da presentation-label,
     ec4657f7ef13a146 sort-only, f26ab42c773464b5 sort-only.
3. `src/fyd/components/__tests__/binding-coverage.test.ts` — docstring:
   "sha256(workspace-relative path..." -> "sha256(repo-relative path...".

## Proof 1: canonical checkout `~/workspace/fyd-build`

- `python3 scripts/fyd012-binding-coverage.py --check --allowlist ... renderer.tsx`:
  `FYD-012 LINT PASS: 5 direct read(s), all allowlisted.`

## Proof 2: different checkout location (the exact replay failure scenario)

- Plain file copy of the tree to `~/workspace/fyd-alt-location-checkout`
  (node_modules symlinked, as in the replay).
- `--check` there: `FYD-012 LINT PASS: 5 direct read(s), all allowlisted.`
- `--inventory` diff between the two checkouts: byte-identical JSON
  (`IDS IDENTICAL ACROSS CHECKOUT LOCATIONS`).
- Full copy removed afterwards.

## Bypass-probe proof (lint still bites)

- jest `binding-coverage.test.ts` at BOTH locations: 2/2 pass —
  "live renderer: every direct .fields read is justified" PASS and
  "lint bites: an injected direct read fails the check" PASS
  (injected `o.fields["bypass_probe"]` flagged with its own occurrence id,
  output contains `__fyd012BypassProbe` and `bypass_probe`).
- Mechanism: probe file is written to /tmp (outside REPO_ROOT) -> absolute-path
  IDs -> cannot match the allowlist -> fail-closed.

## Full suite + typecheck (canonical checkout, branch fyd012-lint-hardening @ b0cef74)

- `npx jest --config jest.config.cjs`: 27 suites, 242 tests — 242 PASS.
  (Replay's 241/242 + 1 FAIL is resolved: the checkout-coupled subtest now passes.)
- `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.

## Cost / authorities

- Deterministic + headless labor only. No paid calls. $0 of the $25 escalation budget.
- No pushes, no destructive git, no new authorities, no production touch.
- Local branch `fyd012-lint-hardening` only; integration merge left to the parent.
