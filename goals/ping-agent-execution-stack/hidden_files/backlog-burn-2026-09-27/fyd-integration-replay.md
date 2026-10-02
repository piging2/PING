# FYD INTEGRATION REPLAY ledger — five lanes, one tree

Date: 2026-09-27 ~10:05 MDT. Replay agent: FYD INTEGRATION REPLAY subagent.
Task: build one integrated tree from the five lane branches on base `f90589e`,
re-run everything, prove or falsify each lane's DONE claim.

## 0. Branch HEAD verification (before integrating)

| Lane | Branch | Claimed SHA | Verified SHA | Match |
|---|---|---|---|---|
| FYD-002 acquisition | fyd-002-acquisition-contract | 905470c | 905470cac952cb5870d6cced8755d3d1d4202cbe | YES |
| FYD-010 field gate | fyd-010-field-gate | fa7067e | fa7067ee6e06019b39bd5d640ac7753d4868cfb3 | YES |
| FYD-012 binding verifier | fyd-012-binding-verifier | 573c0b6 | 573c0b62b232a0a82ca1aa517be5bf4c41096523 | YES |
| site-client residual | site-client-title-binding | 5a9c86f | 5a9c86f46129b6fef945ae5d0b6588906e85f640 | YES |
| FYD-038 synthetic labeling | fyd-038-demo-synthetic-labeling | 9d7ba0a | 9d7ba0a145184fe20a7e418af9b7512ce3832f98 | YES |

No moved branches. No mismatches.

## 1. Base-divergence finding: the five "branches" are ONE linear stack

All five merge-bases against `f90589e` = `f90589e` (no divergence), but the
branches are NOT siblings. Each lane stacked its commit on the previous lane's
tip:

```
f90589e (triage HEAD)
  -> fa7067e  FYD-010: field-level privacy gate for Ask FYD
  -> 905470c  FYD-002: acquisition contract (parent = fa7067e)
  -> 573c0b6  FYD-012: binding verifier (parent = 905470c)
  -> 5a9c86f  site-client title binding (parent = 573c0b6)
  -> 9d7ba0a  FYD-038: DEMO_SYNTHETIC labeling (parent = 5a9c86f)
```

Consequence: the replay's "sequential integration" is deterministic. Each lane
was developed and tested WITH the previous lanes' changes present, not in
isolation. The renderer.tsx "conflict" the task anticipated (FYD-012 + FYD-038)
was resolved by the lanes themselves in stack order, not by the replay.
What the replay verifies below is the COMBINED tree at the stack tip, which is
the honest object under test.

## 2. Integration log (fresh worktree, clean checkout)

- Worktree: `~/workspace/fyd-replay/integrated`, fresh `git worktree add` at
  `f90589e` on new local branch `fyd-integration-replay-2026-09-27`.
  (`node_modules` symlinked from the main working copy; `dist/` rebuilt, never
  committed; worktree `git status` clean apart from the symlink.)
- Merge 1 — `fyd-002-acquisition-contract`: clean, no conflicts. (Carried the
  FYD-010 delta with it because of the stack; see §1.)
- Merge 2 — `fyd-010-field-gate`: `Already up to date` (contained via merge 1).
  Recorded as a no-op merge commit.
- Merge 3 — `fyd-012-binding-verifier`: clean, no conflicts.
- Merge 4 — `site-client-title-binding`: clean, no conflicts.
- Merge 5 — `fyd-038-demo-synthetic-labeling`: clean, no conflicts.
- Conflicts: ZERO. Nothing to resolve by hand.

Integrated HEAD: `0e8705b9fdf495dc8e530df8aa5cab1dad8e85af`
(branch `fyd-integration-replay-2026-09-27`, local only, never pushed).
Tracked tree == stack tip `9d7ba0a` + merge commits. Full diffstat vs f90589e:
20 files, +2335/-73 (acquisition/, visibility policy, ask context-builder,
sitespec graph verifier, renderer.tsx, site-client.tsx, lib/ping types,
binding-coverage lint + 19-entry allowlist, 8 new test files, jest/tsconfig wiring).

### Authority reconciliation (reviewed, not created)

- `src/fyd/claims/` UNTOUCHED across the whole stack: claims.ts stays the
  **generation-time** authority (unchanged from FYD-008).
- `resolveBoundField`/`verifyPresentationBinding` (absorbed into
  `src/fyd/sitespec/graph.ts`) is the **render-time field-read** layer; every
  factual render in renderer.tsx and the site-client Featured row goes through
  `boundField`/`boundTitle`/`boundDescription`.
- `contentClassificationOf` / `claimBadgeLabel` / `ClaimBadge` (FYD-038) is a
  **presentation-labeling** layer: it reads `provenance.kind` and
  `fields["claimKind"]` for a closed-set label only; raw observed text is never
  rendered from those reads (the new claimKind read carries allowlist entry
  `be121a62092a16a9`, category `presentation-label`). No competing validator
  created; the three layers do not overlap in authority.

## 3. Verification results (all re-run by the replay agent)

### tsc
- `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.

### Full jest suite (integrated worktree)
- `npx jest --config jest.config.cjs`: **27 suites, 242 tests — 241 PASS, 1 FAIL.**
- The single failure: `binding-coverage.test.ts` >
  "live renderer: every direct .fields read is justified".
- Root cause (proven, not a content regression): the lint's occurrence IDs are
  `sha256(workspace-relative path + function + normalized line)` and the script
  hardcodes `WORKSPACE=/home/hatch/workspace`. The replay worktree lives at
  `fyd-replay/integrated/...`, so every ID misses the allowlist (which is keyed
  for `fyd-build/...`).
- Proof: `/tmp/fyd012-relpath-shim.py` reuses the lane's own lint functions with
  the canonical relative path `fyd-build/src/fyd/components/renderer.tsx` ->
  **5 occurrences, all allowlisted, LINT PASS**; the FYD-038 entry
  `be121a62092a16a9` matches the claimKind read exactly; allowlist = 19 entries
  (18 from FYD-012 + 1 from FYD-038).
- Decisive cross-check: the same suite at the canonical checkout
  `~/workspace/fyd-build` (tip `9d7ba0a`, identical tracked tree) passes
  **2/2**. The failure is a checkout-location artifact.
- REAL FINDING (mechanism fragility, not a lane falsification): the
  FYD-012 lint test only passes when the repo is checked out at exactly
  `/home/hatch/workspace/fyd-build`. Any other checkout path fails the suite.
  Worth a hardening item; does not change any lane verdict.

### Lane test files (targeted, integrated worktree): 7 suites, 48/48 PASS
- `src/fyd/acquisition` (FYD-002: both real fixture chains + 7 tamper/fail-closed
  cases incl. digest_mismatch, dangling_source_pointer, cross-chain refusal)
- `src/fyd/ask/__tests__/fyd-010-field-gate.test.ts` (13 tests)
- `src/fyd/sitespec/__tests__/graph.test.ts` (verifier fail-closed contract)
- `src/fyd/components/__tests__/binding-render.test.ts`
- `src/fyd/components/__tests__/site-client-title-binding.test.ts` (2/2)
- `src/fyd/components/__tests__/fyd-038-demo-synthetic.test.ts` (7 tests,
  incl. fixture honesty: zero overlay-authored objects in demo fixture)
- `src/fyd/ui/__tests__/fyd-038-badge.test.tsx` (2 tests: rendered-markup proof)

### Falsification probes (re-run, both ways where applicable)
- FYD-010 probe (`fyd010-askfield.probe.test.ts`, probe config re-rooted at the
  integrated worktree): **CASE A PASS** (visitor context: phone/home_address
  absent), **CASE B PASS** (demo_owner: fields intact). 2/2.
- FYD-002 tamper cases: 11/11 PASS (see acquisition suite above).
- FYD-012 bypass probe ("lint bites: an injected direct read fails the check"):
  **PASS** — injected `o.fields["bypass_probe"]` flagged with its own occurrence
  id, suite fails as designed.
- FYD-038 absence check: PASS — live demo fixture has zero overlay-authored
  objects; DEMO_SYNTHETIC classification proven present in the component by the
  rendered-markup badge test (one flipped object -> exactly one "Demo addition"
  badge with `data-classification="DEMO_SYNTHETIC"`).

## 4. Rebuild + served path (source != built != served)

- `npm run build:server` (tsc + alias rewrite, 25 rewrites) in the worktree.
  Built bytes verified to carry all five lanes: `maySeeField`,
  `verifyPresentationBinding`/`resolveBoundField`, `contentClassificationOf`,
  `boundTitle` all present in `dist/`.
- **Build digest** (sha256 over sorted per-file hashes of `dist/`):
  `0571fdd0dc45bc6a`
- Served: byte-copy of `dist/` with ONLY the `PORT` const changed (3100 -> 3321;
  `diff -rq` confirmed), booted from the worktree root on **ephemeral port 3321**.
  Production `:3100` never touched (verified free before and after).

### GET /sites/happy-place -> 200, 20145 bytes
- Served HTML sha256: `16ac94cb80aa6d17`
- `"Demo addition"`: 0 | `"DEMO_SYNTHETIC"`: 0 | `"Pergola"`: 0
  (overlay absent from the live demo path — correct)
- `"Website statement"` badges: 8, each with
  `data-classification="WEBSITE_STATEMENT"` (visible + machine-readable)
- Factual values bound and present: "Happy Place", `+15412865190`,
  `https://happyplacecarpentry.com`, all 5 services (Drywall/Fencing/Painting/
  Repairs/Restoration x3 each)

### POST /api/ask {"site":"happy-place","question":"What services do you offer?"} -> 200
- `refusal: false`, `unknowns: []`, 6 evidence citations
- Answer names all 5 real services from the business's own website
- Owner-field leak scan over the full served JSON: `15412865190`: 0,
  `taylor@happyplacecarpentry.com`: 0, `970-245-3869`: 0, `970-555-0142`: 0,
  `123 Main St`: 0
- Answer is honest: "These are website statements from the business, not
  independently verified facts."

Ephemeral server stopped afterwards; port 3321 verified free; ephemeral dist
copy removed; worktree clean.

### Bound triple
- **HEAD**: `0e8705b9fdf495dc8e530df8aa5cab1dad8e85af`
  (`fyd-integration-replay-2026-09-27`, local only)
- **Build digest**: `0571fdd0dc45bc6a`
- **Served asset digest** (happy-place HTML): `16ac94cb80aa6d17`

## 5. Per-lane verdicts

- **FYD-002 acquisition contract: CONFIRMED.** 11/11 tests pass on the integrated
  tree; both real fixture chains resolve hop-by-hop against stored bytes; all 7
  tamper/fail-closed cases produce typed `AcquisitionChainError`; no new
  evidence authority (maps into existing `ResolvedEvidence` shape).
- **FYD-010 field privacy gate: CONFIRMED.** Probe passes both ways on the
  integrated tree (13/13 lane tests, 2/2 probe cases); served /api/ask visitor
  response carries zero owner-field values; gate hides fields, never rewrites
  values (D-SHIP suppression-shape decision still untouched).
- **FYD-012 binding verifier: CONFIRMED.** Verifier units, binding-render
  served-bytes proof, and bypass probe all pass; content-normalized lint PASS
  (5/5 reads allowlisted, 19-entry allowlist). The one failing jest subtest in
  the replay worktree is the checkout-location artifact proven in §3, and the
  suite passes 2/2 at the canonical path. claims.ts untouched; no competing
  authority.
- **site-client title binding: CONFIRMED.** 2/2 pass; Featured row titles route
  through `resolveBoundField` (direct binding, title pseudo-field); unverified
  titles omit, chrome renders; lint `--check` still PASS on content (no new
  `.fields` reads introduced).
- **FYD-038 DEMO_SYNTHETIC labeling: CONFIRMED.** 9/9 new tests pass; served
  happy-place HTML shows 0 DEMO_SYNTHETIC markers (overlay absent — correct)
  and 8 machine-readable WEBSITE_STATEMENT badges; the classification rides the
  ClaimBadge presentation-labeling layer, not a new validator; ask lane
  correctly emits no synthetic citation branch (FYD-009 fail-closed refusal
  stands).

## 6. Findings for the parent (not falsifications)

1. **Lane branches are a linear stack, not siblings** (§1). Each lane built and
   tested on the previous lane's tip. The replay therefore verifies the stack
   tip's combined tree; independent-lane isolation does not hold. No conflicts
   arose because there was nothing independent to conflict.
2. **FYD-012 lint test is checkout-location-coupled**: occurrence IDs embed the
   workspace-relative path, so the suite fails on any checkout not at exactly
   `/home/hatch/workspace/fyd-build`. Recommend a hardening item (make IDs
   repo-relative, not workspace-relative). Lane claims unaffected.
3. **OVERALL: PASS.** All five lane claims hold on the integrated tree at
   source, built, and served layers. No pushes, no destructive git, no paid
   calls, no new authorities. Integration branch and worktree are local-only.
