# H1 privacy verification — read-only falsifier report

Date: 2026-09-25 ~20:50 MDT. Falsifier: H1 lane. No files modified, no commits, no merges.

## Scope

Verify that the privacy P0 lane's claimed behaviors (branch `fyd/privacy-projection-p0`,
commits `ecd2ef9` / `7e6b81c` / `f5d2de4`) are behaviorally present in the merged
integration branch `fyd/sprint-integration-2026-09-24` at `c93a7ced`
(`/home/nolan/projects/ping`).

## Critical finding: the premise is wrong — the Sep-25 privacy lane was never merged

The commits named in the task (`136bf9a6`, `568b3e5e`, `3dfa164d`) are the **Sep-24
Q-P0-01 lane** (address-shaped conservative coarsening, `applyHideTraversal` zero-disclosure
traversal, FYD-Q1 conflict suppression), merged Sep 24 19:02–19:13 MDT. They are a
different, earlier privacy lane — not the Sep-25 `fyd/privacy-projection-p0` lane.

- The lost branch's commits (`ecd2ef9`, `7e6b81c`, `f5d2de4`) are **not in the object
  store** (`git cat-file -t` fails for all three; refs lost, objects gc'd).
- No commit on Sep 25 touches `field-visibility.ts`, `visitor-answer.ts`, or
  `ask-composer.ts` with phone-prose or citation-ID content.
- The 7 RED tests from `ecd2ef9` have **no equivalents** anywhere in the merged branch.

## Per-behavior verdicts

### 1. Hidden phone removed from public fields AND from prose — DIVERGED (partial)

- **Fields: EQUIVALENT.** `applyFieldVisibility` drops `hide`-decided fields; the
  lane-e battery test asserts a hidden phone is absent from the Ask answer text.
- **Prose: DIVERGED.** Direct probe (tsx, read-only) against the merged
  `applyFieldVisibility`: with a HIDE decision on `phone`, the phone vanished from
  `fields` but the title `"Call us at (970) 555-0100 today"` and description
  `"Reach (970) 555-0100 for service"` passed through **untouched**.
  `applyFieldVisibility` only rebuilds the `fields` record; title/description are
  never scrubbed. No test covers prose scrubbing. The ask-composer `located_at`
  branch reads `o.title` via `coarsenLocationTitle` (address-shaped only); a phone
  number in a title is echoed verbatim.

### 2. Hidden values scrubbed from owner correction surfaces — DIVERGED

The merged `applyFieldVisibility` rebuilds only `fields`. It does not touch
`ownerFieldCorrections`, title, or description. The claimed 7e6b81c scrub
("scrubs withheld values from every public surface incl. title/description prose
and ownerFieldCorrections") has no equivalent in the merged branch. (Practical
note: the ask-composer correction citation renders `correction.sourceValue` into
answer text, but only on paths where the field survived the projection; the
mechanism-level scrub is still absent.)

### 3. Equal-version HIDE/SHOW conflicts fail closed, order-independently — DIVERGED

`resolveFieldVisibility` uses `d.version >= best.version`: on version ties the
**later array element wins**. Direct probe:
- `[hide@1, show@1]` → `show`
- `[show@1, hide@1]` → `hide`

Order-dependent, and the first ordering resolves to SHOW (fail-open). The merged
test file has a "highest version wins" test (versions 1 vs 2) but **no
equal-version test**. (The render-model "order-insensitive set" test covers
decision ordering across *different* object+field pairs, not same-field ties.)

### 4. Public Ask citations drop internal IDs — DIVERGED

`citationFor` (visitor-answer.ts) sets `id: ref.id` with the inline comment:
"AskEvidenceRef.id IS the cited object/relationship id (there is no separate
objectId field on the ref)." `buildAnswerRefs` additionally emits
`objectRefs[].objectId` and `evidenceRefs[].id`. The ask route
(`src/app/api/fyd/ask/ask-pipeline.ts`, response construction) returns
`citations`, `objectRefs`, and `evidenceRefs` **verbatim** to the client — no
stripping. Internal graph object/relationship IDs are served in the public
response. The claimed f5d2de4 fix is not present.

### 5. Source evidence/graph never mutated by publication decisions — EQUIVALENT

`applyFieldVisibility`, `applyHideTraversal`, and `suppressConflictedFields` all
return fresh records; relationships are shared by reference, fields rebuilt.
Tests assert `projected !== source` and source values intact; direct probe
confirmed the source graph is byte-identical after projection. This matches the
privacy lane's claim.

## Test counts actually observed (merged branch)

| Suite | Observed | Claimed by privacy lane |
|---|---|---|
| sitespec | **117/117 pass** (13 suites) | 116/116 |
| ask | **229/229 pass** (15 suites) | 127 pass + 3 pre-existing failures |
| components | **123 pass, 4 FAIL** (13 suites) | 82/82 |
| tenant | **50/50 pass** (8 suites) | 28/28 |
| tsc --noEmit | **exit 0, fully clean** | clean in touched files |

Notes:
- The ask suite's 3 pre-existing failures are gone (suite has since grown to 229
  tests, all green).
- The 4 component failures are all in `ping-fyd-dogfood.test.ts`:
  `BindingVerificationError` ("owner-asserted" provenance cannot back direct
  evidence on `ping-fyd-business#title`). Last touched by `4d0ddf7b` (object
  layer) and `89c7da78` (claim-gate) — the privacy merge commits touched neither
  `binding-verifier.ts` nor the dogfood test. **Pre-existing relative to the
  privacy lane, unrelated semantic unit** (evidence binding, not privacy
  projection). Not a privacy regression.

## Escalation

Per task instructions, stopping with an escalation rather than patching:

1. **The Sep-25 privacy-projection-p0 content is not in the integration branch.**
   Its branch refs are lost and its objects are gone. Claims 1 (prose), 2, 3,
   and 4 do not hold on the merged code; only claim 5 holds.
2. **Decision required (coordinator/Nolan):** re-implement the four diverged
   behaviors as a new writer lane (with the 7 RED tests re-created first), or
   explicitly downgrade/retire those claims. The current integration branch
   must not be described as carrying the privacy lane's guarantees.
3. Separately: the 4 `ping-fyd-dogfood` component failures are a live failing
   invariant in the binding verifier's owner-asserted path — worth a queue
   entry, but not this lane's to fix.

## Method (all read-only)

- Inspected `src/fyd/sitespec/field-visibility.ts`, `src/fyd/ask/visitor-answer.ts`,
  `src/fyd/ask/field-conflicts.ts`, `src/lib/ping/ask-composer.ts`,
  `src/app/api/fyd/ask/ask-pipeline.ts`, and the test files
  `field-visibility.test.ts`, `ask-privacy-probe.test.ts`,
  `lane-e-battery.test.ts`, `render-model.test.ts` on the Pig via
  `~/workspace/pig/pigwsl-run.sh`.
- Ran the four jest suites on the merged branch; ran `tsc --noEmit` (exit 0).
- Ran a read-only tsx probe of `resolveFieldVisibility` (equal-version ties)
  and `applyFieldVisibility` (phone in title/description, source non-mutation).
- No repo file was created, modified, committed, merged, or rebased. The FYD
  product lane's worktree and ports 3100–3105 were not touched.
