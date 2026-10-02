# FYD-012 portability fix (2026-09-27) — binding-coverage occurrence-ID scheme

Fix worker: FYD-012 portability subagent. Gap from the independent verification
ledger (fyd-012-verify-2026-09-27.md): occurrence IDs were
sha256(absolute-checkout-path + function + normalized line), so
binding-coverage.test.ts passed only at ~/workspace/fyd-build.

## Work area

- Repo ~/workspace/fyd-build, branch `fyd-012-binding-verifier`.
- Clean worktree /tmp/fyd012-port (committed here); second worktree
  /tmp/fyd012-port2 (detached HEAD) for the portability proof.
- Main checkout (fyd-025-semantic-determinism) and all other agents'
  worktrees untouched. Local commit dfe3374 only; NO push, NO merge.

## Change (commit dfe3374, local only)

`scripts/fyd012-binding-coverage.py`:
- `WORKSPACE = Path("/home/hatch/workspace")` replaced with
  `REPO_ROOT = Path(__file__).resolve().parent.parent`.
- Identity path is now `path.resolve().relative_to(REPO_ROOT)` (repo-root-relative,
  e.g. `src/fyd/components/renderer.tsx`); the scheme is otherwise identical
  (sha256 of path + enclosing function + normalized line).
- Files outside the repo root fall back to absolute-path IDs that can never
  match a repo-relative allowlist entry: fail-closed direction preserved
  (unknown/unmatched read = FAIL).
- The ported implementation is byte-identical to the version already present
  on the verified fyd-025 cumulative stack, except for the added
  canonical-invocation Usage doc (below).

`src/fyd/components/__tests__/binding-coverage.test.ts`: no formula
duplication (it shells out to the script); updated to the pinned canonical
invocation (repo root as cwd, repo-root-relative file arguments) and its
docstring corrected to the new identity description.

## Pinned canonical invocation (per parent refinement)

FYD-038 found the OLD scheme was invocation-sensitive (jest's absolute
checkout path `fyd-build/...` vs a direct run's relative `src/...` gave
different IDs for the same read). The new scheme normalizes every in-repo
path (absolute or relative, any cwd) to the same repo-root-relative ID, so
the ambiguity is eliminated by normalization, not moved. One canonical form
is documented in the script Usage and used by the test:

  from the repo root:
  python3 scripts/fyd012-binding-coverage.py --check \
      --allowlist scripts/fyd012-binding-coverage.allowlist.json \
      src/fyd/components/renderer.tsx

Verified agreement: canonical relative invocation, absolute-path invocation,
and absolute-path invocation from a foreign cwd all produce LINT PASS with
identical IDs. A relative-path invocation from a foreign cwd errors
(FileNotFoundError, rc=1): fail-closed, never a silent pass.

## Allowlist re-key (mechanical, via the script's own --inventory)

4 live entries re-keyed under the new scheme (category + justification
preserved verbatim):

| old ID (fyd-build/ scheme) | new ID (repo-root scheme) | read |
|---|---|---|
| 1cb037a31b691c67 | d4a86f58f0571df9 | renderer.tsx:143 [fieldOf] |
| d09d8db3af37d8ab | 1d92e1e92e1c00e1 | renderer.tsx:572 [LinksSection] |
| 859b34e1b6ba896b | 06e9ab43bc5ccf29 | renderer.tsx:612 [SocialProofSection] |
| f4010462088603ef | e5b70979b45539fd | renderer.tsx:613 [SocialProofSection] |

Cross-check: the 4 new IDs are exactly the 4 renderer entries in the
verified fyd-025 stack's allowlist (independent confirmation the scheme
matches the canonical one).

14 stale entries DROPPED (not re-keyable): their reads (extra sort-only
fieldOf variants, claimKind presentation-labels, duplicate socials/reviews/
quote probes) were eliminated by the FYD-012 refactor itself. Verified
unrecoverable from git: neither 573c0b6^ nor 573c0b6 contains those reads
(they existed only in an uncommitted intermediate working tree), and
`claimKind` appears nowhere in any committed renderer. Their old-scheme IDs
could never match an occurrence under the new scheme, so dropping preserves
fail-closed; the justifications survive in git history at 573c0b6.

## Verification evidence

- Portability, BOTH worktrees (/tmp/fyd012-port, /tmp/fyd012-port2):
  `lint --check` -> `FYD-012 LINT PASS: 4 direct read(s), all allowlisted.`
  exit 0 in each.
- `binding-coverage.test.ts` jest: 2/2 PASS in each worktree (the first test
  was red at any non-canonical checkout before this fix).
- Bypass probe still bites: injected `__fyd012BypassProbe` /
  `o.fields["bypass_probe"]` in a temp copy -> `FYD-012 LINT FAIL`,
  names the probe, rc=1.
- Full suite in /tmp/fyd012-port: **24 suites, 231 tests, all PASS**
  (previously 230/231 with the location artifact as the sole failure).
- `npx tsc --noEmit -p tsconfig.json`: exit 0, clean.

## Branch-unification note (explicit, per task)

The fyd-038-demo-synthetic-labeling branch carries its own copy of the
allowlist under the OLD scheme and just landed commit ae4ee85 re-keying its
new entry to **1f5357356a7c0b19** (still OLD scheme; FYD-038 claimKind
presentation-label justification). At branch unification, the FYD-038
allowlist copy MUST be re-keyed under the new repo-root scheme (the old ID
will never match a new-scheme occurrence, so it would fail closed, not
silently pass — but it must be re-keyed for the entry to keep covering its
read).

## Boundaries held

No pushes, no merges, no main/master commits (dfe3374 is local-only on
fyd-012-binding-verifier). No HPP original contact. No credentials. No broad
process kills. Both worktrees removed after verification.

## Verdict

**FYD-012-PORT VERIFIED**
