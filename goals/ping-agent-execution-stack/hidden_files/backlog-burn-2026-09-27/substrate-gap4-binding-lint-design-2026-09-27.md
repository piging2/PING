# Substrate Gap 4 — Reusable presentation-binding lint (design, READ-ONLY, no code)

Date: 2026-09-27 ~12:00 MDT. Worker: recon/design subagent. Read-only: no
code written, no branches, no commits, no Pig writes, no HPP original contact.

## 1. What FYD-012's verifier is (studied from the working implementation)

Source: `~/workspace/fyd-build/scripts/fyd012-binding-coverage.py` (115 lines,
present byte-identically on the verified fyd-025 cumulative stack at commit
841825c) + allowlist `fyd012-binding-coverage.allowlist.json` + the
FYD-012 portability ledger (fyd-012-portability-2026-09-27.md).

### 1a. How it detects direct reads vs authority-mediated reads

The lint does not trace data flow. It pattern-matches the **syntactic accessor**
of the graph authority and requires every occurrence to be individually
justified:

- `READ_RE = \.fields\b` — every `.fields` access (the ObjectGraph factual-data
  accessor) in a scanned renderer file is an "occurrence". A read that goes
  through the authority (`resolveBoundField` / `verifyPresentationBinding` /
  the `boundField` family in `src/fyd/components/renderer.tsx`) never touches
  `.fields` syntactically, so it is invisible to the lint by construction.
  Only raw `.fields` reads surface and each must carry an allowlist entry.
- Occurrence identity = `sha256(repo-relative path + enclosing function +
  whitespace-normalized line)[:16]`. The enclosing-function detection
  (`FUNC_RE`: `function`, arrow, and `const = function` forms) makes the ID
  resilient to same-file drift of unrelated lines; any edit to the read line
  itself changes the ID and fails closed until re-justified.
- Path normalization (FYD-012 portability fix): the identity path is
  `path.resolve().relative_to(REPO_ROOT)`; absolute or relative invocations,
  any cwd, all produce the same ID. Files outside the repo root fall back to
  absolute-path IDs that **can never match** a repo-relative allowlist entry
  (fail-closed by design, never a silent pass).
- Modes: `--inventory` (dump occurrences as JSON; the mechanical re-key tool),
  `--check` (fail rc=1 on any occurrence whose ID is not in the allowlist,
  printing file:line, function, and the normalized text of each uncovered read).
- Allowlist entry shape: `{id: {category, justification}}`. Categories observed:
  `presentation-label` (closed-set provenance label, raw text never rendered),
  `sort-only` (never rendered), `gate-backed` (rendered only when the same
  binding is verified through the authority + a sanitizer gate).

### 1b. The FYD-038 re-keying debt — current state (verified from live reads)

- The old scheme hashed the absolute checkout path, so IDs were
  invocation/checkout-sensitive (jest's `fyd-build/...` vs a direct run's
  `src/...` disagreed). The new scheme normalizes everything to repo-root
  relative, which **eliminates the ambiguity by normalization, not by moving
  it** (portability ledger).
- Re-keying is mechanical and done with the linter's own `--inventory`:
  category + justification preserved verbatim. The 14 stale entries whose
  reads were eliminated by the FYD-012 refactor were dropped only after
  verification that no committed tree contains them (unrecoverable from git)
  — dropping preserves fail-closed because their old-scheme IDs could never
  match a new-scheme occurrence.
- **Verified now:** running the current script's `--inventory` against
  `src/fyd/components/renderer.tsx` on the 841825c checkout reproduces all 5
  live allowlist IDs including `1f5357356a7c0b19` (FYD-038 claimKind, line 186,
  function `claimBadgeLabel`). The branch-unification debt is **closed in this
  checkout** — the ID matches the new scheme. The portability ledger's warning
  about the fyd-038-demo-synthetic-labeling branch's own copy was not
  re-verified (branch not inspected here); treat it as a merge-time checklist
  item, not live debt.

### 1c. The bypass probe

`binding-coverage.test.ts` shells out to the script (no formula duplication)
and includes a bypass probe: inject `__fyd012BypassProbe` /
`o.fields["bypass_probe"]` into a temp copy of a scanned file, expect
`FYD-012 LINT FAIL` naming the probe, rc=1. The probe proves the lint bites on
a planted direct read; the `--check` on the clean tree proves permitted reads
pass.

### 1d. FYD-specific vs general (the harvest line)

| FYD-specific (stays in the surface profile, never in the linter) | General (becomes the substrate core) |
|---|---|
| `READ_RE = \.fields\b` (the ObjectGraph accessor) | Accessor-as-regex + function-detection-as-regex as profile parameters |
| `REPO_ROOT` derived from the script's own location | Scan root supplied per profile (CLI/env); identity path = resolved relative to it |
| Allowlist contents: 5 entries, categories `presentation-label`/`sort-only`/`gate-backed`, justifications citing `boundField`, `safeWebsiteHref`, FYD-038 | Allowlist schema `{id: {category, justification}}`, mechanical re-key via `--inventory`, categories unconstrained (surface's vocabulary) |
| Authority shape: ObjectGraph `fields: Record<string, unknown>` + `verifyPresentationBinding`/`resolveBoundField`/`boundField` family | The notion of "an authority-mediated read family" — declared per profile as documentation, not enforced by the linter (the linter enforces the negative: raw accessor reads must be justified) |
| `fyd012-binding-coverage.allowlist.json` file name/path | Allowlist path per profile |

## 2. Surface survey: who needs the same discipline

Read-only grep survey (`\.fields\b`) across the FYD trees. Classification of
each hit family (file:line ranges observed, not exhaustive per-file detail):

### 2a. MC→FYD Shape A / Shape C — no graph reads today (declare-exempt, see 3e)

- Shape A (`~/workspace/lane-p01/tree/src/app/api/sites/[slug]/mc/_lib/site-dispatch.ts`,
  `sites/[slug]/mission-control/page.tsx`, `dispatch-console.tsx`) and Shape C
  (`hidden_files/.../shapec/sites-slug-activity-page.tsx`): **zero** `.fields`
  reads. They project the MC mission journal, not the FYD object graph. The
  binding lint does not apply to them. A surface profile must still be able
  to declare this exemption explicitly (see `kind: journal-projection` in 3c)
  so a future shape that renders graph facts cannot slip in undeclared.

### 2b. Website-tree (lane-p01/tree, exemplar of /home/nolan/projects/ping) — needs onboarding

This tree HAS the binding verifier (`src/fyd/sitespec/binding-verifier.ts`,
`src/fyd/sitespec/graph.ts` — same docstring lineage as
`fyd-lane/repo/graph.ts`; `src/fyd/sitespec/sites-render-audit.ts`) **and**
raw `.fields` reads outside any lint:

- `src/components/ping/object-preview.tsx:122-126` — renders
  `object.fields[k]` directly (prominent + rest entries). Used by
  `app/node/[id]/node-client.tsx`, `app/feed/feed-client.tsx`,
  `app/embed/object/page.tsx`, `components/ping/ask-ping.tsx`. **The embed
  surface renders observed object facts with no binding verification.**
- `src/components/ping/node-sections.tsx:48,282-286` — `obj.fields[n]`,
  `Object.entries(object.fields).map(...)` rendering.
- `src/lib/ping/ping-object-reader.ts:1180-1181` — `object.fields.website` /
  `object.fields.url` reads.
- `src/lib/ping/ask-composer.ts:173,186,282,407` — `obj.fields["claimKind"]`,
  full `Object.entries(obj.fields)` copy, `obj.fields[n]`, `p.fields`.

### 2c. fyd-build tree — renderer covered, other surfaces not

Covered today (FYD-012 lint scans only this file): `src/fyd/components/renderer.tsx`
(5 occurrences, 5 allowlisted, LINT PASS on 841825c).

Not covered, each a presentation or mutation surface with raw reads:

- **Ask surfaces**: `src/fyd/ask/answer.ts:92-93,140` (`evidence_ref`,
  `source_url` read into composed answer text), `ask/load-fixture.ts`,
  `ask/context-builder.ts` — the ask surface renders facts into answers
  without binding-verifier coverage. Highest onboarding priority after 2b.
- **WHY THIS surface**: `src/fyd/why/why-this.ts:341,371`,
  `why/field-triple.ts` — `evidence_ref`, `claimKind` read into explanation UI.
- **Mutation/write paths**: `src/fyd/owner/apply.ts:107,285`,
  `owner/corrections.ts`, `src/fyd/regen/regenerate.ts:334-335,562`,
  `src/fyd/proceduralize/generator.ts:176`,
  `src/fyd/proceduralize/compile-service-graph.ts:152` — these write or
  compile; they are not presentation surfaces. The design lets a profile
  declare `kind: mutation-path` to keep them inventoried but outside the
  presentation-binding allowlist (see 3c, open question Q2 in section 6).
- **Authority itself**: `src/fyd/sitespec/graph.ts`,
  `src/fyd/sitespec/schemas.ts`, `src/fyd/visibility/policy.ts:176-178`
  (gating enforcement), `src/fyd/evidence/refs.ts:63,218` (validation reads)
  — the lint's own negative cannot sensibly apply to the authority that owns
  the accessor; declare `kind: authority` and exclude from scanning, or scan
  with an always-allowlist. This is a design decision (default: exclude).

### 2d. Explicit exclusions (do not onboard; do not scan)

- **Frozen trees**: the Pig-side served :3200 tree (branch
  `design/sprint-visual-v1`; frozen until the 19:00 adjudication verdict or
  Nolan's word); the :3100 production tree (frozen; restart protocol only).
  Nothing in this design touches or scans served trees.
- **Pig-side entirely**: no reads, no writes (transport was PROXY_FAILED for
  this worker; even when healthy, the lint runs where the checkout lives).
- **Historical artifacts**: `fyd-lane/lane-c/work/*` (working copies incl.
  `renderer.tsx:206,665,709-710` — the pre-FYD-012 refactor reads),
  `lane-c/dev-objects/lab-adapter.ts:79`, `lane-c/view.ts:106`,
  `lane-media-b/src/view.ts:60`, `fyd-lane/absorb/src/*` (staging; no
  `.fields` reads found — the absorbed `binding-verifier.ts` is the authority
  exemplar, not a scan target), `harvest-wave1/code-evidence/*` (ingested
  reference copies), `fyd-lane/repo/*` (the FYD-012 origin exemplar tree:
  `renderer.tsx`, `graph.ts`, `bindings.test.ts` — the reference, not a scan
  target), `~/workspace/lane-p01/tree` **until** it is promoted into a real
  repo (currently an untracked exemplar copy; scanning it now would produce
  IDs anchored to a non-repo root — the fail-closed out-of-root rule would
  make every occurrence unmatched; correct behavior per the scheme, but
  onboarding it before it has a repo root is meaningless).
- **Tests and fixtures**: `__tests__/`, `*.test.ts`, fixtures — inventoried
  only, never allowlisted (profile `excludes`).
- **Generated code**: `fyd-lane/builder/staging/builder/generated-presentation.ts`
  and similar — lint the generator, not the artifact (profile `excludes`).

## 3. The reusable lint design

### 3a. One authority

A single Python module, substrate-owned (proposed home: `fyd-lane/substrate/`,
alongside the in-flight `journal_identity.py` (Gap 3) and the
`provenance_ref.py` authority (Gap 2)), e.g.
`fyd-lane/substrate/binding-lint/binding-lint.py`. One implementation, no
per-surface forks. It parameterizes exactly three things that FYD-012
hardcodes: (1) the accessor regex(es), (2) the scan root, (3) the allowlist
path. Everything else (identity scheme, fail-closed posture, inventory/check
modes, bypass probe) is the substrate core and is not per-surface
configurable.

### 3b. Surface profile (onboarding = config only, no linter changes)

A surface profile is a single JSON file, e.g. `binding-lint.profile.json`,
co-located with the surface's tree (committed in the same repo). Shape:

```json
{
  "profile_version": 1,
  "surface": "fyd-website-ping-components",
  "kind": "presentation",
  "scan_root": ".",
  "include": ["src/components/ping/*.tsx", "src/lib/ping/*.ts"],
  "excludes": ["**/__tests__/**", "**/node_modules/**"],
  "accessor_res": ["\\.fields\\b"],
  "function_re": null,
  "authority": "verifyPresentationBinding / resolveBoundField (src/fyd/sitespec/binding-verifier.ts)",
  "allowlist": "binding-lint.allowlist.json"
}
```

- `scan_root`: repo-root-relative path anchoring identity normalization
  (FYD-012's `REPO_ROOT` generalized). Defaults to the profile file's repo
  root (git top-level); may be pinned explicitly.
- `accessor_res`: one or more regexes for the surface's raw-data accessor(s)
  (e.g. `\.fields\b` for FYD graphs; a synthetic family might use
  `\.data\[` or `getRaw\(`). The FYD run becomes `accessor_res: ["\\.fields\\b"]`
  — **no behavior change for the FYD-012 invocation**.
- `function_re`: optional override of the enclosing-function detector; null
  means the substrate default (FYD-012's `FUNC_RE`).
- `kind`: `presentation` (default) | `journal-projection` | `mutation-path` |
  `authority`. Only `presentation` is subject to the binding allowlist.
  `journal-projection` (Shape A/C) declares "this surface renders no graph
  data" — the linter then runs a **declaration check**: it still scans and
  FAILS if any accessor occurrence exists (Shape C's page must keep failing
  this if someone adds a `.fields` read). `mutation-path` and `authority`
  surfaces are inventoried but exempt from the allowlist requirement.
- Onboarding a new surface = writing this profile + running
  `--inventory` + justifying entries. Zero changes to the linter.

CLI shape (backwards-compatible with FYD-012):

```
binding-lint.py --profile <profile.json> --inventory [files...]
binding-lint.py --profile <profile.json> --check [--allowlist <json>] [files...]
binding-lint.py --profile <profile.json> --probe <file>     # bypass probe
binding-lint.py --profile <profile.json> --rekey --allowlist <json>  # re-key allowlist
```

When files are omitted, `include`/`excludes` from the profile drive the file
set. A `--profile` run that reproduces the FYD-012 invocation
(`--check --allowlist fyd012-binding-coverage.allowlist.json
src/fyd/components/renderer.tsx`) must produce byte-identical output to the
legacy script (falsification F1).

### 3c. Typed violations

Every violation is a typed record, JSON-serializable:

```json
{"id": "d4a86f58f0571df9", "profile": "fyd-renderer",
 "file": "src/fyd/components/renderer.tsx", "line": 355,
 "function": "fieldOf", "text": "const v = o.fields[name];",
 "verdict": "UNCOVERED_READ"}
```

Verdict vocabulary (closed): `UNCOVERED_READ` (no allowlist entry),
`OUT_OF_ROOT` (scanned file outside the declared scan root — fails closed,
cannot match), `STALE_ALLOWLIST_ENTRY` (allowlist ID with no current
occurrence — hygiene signal, not a failure), `DECLARATION_VIOLATION`
(`kind: journal-projection` surface containing an accessor read),
`PROFILE_ERROR` (bad regex, unreadable allowlist, missing scan root —
fail-closed, never a silent pass). Exit codes: 0 = pass, 1 = violations
found, 2 = profile/config error.

### 3d. The allowlist / ID-scheme problem, handled generically

The FYD-038 lesson is promoted to a substrate contract, not left as
FYD-specific lore:

1. **Normalization rule (the contract)**: the identity path is always
   `resolve().relative_to(scan_root)`. The linter canonicalizes every input
   path before hashing; absolute, relative, and foreign-cwd invocations of
   in-root files produce identical IDs. Out-of-root files get absolute-path
   IDs that can never match an allowlist entry (fail-closed).
2. **Scheme versioning**: the allowlist carries `"scheme": "repo-root-relative/1"`.
   The linter refuses (exit 2) a `--check` whose allowlist declares a scheme
   the linter does not know, and names the mismatch. The old
   absolute-path scheme is documented as `absolute-path/0` and is supported
   only for **migration reads** (to compute the old→new mapping), never for
   `--check`.
3. **Mechanical re-key** (`--rekey`): given an old allowlist + a fresh
   `--inventory`, emits new-keyed entries preserving `category` and
   `justification` verbatim, and reports dropped entries (no current
   occurrence) with the old IDs + justifications archived to a
   `.rekey-report.json` for the audit trail (the FYD-012 "14 stale entries"
   practice, made automatic).
4. **Cross-surface collision safety**: IDs are only comparable within one
   profile's allowlist; the violation record carries the profile name, and
   the linter never merges allowlists across profiles. Two surfaces may use
   the same accessor regex with zero ID-space interaction.

### 3e. The bypass probe (per surface, config-driven)

`--probe <file>`:
1. Copies the target to a temp location **outside the scan root** (fail-closed
   absolute-path ID — the probe must name it, not match an allowlist entry).
2. Injects a planted read using the profile's first `accessor_res`
   (e.g. `const __probe = o.fields["__binding_lint_probe__"];`) at a
   deterministic line.
3. Runs `--check` on the probe file: requires FAIL, rc=1, and the output
   naming the planted read's function/line. Any other outcome (pass, rc=0,
   different violation) = probe failure.
4. Control: `--check` on the profile's clean tree must still PASS (permitted
   reads pass). The probe and the control together are the falsification
   pair; a CI job runs both.

This is the FYD-012 bypass probe generalized: the plant adapts to the
profile's accessor regex instead of hardcoding `o.fields["bypass_probe"]`.

## 4. Falsification plan (implementation acceptance)

- **F1 — regression equivalence**: `binding-lint.py --profile
  fyd-012.json --check ... src/fyd/components/renderer.tsx` produces
  byte-identical stdout and the same exit code as the legacy
  `fyd012-binding-coverage.py` on the same inputs (5 occurrences, all
  allowlisted, PASS). Then on the probe file, both fail identically.
- **F2 — different accessor family**: a synthetic fixture tree with a
  `\.data\b` accessor; a config-only profile; plant `x.data["pwn"]` via
  `--probe` → FAIL naming it, rc=1; write a justification for a benign read
  via `--inventory` → clean `--check` PASS. Proves the accessor regex is
  truly parameterized.
- **F3 — second surface, config only**: onboard the website-tree
  `components/ping` family (2b) with a new profile and no linter edits;
  `--inventory` lists the object-preview/node-sections/ask-composer reads;
  the justifications written there are the surface's own categories, not
  FYD's. Proves onboarding is config-only.
- **F4 — scheme-migration safety**: take an `absolute-path/0` allowlist,
  run `--rekey`, verify the old IDs fail `--check` under the new scheme
  (fail-closed, no silent pass) and the re-keyed allowlist passes; verify
  `--check` against a wrong-scheme allowlist exits 2 naming the scheme.
- **F5 — declaration check**: a `kind: journal-projection` profile over a
  file containing one planted `.fields` read → `DECLARATION_VIOLATION`,
  rc=1. (The Shape A/C guarantee, machine-enforced.)

## 5. What this deliberately does not do

- Not a data-flow or taint tracker: it cannot see aliasing (`const f =
  o.fields; f["x"]`), destructuring, or indirection. It is a **syntactic
  occurrence gate with human justification**, and the design does not pretend
  otherwise. Surfaces that alias aggressively should normalize through the
  authority first; that normalization is out of scope.
- Not a write-path guard: `mutation-path`/`authority` kinds are inventoried,
  not allowlisted. If a future contract demands write-path coverage, that is
  a new profile kind with its own falsification, not a relaxation of this one.
- No per-surface linter forks, ever: a surface needing a new capability
  (e.g. a new function-detection grammar) gets a `function_re` override in
  its profile or the request goes back to the substrate authority. This is
  the Constitutional Rule of One applied to the lint.

## 6. Open questions (for the parent / Nolan)

- **Q1 — linter home**: substrate home `fyd-lane/substrate/binding-lint/`
  (with Gap 2's `provenance_ref.py` and Gap 3's `journal_identity.py`) vs
  inside each consumer repo. Recommendation: substrate home, vendored or
  pinned by the consumer repos' CI. Whoever owns the CI wiring decides.
- **Q2 — mutation-path coverage**: do `owner/apply.ts`, `regen/regenerate.ts`,
  `proceduralize/*` stay `kind: mutation-path` (inventoried, exempt) or does
  a future contract put write-path reads under a parallel allowlist? The
  design defaults to exempt; flipping it is a Nolan product-scope call.
- **Q3 — onboarding the website-tree surfaces (2b)**: `object-preview.tsx`
  and `node-sections.tsx` render observed object facts with no binding
  verification today (the embed surface is the sharpest case). Onboarding
  them as surface #2 will surface reads that need either justifications or
  migration to the authority — user-visible surface work. Needs Nolan's word
  before any write-side follow-up; the design's F3 can proceed read-only
  (inventory only) without his word.

## Verdict

**NEEDS-DECISION** — the design is implementable as specified (F1–F5 are all
concrete, the config schema is closed, no linter code changes are needed to
onboard a surface), but Q1–Q3 above are genuine scope/authority calls that
belong to the parent and Nolan, not to the implementer. None of them blocks
starting the F1/F2/F4 core (FYD regression + synthetic family + scheme
migration), which need no decisions. Q3's write-side follow-up needs Nolan's
word; Q3's read-only F3 inventory does not.

---
*Method: read-only throughout. `muse.read`/`muse.exec` (grep, ls, wc) only.
No files modified except this ledger file. No branches, no commits, no Pig
contact, no HPP original contact, no credentials. Transport-sensitive items
are marked UNKNOWN per the 2026-09-27 UNKNOWN rule; nothing was inferred
about the Pig-side trees.*
